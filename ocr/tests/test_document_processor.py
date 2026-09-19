"""Routing tests for document_processor.

The point of these tests is the glue, not the engines: both engines are
replaced with stubs injected into sys.modules, which is why the suite runs on a
box with neither pdfplumber nor paddleocr installed. Engine imports in
document_processor are deliberately lazy, so the stubs only have to be in place
before the first call, not before the module is imported.
"""

from __future__ import annotations

import logging
import sys
import types
import unittest
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import document_processor as dp  # noqa: E402

# Several tests drive engine crashes on purpose; their tracebacks are expected
# output, not test output.
logging.disable(logging.CRITICAL)


# --------------------------------------------------------------------------
# Stubs
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class FakeToken:
    """Mirrors digital_extractor.Token: frozen, same field names."""

    text: str
    x0: float
    top: float
    x1: float
    bottom: float
    page: int
    conf: float = 1.0
    source: str = "pdfplumber"


class FakeDocumentResult:
    def __init__(self, status="ok", tokens=None, tables=None, pages_processed=1,
                 garbled_pages=None, error=None):
        self.status = status
        self.tokens = tokens or []
        self.tables = tables or []
        self.pages_processed = pages_processed
        self.garbled_pages = garbled_pages or []
        self.empty_pages = []
        self.error = error

    def summary(self):
        return {
            "status": self.status,
            "pages_processed": self.pages_processed,
            "garbled_pages": self.garbled_pages,
            "token_count": len(self.tokens),
            "error": self.error,
        }


def line_tokens(text: str, page: int, top: float, x_start: float = 0.0,
                char_width: float = 10.0, gap: float = 20.0) -> list[FakeToken]:
    """Lay a line out left to right with a real gap between fields."""
    tokens: list[FakeToken] = []
    x = x_start
    for word in text.split("  "):
        word = word.strip()
        if not word:
            continue
        width = len(word) * char_width
        tokens.append(FakeToken(word, x, top, x + width, top + 12.0, page))
        x += width + gap
    return tokens


def digital_report_tokens() -> list[FakeToken]:
    tokens: list[FakeToken] = []
    tokens += line_tokens("Name:  Jane Doe", page=0, top=50)
    tokens += line_tokens("Age:  31", page=0, top=70)
    tokens += line_tokens("Collected:  12/10/2025", page=0, top=90)
    tokens += line_tokens("Hemoglobin  11.2  g/dL  12.0-15.0", page=0, top=130)
    tokens += line_tokens("Glucose  95  mg/dL  70-100", page=0, top=150)
    return tokens


def install_stubs(test, *, digital=None, ocr=None, digital_raises=None, ocr_raises=None):
    """Put fake engines in sys.modules for the duration of one test."""
    calls = {"digital": 0, "ocr": 0, "gpu": 0}

    digital_mod = types.ModuleType("digital_extractor")

    def process_digital_pdf(path, config=None):
        calls["digital"] += 1
        if digital_raises is not None:
            raise digital_raises
        return digital if digital is not None else FakeDocumentResult()

    digital_mod.process_digital_pdf = process_digital_pdf
    digital_mod.Token = FakeToken

    ocr_mod = types.ModuleType("ocr_extractor")

    def extract_and_format_pdf_gpu(path, min_confidence=0.6):
        calls["ocr"] += 1
        if ocr_raises is not None:
            raise ocr_raises
        return ocr if ocr is not None else ocr_payload()

    def verify_gpu_status():
        calls["gpu"] += 1

    ocr_mod.extract_and_format_pdf_gpu = extract_and_format_pdf_gpu
    ocr_mod.verify_gpu_status = verify_gpu_status

    saved = {name: sys.modules.get(name) for name in ("digital_extractor", "ocr_extractor")}
    sys.modules["digital_extractor"] = digital_mod
    sys.modules["ocr_extractor"] = ocr_mod

    def restore():
        for name, module in saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    test.addCleanup(restore)
    return calls


