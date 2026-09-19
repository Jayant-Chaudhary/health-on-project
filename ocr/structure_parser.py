"""
Reconstruct structured key-value records from a token stream.

Input:  list[Token] from pdf.py (word-level tokens with coordinates).
Output: nested dict suitable for JSON serialization.

Coordinates carry the structure; this module reads that structure.
Line grouping and field splitting are pure geometry. Classification and
parsing are declarative patterns, easy to extend per template.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from dataclasses import dataclass
from typing import Sequence


# ------------------------------------------------------------------
# Primitives
# ------------------------------------------------------------------
@dataclass
class Line:
    y: float
    tokens: list  # list[Token], sorted by x0

    @property
    def text(self) -> str:
        return " ".join(t.text for t in self.tokens).strip()

    @property
    def page(self) -> int:
        return self.tokens[0].page if self.tokens else -1


@dataclass
class Field:
    tokens: list

    @property
    def text(self) -> str:
        return " ".join(t.text for t in self.tokens).strip()

    @property
    def x0(self) -> float:
        return self.tokens[0].x0 if self.tokens else 0.0

    @property
    def x1(self) -> float:
        return self.tokens[-1].x1 if self.tokens else 0.0


# ------------------------------------------------------------------
# Geometry
# ------------------------------------------------------------------
def group_lines(tokens: Sequence, y_tol: float = 3.0) -> list[Line]:
    if not tokens:
        return []

    valid = [
        t for t in tokens
        if t.x1 > t.x0 and t.bottom > t.top and t.text.strip()
    ]
    if not valid:
        return []

    valid.sort(key=lambda t: ((t.top + t.bottom) / 2, t.x0))

    lines: list[Line] = []
    current = [valid[0]]
    current_y = (valid[0].top + valid[0].bottom) / 2

    for t in valid[1:]:
        y = (t.top + t.bottom) / 2
        if abs(y - current_y) <= y_tol:
            current.append(t)
        else:
            current.sort(key=lambda x: x.x0)
            lines.append(Line(y=current_y, tokens=current))
            current = [t]
            current_y = y
    if current:
        current.sort(key=lambda x: x.x0)
        lines.append(Line(y=current_y, tokens=current))

    return lines


def is_table_cell(token) -> bool:
    """True for a token that already represents one whole table cell.

    A ruled table has no whitespace between its columns - the cell bboxes butt
    up against the grid lines - so a pure gap test merges an entire row into
    one field. The extractor already knows where the cell boundaries were, and
    records it in the token source; that beats re-deriving them from geometry.
    """
    return str(getattr(token, "source", "")).endswith("_table")


def split_fields(line: Line, x_gap: float = 15.0) -> list[Field]:
    if not line.tokens:
        return []
    groups: list[list] = [[line.tokens[0]]]
    for t in line.tokens[1:]:
        previous = groups[-1][-1]
        same_field = (
            not is_table_cell(t)
            and not is_table_cell(previous)
            and t.x0 - previous.x1 <= x_gap
        )
        if same_field:
            groups[-1].append(t)
        else:
            groups.append([t])
    return [Field(tokens=g) for g in groups]


# ------------------------------------------------------------------
# Pattern primitives
# ------------------------------------------------------------------
_NUMBER_RE = re.compile(
    r"^[<>≤≥]?\s*[-+]?\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?$"
)
_UNIT_RE = re.compile(r"^[A-Za-z%/µμ^0-9.·×*\[\]]+$")
_REF_RANGE_RE = re.compile(r"\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?")
_REF_COMPARE_RE = re.compile(r"[<>≤≥]\s*\d+(?:\.\d+)?")

_COLUMN_HEADER_WORDS = {
    "test", "name", "results", "result", "units", "unit",
    "bio.", "ref.", "interval", "reference", "range", "value",
    "normal", "observed", "method",
}


def looks_like_number(s: str) -> bool:
    return bool(_NUMBER_RE.match(s.strip()))


def looks_like_unit(s: str) -> bool:
    s = s.strip()
    return bool(s) and len(s) <= 20 and bool(_UNIT_RE.match(s)) and not looks_like_number(s)


def looks_like_reference(s: str) -> bool:
    return bool(_REF_RANGE_RE.search(s) or _REF_COMPARE_RE.search(s))


def is_column_header(line: Line) -> bool:
    words = line.text.lower().split()
    if not words:
        return False
    hits = sum(1 for w in words if w.rstrip(".,:") in _COLUMN_HEADER_WORDS)
    return hits >= 3 and hits / len(words) >= 0.5


def is_noise(line: Line) -> bool:
    text = line.text.strip()
    if len(text) <= 1:
        return True
    if re.fullmatch(r"\d+", text):
        return True
    if re.fullmatch(r"[\W_]+", text):
        return True
    return False


def is_test_row(fields: list[Field]) -> bool:
    if len(fields) < 2 or len(fields) > 6:
        return False
    if looks_like_number(fields[0].text):
        return False
    if not looks_like_number(fields[1].text):
        return False
    return True


def is_section_title(fields: list[Field]) -> bool:
    if len(fields) != 1:
        return False
    text = fields[0].text
    if not text or looks_like_number(text):
        return False
    # "Collected: 12/10/2025" is a header field that happens to be long, not a
    # section heading. Without this, every key-value line over the length
    # threshold is swallowed before parse_kv ever sees it.
    if parse_kv(fields) is not None:
        return False
    return len(text) > 15


# ------------------------------------------------------------------
# Parsers
# ------------------------------------------------------------------
def parse_kv(fields: list[Field]) -> tuple[str, str] | None:
    if not fields:
        return None

    for i, f in enumerate(fields):
        if ":" not in f.text:
            continue
        before, _, after = f.text.partition(":")
        label_parts = [ff.text for ff in fields[:i]] + [before]
        value_parts = [after] + [ff.text for ff in fields[i + 1:]]
        label = " ".join(p for p in label_parts if p).strip()
        value = " ".join(p for p in value_parts if p).strip()
        if label and not label.endswith(":"):
            return label, value
    return None


def parse_test_row(fields: list[Field]) -> dict | None:
    if not is_test_row(fields):
        return None

    name = fields[0].text
    value = fields[1].text
    unit = None
    reference = None

    for f in fields[2:]:
        text = f.text.strip()
        if not text:
            continue
        if reference is None and looks_like_reference(text):
            reference = text
        elif unit is None and looks_like_unit(text):
            unit = text
        elif reference is None:
            reference = text

    return {"name": name, "value": value, "unit": unit, "reference": reference}


# ------------------------------------------------------------------
# Header key normalization
# ------------------------------------------------------------------
_HEADER_KEY_MAP = {
    "name": "name",
    "patient name": "name",
    "lab no": "lab_no",
    "lab no.": "lab_no",
    "lab number": "lab_no",
    "ref by": "referred_by",
    "referred by": "referred_by",
    "collected": "collected_at",
    "collected at": "collection_center",
    "a/c status": "account_status",
    "account status": "account_status",
    "age": "age",
    "gender": "gender",
    "sex": "gender",
    "reported": "reported_at",
    "report status": "report_status",
    "processed at": "processed_at",
    "sample type": "sample_type",
    "specimen": "sample_type",
}

_PATIENT_KEYS = {"name", "age", "gender", "lab_no"}


#: The same map keyed on alphanumerics only. OCR routinely eats the spaces in
#: a header label ("Lab No.:" -> "LabNo.:"), which would otherwise miss every
#: exact lookup and leave the field under a junk key. This mirrors how
#: standardizeLabReport.service.js normalizes raw keys on the Node side.
_SQUASHED_HEADER_KEY_MAP = {
    re.sub(r"[^a-z0-9]", "", label): standard
    for label, standard in _HEADER_KEY_MAP.items()
}


def normalize_key(key: str) -> str:
    k = key.strip().lower().rstrip(":").strip()
    if k in _HEADER_KEY_MAP:
        return _HEADER_KEY_MAP[k]
    squashed = re.sub(r"[^a-z0-9]", "", k)
    if squashed in _SQUASHED_HEADER_KEY_MAP:
        return _SQUASHED_HEADER_KEY_MAP[squashed]
    return re.sub(r"[^a-z0-9]+", "_", k).strip("_")


# ------------------------------------------------------------------
# Top-level
# ------------------------------------------------------------------
def structure_document(
    tokens: Sequence,
    y_tol: float = 3.0,
    x_gap: float = 15.0,
) -> dict:
    lines = group_lines(tokens, y_tol=y_tol)

    by_page: dict[int, list[Line]] = defaultdict(list)
    for line in lines:
        by_page[line.page].append(line)

    patient: dict[str, str] = {}
    meta: dict[str, str] = {}
    sections: list[dict] = []
    notes: list[str] = []
    comments: list[str] = []

    current_section: dict | None = None
    mode = "body"  # "body" | "notes" | "comments"

    for page_idx in sorted(by_page.keys()):
        for line in by_page[page_idx]:
            if is_noise(line):
                continue

            text = line.text
            lower = text.lower()

            if lower.rstrip(":").strip() in {"note", "notes"}:
                mode = "notes"
                continue
            if lower.rstrip(":").strip() in {"comment", "comments"}:
                mode = "comments"
                continue
            if lower.rstrip(":").strip() in {"interpretation", "interpretations"}:
                mode = "body"
                continue
            if lower == "test report":
                mode = "body"
                continue

            if mode == "notes":
                notes.append(text)
                continue
            if mode == "comments":
                comments.append(text)
                continue

            if is_column_header(line):
                continue

            fields = split_fields(line, x_gap=x_gap)
            if not fields:
                continue

            test = parse_test_row(fields)
            if test:
                if current_section is None:
                    current_section = {"title": None, "tests": []}
                    sections.append(current_section)
                current_section["tests"].append(test)
                continue

            if is_section_title(fields):
                current_section = {"title": fields[0].text, "tests": []}
                sections.append(current_section)
                continue

            kv = parse_kv(fields)
            if kv:
                key, value = kv
                norm = normalize_key(key)
                if norm in _PATIENT_KEYS:
                    patient[norm] = value
                else:
                    meta[norm] = value
                continue

    return {
        "patient": patient,
        "report_meta": meta,
        "sections": sections,
        "notes": notes,
        "comments": comments,
    }


def to_json(structured: dict, indent: int = 2) -> str:
    return json.dumps(structured, indent=indent, ensure_ascii=False)
