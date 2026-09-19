"""
Digital-PDF text extraction with scored extractor selection.

Design notes
------------
1. Extraction is a *ranking* problem, not a cascade. Several extractors are run
   as candidates, each scored by one shared quality function, and the best is
   chosen. Adding a backend means appending to a list, not editing control flow.
2. "No text on this page" and "this extractor failed" are different facts and
   are represented differently (`GarbleReport.empty` vs a low quality score).
   Conflating them is what makes a fallback chain silently skip its fallbacks.
3. Thresholds are data, not literals buried in a function, so they can be
   swapped and A/B tested over a corpus without touching the scoring logic.
4. Words and table cells partition the page: glyphs inside a detected table are
   filtered out of the word stream so each piece of text yields exactly one
   token.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import shutil
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Callable, Iterable, Literal, Sequence

import pdfplumber

from structure_parser import structure_document, to_json

# --------------------------------------------------------------------------
# Optional backend: PyMuPDF (new name first, legacy `fitz` second)
# --------------------------------------------------------------------------
try:
    import pymupdf as fitz  # PyMuPDF >= 1.24
    HAS_FITZ = True
except ImportError:  # pragma: no cover
    try:
        import fitz  # legacy import name
        HAS_FITZ = True
    except ImportError:
        fitz = None  # type: ignore[assignment]
        HAS_FITZ = False

logger = logging.getLogger(__name__)

HAS_GHOSTSCRIPT = bool(shutil.which("gswin64c") or shutil.which("gs"))

Status = Literal["ok", "partial", "garbled", "scanned", "error"]


# --------------------------------------------------------------------------
# Configuration (policy)
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class GarbleConfig:
    replacement_max: float = 0.005
    pua_max: float = 0.05
    control_max: float = 0.01
    printable_min: float = 0.95
    alnum_min: float = 0.30
    avg_word_len_max: float = 20.0
    vowel_min: float = 0.20
    vowel_max: float = 0.65

    w_replacement: float = 1.0
    w_pua: float = 0.8
    w_control: float = 0.6
    w_printable: float = 0.6
    w_alnum: float = 0.5
    w_word_len: float = 0.4
    w_vowel: float = 0.2 

    garbled_at: float = 1.0
    vowel_requires_latin_ratio: float = 0.80


@dataclass(frozen=True)
class ExtractConfig:
    garble: GarbleConfig = field(default_factory=GarbleConfig)
    x_tol: float = 3.0
    y_tol: float = 3.0
    tight_x_tol: float = 1.5
    tight_y_tol: float = 2.0
    dedupe_tolerance: float = 1.0
    sample_pages: int = 3
    repair: bool = True
    doc_garbled_ratio: float = 0.5


# --------------------------------------------------------------------------
# Token IR
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Token:
    text: str
    x0: float
    top: float
    x1: float
    bottom: float
    page: int
    conf: float = 1.0
    source: str = "pdfplumber"


# --------------------------------------------------------------------------
# PyMuPDF backend
# --------------------------------------------------------------------------
class FitzBackend:
    def __init__(self, path: str):
        self._doc = None
        if not HAS_FITZ:
            return
        try:
            self._doc = fitz.open(path)
        except Exception as exc:
            logger.error("PyMuPDF could not open %s: %s", path, exc)
            self._doc = None

    @property
    def available(self) -> bool:
        return self._doc is not None

    def words(self, page_index: int) -> list[dict]:
        if self._doc is None:
            return []
        if not (0 <= page_index < self._doc.page_count):
            logger.warning("page_index %d out of range for PyMuPDF", page_index)
            return []
        try:
            page = self._doc[page_index]
            derot = page.derotation_matrix
            try:
                off = page.cropbox_position
                dx, dy = float(off.x), float(off.y)
            except Exception:
                dx = dy = 0.0

            out: list[dict] = []
            for x0, y0, x1, y1, word, *_ in page.get_text("words"):
                rect = fitz.Rect(x0, y0, x1, y1) * derot
                out.append({
                    "text": word,
                    "x0": float(rect.x0) + dx,
                    "top": float(rect.y0) + dy,
                    "x1": float(rect.x1) + dx,
                    "bottom": float(rect.y1) + dy,
                })
            return out
        except Exception as exc:
            logger.error("PyMuPDF extraction failed on page %d: %s", page_index, exc)
            return []

    def close(self) -> None:
        if self._doc is not None:
            try:
                self._doc.close()
            finally:
                self._doc = None

    def __enter__(self) -> "FitzBackend":
        return self

    def __exit__(self, *exc) -> None:
        self.close()


# --------------------------------------------------------------------------
# Open / classify
# --------------------------------------------------------------------------
def open_pdf_safe(pdf_path: str | Path, config: ExtractConfig = ExtractConfig()):
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    use_repair = config.repair and HAS_GHOSTSCRIPT
    try:
        pdf = pdfplumber.open(path, repair=use_repair)
    except Exception as exc:
        if not use_repair:
            raise
        logger.warning("Open with repair=True failed (%s); retrying without", exc)
        pdf = pdfplumber.open(path, repair=False)

    if len(pdf.pages) == 0:
        pdf.close()
        raise ValueError(f"PDF has zero pages: {path}")
    return pdf


def is_digital(pdf, backend: FitzBackend | None, config: ExtractConfig) -> bool:
    pages = pdf.pages[: config.sample_pages]
    if not pages:
        return False

    hits = 0
    for i, page in enumerate(pages):
        if extract_words_pdfplumber(page, config):
            hits += 1
        elif backend is not None and backend.available and backend.words(i):
            hits += 1
        page.flush_cache()
    return hits >= (len(pages) // 2 + 1)


# --------------------------------------------------------------------------
# Extraction primitives
# --------------------------------------------------------------------------
def _supports_expand_ligatures() -> bool:
    try:
        from packaging.version import parse as _parse
        return _parse(pdfplumber.__version__) >= _parse("0.10")
    except Exception:
        try:
            parts = re.findall(r"\d+", pdfplumber.__version__)[:2]
            return tuple(int(p) for p in parts) >= (0, 10)
        except Exception:
            return False

_EXPAND_LIGATURES = _supports_expand_ligatures()

def extract_words_pdfplumber(
    page,
    config: ExtractConfig = ExtractConfig(),
    *,
    tight: bool = False,
) -> list[dict]:
    x_tol = config.tight_x_tol if tight else config.x_tol
    y_tol = config.tight_y_tol if tight else config.y_tol
    try:
        page = page.dedupe_chars(tolerance=config.dedupe_tolerance)
        kwargs = dict(
            x_tolerance=x_tol,
            y_tolerance=y_tol,
            keep_blank_chars=False,
            use_text_flow=False,
            horizontal_ltr=True,
            vertical_ttb=True,
        )
        if _EXPAND_LIGATURES:
            kwargs["expand_ligatures"] = True
        return page.extract_words(**kwargs)
    except TypeError:
        try:
            return page.extract_words(x_tolerance=x_tol, y_tolerance=y_tol)
        except Exception as exc:
            logger.warning("pdfplumber extract_words failed: %s", exc)
            return []
    except Exception as exc:
        logger.warning("pdfplumber extract_words failed: %s", exc)
        return []


# --------------------------------------------------------------------------
# Garbled-output scoring
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class GarbleReport:
    empty: bool
    penalty: float
    garbled: bool
    reasons: tuple[str, ...]
    signals: dict

    @property
    def quality(self) -> float:
        return -1.0 if self.empty else -self.penalty


def score_garbled(
    words: Sequence[dict],
    config: GarbleConfig = GarbleConfig(),
) -> GarbleReport:
    if not words:
        return GarbleReport(True, 0.0, False, (), {"reason": "empty"})

    text = " ".join(w.get("text", "") for w in words)
    n = max(len(text), 1)

    letters = [c.lower() for c in text if c.isalpha()]
    latin = [c for c in letters if "a" <= c <= "z"]
    latin_ratio = len(latin) / len(letters) if letters else 0.0

    word_list = re.findall(r"\S+", text)
    signals = {
        "replacement_ratio": text.count("�") / n,
        "pua_ratio": sum(1 for c in text if 0xE000 <= ord(c) <= 0xF8FF) / n,
        "control_ratio": sum(1 for c in text if ord(c) < 32 and c not in "\n\r\t") / n,
        "printable_ratio": sum(c.isprintable() for c in text) / n,
        "alnum_ratio": sum(c.isalnum() for c in text) / n,
        "avg_word_len": (sum(len(w) for w in word_list) / len(word_list)) if word_list else 0.0,
        "vowel_ratio": (sum(c in "aeiou" for c in latin) / len(latin)) if latin else 0.0,
        "latin_ratio": latin_ratio,
        "char_count": len(text),
        "word_count": len(word_list),
    }

    checks: list[tuple[str, bool, float]] = [
        ("replacement_chars", signals["replacement_ratio"] > config.replacement_max, config.w_replacement),
        ("pua_chars", signals["pua_ratio"] > config.pua_max, config.w_pua),
        ("control_chars", signals["control_ratio"] > config.control_max, config.w_control),
        ("non_printable", signals["printable_ratio"] < config.printable_min, config.w_printable),
        ("low_alnum", signals["alnum_ratio"] < config.alnum_min, config.w_alnum),
        ("long_words", signals["avg_word_len"] > config.avg_word_len_max, config.w_word_len),
    ]

    if latin_ratio >= config.vowel_requires_latin_ratio and latin:
        odd_vowels = not (config.vowel_min <= signals["vowel_ratio"] <= config.vowel_max)
        checks.append(("abnormal_vowels", odd_vowels, config.w_vowel))

    reasons = tuple(name for name, tripped, _ in checks if tripped)
    penalty = sum(weight for _, tripped, weight in checks if tripped)

    return GarbleReport(
        empty=False,
        penalty=penalty,
        garbled=penalty >= config.garbled_at,
        reasons=reasons,
        signals=signals,
    )


# --------------------------------------------------------------------------
# Candidate-based extraction
# --------------------------------------------------------------------------
def extract_page_words(
    page,
    page_index: int,
    backend: FitzBackend | None,
    config: ExtractConfig = ExtractConfig(),
) -> tuple[list[dict], GarbleReport, str]:
    strategies: list[tuple[str, Callable[[], list[dict]]]] = [
        ("pdfplumber", lambda: extract_words_pdfplumber(page, config)),
        ("pdfplumber_tight", lambda: extract_words_pdfplumber(page, config, tight=True)),
    ]
    if backend is not None and backend.available:
        strategies.append(("pymupdf", lambda: backend.words(page_index)))

    candidates: list[tuple[list[dict], GarbleReport, str]] = []
    for name, run in strategies:
        words = run()
        report = score_garbled(words, config.garble)
        if not report.empty and not report.garbled:
            return words, report, name
        candidates.append((words, report, name))

    non_empty = [c for c in candidates if not c[1].empty]
    if non_empty:
        return max(non_empty, key=lambda c: c[1].quality)

    return [], GarbleReport(True, 0.0, False, (), {"reason": "empty"}), "none"


# --------------------------------------------------------------------------
# Tables
# --------------------------------------------------------------------------
def _center_in_any(obj: dict, bboxes: Sequence[tuple]) -> bool:
    cx = (obj["x0"] + obj["x1"]) / 2
    cy = (obj["top"] + obj["bottom"]) / 2
    return any(b[0] <= cx <= b[2] and b[1] <= cy <= b[3] for b in bboxes)


def tokens_from_table_matrix(
    table,
    matrix: Sequence[Sequence[str | None]],
    page_index: int,
    source: str = "pdfplumber_table",
) -> list[Token]:
    tokens: list[Token] = []
    for row_obj, row_text in zip(table.rows, matrix):
        for cell_bbox, text in zip(row_obj.cells, row_text):
            if not cell_bbox or text is None:
                continue
            text = text.strip()
            if not text:
                continue
            x0, top, x1, bottom = cell_bbox
            tokens.append(Token(
                text=text,
                x0=float(x0), top=float(top),
                x1=float(x1), bottom=float(bottom),
                page=page_index,
                conf=1.0,
                source=source,
            ))
    return tokens


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------
KNOWN_TESTS: frozenset[str] = frozenset({
    "glucose", "hemoglobin", "fsh", "lh", "tsh", "prolactin",
    "testosterone", "insulin", "creatinine", "cholesterol",
})


def extraction_quality(tokens: Sequence[Token]) -> dict:
    text = " ".join(t.text for t in tokens)
    numbers = re.findall(r"\d+\.?\d*", text)
    return {
        "token_count": len(tokens),
        "char_count": len(text),
        "number_count": len(numbers),
        "low_conf_ratio": sum(1 for t in tokens if t.conf < 0.5) / max(len(tokens), 1),
        "ok": len(tokens) > 0,
    }


def domain_match(tokens: Sequence[Token], vocabulary: Iterable[str] = KNOWN_TESTS) -> dict:
    text = " ".join(t.text for t in tokens).lower()
    hits = sorted(
        name for name in vocabulary
        if re.search(rf"\b{re.escape(name)}\b", text)
    )
    return {"hits": hits, "hit_count": len(hits), "matched": bool(hits)}


# --------------------------------------------------------------------------
# Results
# --------------------------------------------------------------------------
@dataclass
class PageReport:
    index: int
    extractor: str
    empty: bool
    garbled: bool
    penalty: float
    reasons: tuple[str, ...]
    signals: dict
    table_count: int


@dataclass
class DocumentResult:
    status: Status = "ok"
    tokens: list[Token] = field(default_factory=list)
    tables: list = field(default_factory=list)
    pages_processed: int = 0
    garbled_pages: list[int] = field(default_factory=list)
    empty_pages: list[int] = field(default_factory=list)
    pages: list[PageReport] = field(default_factory=list)
    quality: dict = field(default_factory=dict)
    domain: dict = field(default_factory=dict)
    error: str | None = None

    def summary(self) -> dict:
        return {
            "status": self.status,
            "pages_processed": self.pages_processed,
            "garbled_pages": self.garbled_pages,
            "empty_pages": self.empty_pages,
            "token_count": len(self.tokens),
            "table_count": len(self.tables),
            "quality": self.quality,
            "domain": self.domain,
            "error": self.error,
        }


# --------------------------------------------------------------------------
# Main digital-branch pipeline
# --------------------------------------------------------------------------
def process_digital_pdf(
    pdf_path: str | Path,
    config: ExtractConfig = ExtractConfig(),
) -> DocumentResult:
    pdf_path = str(pdf_path)
    result = DocumentResult()
    pdf = None
    backend = FitzBackend(pdf_path)

    try:
        pdf = open_pdf_safe(pdf_path, config)

        if not is_digital(pdf, backend, config):
            result.status = "scanned"
            result.quality = extraction_quality(result.tokens)
            result.domain = domain_match(result.tokens)
            return result

        for page_index, page in enumerate(pdf.pages):
            try:
                found = page.find_tables()
            except Exception as exc:
                logger.warning("find_tables failed on page %d: %s", page_index, exc)
                found = []

            table_bboxes: list[tuple] = []
            for tbl in found:
                try:
                    matrix = tbl.extract()
                except Exception as exc:
                    logger.warning("table.extract failed on page %d: %s", page_index, exc)
                    continue
                result.tables.append(matrix)
                result.tokens.extend(
                    tokens_from_table_matrix(tbl, matrix, page_index)
                )
                table_bboxes.append(tbl.bbox)

            word_page = page
            if table_bboxes:
                try:
                    word_page = page.filter(
                        lambda obj: not _center_in_any(obj, table_bboxes)
                    )
                except Exception as exc:
                    logger.warning("page.filter failed on page %d: %s", page_index, exc)
                    word_page = page

            words, report, extractor = extract_page_words(
                word_page, page_index, backend, config
            )

            if report.empty:
                result.empty_pages.append(page_index)
            elif report.garbled:
                result.garbled_pages.append(page_index)

            result.tokens.extend(
                Token(
                    text=w["text"],
                    x0=w["x0"], top=w["top"],
                    x1=w["x1"], bottom=w["bottom"],
                    page=page_index,
                    conf=1.0,
                    source=extractor,
                )
                for w in words
            )
            result.pages.append(PageReport(
                index=page_index,
                extractor=extractor,
                empty=report.empty,
                garbled=report.garbled,
                penalty=report.penalty,
                reasons=report.reasons,
                signals=report.signals,
                table_count=len(table_bboxes),
            ))
            result.pages_processed += 1
            page.flush_cache()

        content_pages = result.pages_processed - len(result.empty_pages)
        if content_pages > 0 and len(result.garbled_pages) >= content_pages * config.doc_garbled_ratio:
            result.status = "garbled"
        elif result.garbled_pages:
            result.status = "partial"

        result.quality = extraction_quality(result.tokens)
        result.domain = domain_match(result.tokens)
        return result

    except Exception as exc:
        logger.exception("process_digital_pdf failed")
        result.status = "error"
        result.error = str(exc)
        result.quality = extraction_quality(result.tokens)
        result.domain = domain_match(result.tokens)
        return result
    finally:
        backend.close()
        if pdf is not None:
            pdf.close()