def ocr_payload(lines=None, confidence=0.93, pages=None):
    if pages is None:
        pages = [
            {
                "page_number": 1,
                "line_count": len(lines or []),
                "avg_confidence": confidence,
                "lines": lines if lines is not None else [
                    "Name:  Jane Doe",
                    "Collected:  12/10/2025",
                    "Hemoglobin  11.2  g/dL  12.0-15.0",
                ],
                "text": "\n".join(lines or []),
            }
        ]
        for page in pages:
            page["text"] = "\n".join(page["lines"])
    return {
        "file_name": "report.pdf",
        "file_path": "/tmp/report.pdf",
        "total_pages": len(pages),
        "overall_avg_confidence": confidence,
        "processing_time_seconds": 1.2,
        "pages": pages,
    }


class TempFileCase(unittest.TestCase):
    """Base class giving each test a scratch directory."""

    def setUp(self):
        self._tmp = TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name)

    def make_pdf(self, name="report.pdf") -> str:
        path = self.tmp / name
        path.write_bytes(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n" + b"0" * 64)
        return str(path)

    def make_png(self, name="scan.png") -> str:
        path = self.tmp / name
        path.write_bytes(b"\x89PNG\r\n\x1a\n" + b"0" * 64)
        return str(path)

    def make_jpeg(self, name="scan.jpg") -> str:
        path = self.tmp / name
        path.write_bytes(b"\xff\xd8\xff\xe0" + b"0" * 64)
        return str(path)


# --------------------------------------------------------------------------
# File-type detection
# --------------------------------------------------------------------------
class TestDetection(TempFileCase):
    def test_pdf_by_content_and_extension(self):
        self.assertEqual(dp.detect_file_type(self.make_pdf())[0], "pdf")

    def test_png_and_jpeg(self):
        self.assertEqual(dp.detect_file_type(self.make_png())[0], "image")
        self.assertEqual(dp.detect_file_type(self.make_jpeg())[0], "image")

    def test_content_beats_a_lying_extension(self):
        detected, warnings = dp.detect_file_type(self.make_pdf("scan.jpg"))
        self.assertEqual(detected, "pdf")
        self.assertTrue(any("disagrees" in w for w in warnings))

    def test_unknown_extension_with_known_content_is_rescued(self):
        detected, warnings = dp.detect_file_type(self.make_png("upload.bin"))
        self.assertEqual(detected, "image")
        self.assertTrue(warnings)

    def test_unknown_extension_and_unknown_content(self):
        path = self.tmp / "notes.txt"
        path.write_text("plain text, no magic bytes")
        self.assertEqual(dp.detect_file_type(path)[0], "unsupported")


# --------------------------------------------------------------------------
# Routing
# --------------------------------------------------------------------------
class TestRouting(TempFileCase):
    def test_image_goes_straight_to_ocr(self):
        calls = install_stubs(self)
        result = dp.process_document(self.make_png())
        self.assertEqual(result["engine"], "ocr")
        self.assertEqual(result["status"], "success")
        self.assertEqual(calls["digital"], 0)
        self.assertEqual(calls["ocr"], 1)
        self.assertFalse(result["routing"]["fallback"])

    def test_jpeg_goes_straight_to_ocr(self):
        calls = install_stubs(self)
        result = dp.process_document(self.make_jpeg())
        self.assertEqual(result["engine"], "ocr")
        self.assertEqual(calls["digital"], 0)

    def test_gpu_status_is_verified_once_per_process(self):
        calls = install_stubs(self)
        dp._gpu_checked = False
        dp.process_document(self.make_png("a.png"))
        dp.process_document(self.make_png("b.png"))
        self.assertEqual(calls["gpu"], 1)

    def test_digital_pdf_stays_on_the_digital_engine(self):
        calls = install_stubs(
            self, digital=FakeDocumentResult(status="ok", tokens=digital_report_tokens())
        )
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["engine"], "digital")
        self.assertEqual(result["status"], "success")
        self.assertEqual(calls["ocr"], 0)
        self.assertIn("Hemoglobin", result["text"])

    def test_scanned_verdict_falls_back_to_ocr(self):
        calls = install_stubs(self, digital=FakeDocumentResult(status="scanned", tokens=[]))
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["engine"], "ocr")
        self.assertTrue(result["routing"]["fallback"])
        self.assertIn("scanned", result["routing"]["fallback_reason"])
        self.assertEqual(calls["ocr"], 1)
        # The digital engine's own verdict is preserved for debugging.
        self.assertEqual(result["diagnostics"]["digital"]["status"], "scanned")

    def test_garbled_verdict_falls_back_to_ocr(self):
        install_stubs(
            self,
            digital=FakeDocumentResult(
                status="garbled", tokens=digital_report_tokens(), garbled_pages=[0]
            ),
        )
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["engine"], "ocr")
        self.assertTrue(result["routing"]["fallback"])

    def test_error_verdict_falls_back_to_ocr(self):
        install_stubs(
            self, digital=FakeDocumentResult(status="error", tokens=[], error="broken xref")
        )
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["engine"], "ocr")
        self.assertIn("broken xref", result["routing"]["fallback_reason"])

    def test_ok_but_empty_token_stream_falls_back_to_ocr(self):
        # A page of vector art can pass is_digital() and still yield nothing.
        install_stubs(self, digital=FakeDocumentResult(status="ok", tokens=[]))
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["engine"], "ocr")
        self.assertIn("no tokens", result["routing"]["fallback_reason"])

    def test_partial_digital_result_is_kept_not_re_ocred(self):
        calls = install_stubs(
            self,
            digital=FakeDocumentResult(
                status="partial", tokens=digital_report_tokens(), garbled_pages=[1]
            ),
        )
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["engine"], "digital")
        self.assertEqual(result["status"], "partial")
        self.assertEqual(calls["ocr"], 0)
        self.assertTrue(result["warnings"])

    def test_digital_engine_import_failure_falls_back(self):
        install_stubs(self, digital_raises=ImportError("No module named 'pdfplumber'"))
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["engine"], "ocr")
        self.assertIn("pdfplumber", result["routing"]["fallback_reason"])

    def test_mislabelled_pdf_named_jpg_still_routes_to_the_digital_engine(self):
        calls = install_stubs(
            self, digital=FakeDocumentResult(status="ok", tokens=digital_report_tokens())
        )
        result = dp.process_document(self.make_pdf("scan.jpg"))
        self.assertEqual(result["engine"], "digital")
        self.assertEqual(calls["ocr"], 0)
        self.assertTrue(result["warnings"])


# --------------------------------------------------------------------------
# Failure handling - the API must never see an exception
# --------------------------------------------------------------------------
class TestFailures(TempFileCase):
    def test_missing_file(self):
        install_stubs(self)
        result = dp.process_document(str(self.tmp / "nope.pdf"))
        self.assertEqual(result["status"], "failed")
        self.assertIn("not found", result["error"])

    def test_empty_file(self):
        install_stubs(self)
        path = self.tmp / "empty.pdf"
        path.write_bytes(b"")
        result = dp.process_document(str(path))
        self.assertEqual(result["status"], "failed")
        self.assertIn("empty", result["error"])

    def test_directory_instead_of_file(self):
        install_stubs(self)
        result = dp.process_document(str(self.tmp))
        self.assertEqual(result["status"], "failed")

    def test_oversized_file_is_rejected_before_any_engine_loads(self):
        calls = install_stubs(self)
        result = dp.process_document(self.make_pdf(), max_bytes=8)
        self.assertEqual(result["status"], "failed")
        self.assertIn("over the", result["error"])
        self.assertEqual(calls["digital"], 0)
        self.assertEqual(calls["ocr"], 0)

    def test_unsupported_type_short_circuits(self):
        calls = install_stubs(self)
        path = self.tmp / "sheet.csv"
        path.write_text("a,b,c\n1,2,3\n")
        result = dp.process_document(str(path))
        self.assertEqual(result["status"], "failed")
        self.assertIn("unsupported", result["error"])
        self.assertEqual(calls["digital"] + calls["ocr"], 0)

    def test_ocr_crash_on_image_is_reported_not_raised(self):
        install_stubs(self, ocr_raises=RuntimeError("CUDA out of memory"))
        result = dp.process_document(self.make_png())
        self.assertEqual(result["status"], "failed")
        self.assertIn("CUDA out of memory", result["error"])

    def test_ocr_fallback_crash_keeps_degraded_digital_text(self):
        install_stubs(
            self,
            digital=FakeDocumentResult(
                status="garbled", tokens=digital_report_tokens(), garbled_pages=[0]
            ),
            ocr_raises=RuntimeError("paddle not installed"),
        )
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["engine"], "digital")
        self.assertEqual(result["status"], "partial")
        self.assertIn("Hemoglobin", result["text"])
        self.assertTrue(any("OCR fallback failed" in w for w in result["warnings"]))

    def test_ocr_fallback_crash_with_no_digital_text_fails_cleanly(self):
        install_stubs(
            self,
            digital=FakeDocumentResult(status="scanned", tokens=[]),
            ocr_raises=RuntimeError("paddle not installed"),
        )
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["status"], "failed")
        self.assertIn("OCR fallback also failed", result["error"])

    def test_ocr_returning_no_text_is_a_failure(self):
        install_stubs(self, ocr=ocr_payload(lines=[], confidence=0.0))
        result = dp.process_document(self.make_png())
        self.assertEqual(result["status"], "failed")

    def test_low_confidence_ocr_is_partial(self):
        install_stubs(self, ocr=ocr_payload(confidence=0.52))
        result = dp.process_document(self.make_png())
        self.assertEqual(result["status"], "partial")
        self.assertTrue(any("confidence" in w for w in result["warnings"]))


# --------------------------------------------------------------------------
# Unified envelope
# --------------------------------------------------------------------------
class TestEnvelope(TempFileCase):
    EXPECTED_KEYS = {
        "status", "engine", "file", "page_count", "text", "pages", "structured",
        "metrics", "tables", "report_date", "confidence", "routing", "diagnostics",
        "warnings", "error", "processing_time_seconds",
    }

    def test_shape_is_identical_across_engines_and_failures(self):
        install_stubs(self, digital=FakeDocumentResult(tokens=digital_report_tokens()))
        digital = dp.process_document(self.make_pdf())
        image = dp.process_document(self.make_png())
        missing = dp.process_document(str(self.tmp / "gone.pdf"))
        for result in (digital, image, missing):
            self.assertEqual(set(result), self.EXPECTED_KEYS)
            self.assertIn(result["status"], {"success", "partial", "failed"})
            self.assertIn(result["engine"], {"digital", "ocr", "none"})

    def test_envelope_is_json_serializable(self):
        import json

        install_stubs(self, digital=FakeDocumentResult(tokens=digital_report_tokens()))
        json.dumps(dp.process_document(self.make_pdf()), default=str)

    def test_digital_structured_output(self):
        install_stubs(self, digital=FakeDocumentResult(tokens=digital_report_tokens()))
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["structured"]["patient"].get("name"), "Jane Doe")
        names = [m["key"] for m in result["metrics"]]
        self.assertIn("Hemoglobin", names)
        self.assertIn("Glucose", names)
        hgb = next(m for m in result["metrics"] if m["key"] == "Hemoglobin")
        self.assertEqual(hgb["value"], "11.2")
        self.assertEqual(hgb["unit"], "g/dL")
        self.assertEqual(hgb["reference"], "12.0-15.0")

    def test_report_date_is_parsed_to_iso(self):
        install_stubs(self, digital=FakeDocumentResult(tokens=digital_report_tokens()))
        result = dp.process_document(self.make_pdf())
        self.assertEqual(result["report_date"], "2025-10-12")

    def test_ocr_text_is_structured_through_the_same_parser(self):
        install_stubs(self, ocr=ocr_payload())
        result = dp.process_document(self.make_png())
        self.assertEqual(result["structured"]["patient"].get("name"), "Jane Doe")
        self.assertEqual(result["report_date"], "2025-10-12")
        self.assertIn("Hemoglobin", [m["key"] for m in result["metrics"]])

    def test_page_text_is_derived_from_lines_when_text_is_missing(self):
        # `text` duplicates `lines` in the OCR payload; a missing duplicate must
        # not be read as "this page is blank".
        payload = ocr_payload()
        for page in payload["pages"]:
            page["text"] = ""
        install_stubs(self, ocr=payload)
        result = dp.process_document(self.make_png())
        self.assertEqual(result["status"], "success")
        self.assertIn("Hemoglobin", result["text"])

    def test_ocr_metrics_carry_the_confidence_through(self):
        install_stubs(self, ocr=ocr_payload(confidence=0.88))
        result = dp.process_document(self.make_png())
        self.assertEqual(result["confidence"], 0.88)
        self.assertTrue(all(m["confidence"] == 0.88 for m in result["metrics"]))


# --------------------------------------------------------------------------
# Page separation
# --------------------------------------------------------------------------
class TestPageSeparation(TempFileCase):
    def collide(self):
        """Two pages with lines at exactly the same height."""
        return [
            FakeToken("PageOneValue", 0, 100, 120, 112, page=0),
            FakeToken("PageTwoValue", 0, 100, 120, 112, page=1),
        ]

    def test_pages_are_not_merged_by_the_line_grouper(self):
        install_stubs(self, digital=FakeDocumentResult(tokens=self.collide(), pages_processed=2))
        result = dp.process_document(self.make_pdf())
        self.assertEqual(len(result["pages"]), 2)
        self.assertEqual(result["pages"][0]["text"], "PageOneValue")
        self.assertEqual(result["pages"][1]["text"], "PageTwoValue")

    def test_multi_page_ocr_keeps_pages_apart(self):
        payload = ocr_payload(
            pages=[
                {"page_number": 1, "line_count": 1, "avg_confidence": 0.9,
                 "lines": ["Name:  Jane Doe"]},
                {"page_number": 2, "line_count": 1, "avg_confidence": 0.9,
                 "lines": ["Lab No:  A-42"]},
            ]
        )
        install_stubs(self, ocr=payload)
        result = dp.process_document(self.make_png())
        self.assertEqual(result["page_count"], 2)
        self.assertEqual(result["structured"]["patient"].get("name"), "Jane Doe")
        self.assertEqual(result["structured"]["patient"].get("lab_no"), "A-42")


# --------------------------------------------------------------------------
# Backend adapter
# --------------------------------------------------------------------------
class TestIngestPayload(TempFileCase):
    def test_matches_the_express_validator_shape(self):
        install_stubs(self, digital=FakeDocumentResult(tokens=digital_report_tokens()))
        result = dp.process_document(self.make_pdf())
        payload = dp.to_ingest_payload(
            result, "lab-reports/abc.pdf", "3f1c1a5e-0000-4000-8000-000000000000"
        )
        self.assertEqual(payload["storagePath"], "lab-reports/abc.pdf")
        self.assertEqual(payload["appointmentId"], "3f1c1a5e-0000-4000-8000-000000000000")
        self.assertEqual(payload["reportDate"], "2025-10-12")
        self.assertEqual(payload["ocrStatus"], "success")
        for metric in payload["metrics"]:
            self.assertEqual(set(metric) - {"unit", "confidence"}, {"key", "value"})
            self.assertIsInstance(metric["value"], str)
            self.assertTrue(0.0 <= metric["confidence"] <= 1.0)

    def test_optional_fields_are_omitted_not_nulled(self):
        install_stubs(self, ocr=ocr_payload(lines=["Random text with no colon"]))
        result = dp.process_document(self.make_png())
        payload = dp.to_ingest_payload(result, "lab-reports/x.png")
        self.assertNotIn("appointmentId", payload)
        self.assertNotIn("reportDate", payload)

    def test_ocr_status_values_are_the_db_enum(self):
        install_stubs(self, ocr=ocr_payload(confidence=0.4))
        payload = dp.to_ingest_payload(dp.process_document(self.make_png()), "p")
        self.assertIn(payload["ocrStatus"], {"success", "partial", "failed"})


# --------------------------------------------------------------------------
# OCR with real detection geometry
# --------------------------------------------------------------------------
def ocr_box(text, x0, y0, x1, y1, confidence=0.95):
    return {"text": text, "confidence": confidence, "bbox": [x0, y0, x1, y1]}


def ocr_payload_with_geometry():
    """A lab report as PaddleOCR actually returns it: boxes, in image pixels."""
    items = [
        ocr_box("Name: Jane Doe", 100, 40, 420, 68),
        ocr_box("Collected: 12/10/2025", 100, 80, 460, 108),
        ocr_box("COMPLETE BLOOD COUNT REPORT", 100, 140, 700, 168),
        # One table row: four boxes at the same height, far apart on x.
        ocr_box("Hemoglobin", 100, 200, 320, 228),
        ocr_box("11.2", 520, 200, 590, 228),
        ocr_box("g/dL", 700, 200, 790, 228),
        ocr_box("12.0 - 15.0", 900, 200, 1090, 228),
        ocr_box("Glucose, Fasting", 100, 240, 380, 268),
        ocr_box("95", 520, 240, 570, 268),
        ocr_box("mg/dL", 700, 240, 800, 268),
        ocr_box("70 - 100", 900, 240, 1040, 268),
    ]
    return {
        "file_name": "scan.png", "file_path": "/tmp/scan.png", "device": "gpu",
        "total_pages": 1, "overall_avg_confidence": 0.95,
        "processing_time_seconds": 2.0,
        "pages": [{
            "page_number": 1, "line_count": len(items), "avg_confidence": 0.95,
            "lines": [i["text"] for i in items],
            "text": "\n".join(i["text"] for i in items),
            "items": items,
        }],
    }


class TestOcrGeometry(TempFileCase):
    def test_detection_boxes_recover_table_rows(self):
        install_stubs(self, ocr=ocr_payload_with_geometry())
        result = dp.process_document(self.make_png())
        self.assertEqual(result["status"], "success")
        self.assertTrue(result["diagnostics"]["ocr"]["geometry"])

        by_key = {m["key"]: m for m in result["metrics"]}
        self.assertEqual(set(by_key), {"Hemoglobin", "Glucose, Fasting"})
        self.assertEqual(by_key["Hemoglobin"]["value"], "11.2")
        self.assertEqual(by_key["Hemoglobin"]["unit"], "g/dL")
        self.assertEqual(by_key["Hemoglobin"]["reference"], "12.0 - 15.0")

    def test_header_fields_and_section_survive_alongside_the_table(self):
        install_stubs(self, ocr=ocr_payload_with_geometry())
        result = dp.process_document(self.make_png())
        self.assertEqual(result["structured"]["patient"].get("name"), "Jane Doe")
        self.assertEqual(result["report_date"], "2025-10-12")
        titles = [s["title"] for s in result["structured"]["sections"]]
        self.assertIn("COMPLETE BLOOD COUNT REPORT", titles)

    def test_payload_without_geometry_still_works(self):
        # Older payloads carry no `items`; the text layout path covers them.
        install_stubs(self, ocr=ocr_payload())
        result = dp.process_document(self.make_png())
        self.assertEqual(result["status"], "success")
        self.assertFalse(result["diagnostics"]["ocr"]["geometry"])
        self.assertEqual(result["structured"]["patient"].get("name"), "Jane Doe")

    def test_geometry_pages_are_kept_apart(self):
        payload = ocr_payload_with_geometry()
        page_two = dict(payload["pages"][0])
        page_two["page_number"] = 2
        page_two["items"] = [ocr_box("Lab No.: A-42", 100, 40, 420, 68)]
        page_two["lines"] = ["Lab No.: A-42"]
        payload["pages"].append(page_two)
        payload["total_pages"] = 2
        install_stubs(self, ocr=payload)
        result = dp.process_document(self.make_png())
        self.assertEqual(result["structured"]["patient"].get("name"), "Jane Doe")
        self.assertEqual(result["structured"]["patient"].get("lab_no"), "A-42")


if __name__ == "__main__":
    unittest.main(verbosity=2)
