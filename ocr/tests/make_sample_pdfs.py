"""Generate sample lab reports for manual end-to-end testing.

    python tests/make_sample_pdfs.py /tmp/samples

Produces one of each case the router has to tell apart:

    digital.pdf   native text in a ruled table  -> digital engine
    scanned.pdf   a page with no text at all    -> OCR fallback
    twopage.pdf   two pages, same y positions   -> pages must stay separate

Needs reportlab (`pip install reportlab`), which is a test-only dependency and
is deliberately not in requirements.txt.
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
except ImportError:
    sys.exit("reportlab is required: pip install reportlab")


def digital_report(path: Path) -> None:
    """A normal lab report: header fields, a ruled results table, a note."""
    styles = getSampleStyleSheet()
    rows = [
        ["Test Name", "Result", "Units", "Bio. Ref. Interval"],
        ["Hemoglobin", "11.2", "g/dL", "12.0 - 15.0"],
        ["Glucose, Fasting", "95", "mg/dL", "70 - 100"],
        ["TSH", "3.4", "uIU/mL", "0.4 - 4.0"],
        ["Creatinine", "0.8", "mg/dL", "0.6 - 1.1"],
    ]
    table = Table(rows, colWidths=[60 * mm, 25 * mm, 25 * mm, 40 * mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ]))
    SimpleDocTemplate(str(path), pagesize=A4).build([
        Paragraph("Name: Jane Doe", styles["Normal"]),
        Paragraph("Age: 31 Years", styles["Normal"]),
        Paragraph("Gender: Female", styles["Normal"]),
        Paragraph("Lab No.: A-4472", styles["Normal"]),
        Paragraph("Collected: 12/10/2025", styles["Normal"]),
        Paragraph("Referred By: Dr. S. Rao", styles["Normal"]),
        Spacer(1, 8 * mm),
        Paragraph("COMPLETE BLOOD COUNT REPORT", styles["Heading2"]),
        table,
        Spacer(1, 6 * mm),
        Paragraph("Notes", styles["Heading3"]),
        Paragraph("Sample haemolysed slightly; repeat if clinically indicated.",
                  styles["Normal"]),
    ])


def scanned_report(path: Path) -> None:
    """Shapes only, no text objects - what a scan looks like to pdfplumber."""
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setFillColorRGB(0.85, 0.85, 0.85)
    c.rect(40, 500, 500, 250, fill=1, stroke=0)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    for i in range(12):
        c.rect(60, 720 - i * 18, 380 - (i % 4) * 40, 6, fill=1, stroke=0)
    c.showPage()
    c.save()


def two_page_report(path: Path) -> None:
    """Both pages put text at identical heights, which used to merge them."""
    c = canvas.Canvas(str(path), pagesize=A4)
    for lines in (["Name: Jane Doe", "Page One Marker"],
                  ["Lab No.: A-4472", "Page Two Marker"]):
        c.setFont("Helvetica", 11)
        c.drawString(60, 700, lines[0])
        c.drawString(60, 680, lines[1])
        c.showPage()
    c.save()


def main(argv: list[str]) -> int:
    out = Path(argv[1] if len(argv) > 1 else "samples")
    out.mkdir(parents=True, exist_ok=True)
    digital_report(out / "digital.pdf")
    scanned_report(out / "scanned.pdf")
    two_page_report(out / "twopage.pdf")
    for name in ("digital.pdf", "scanned.pdf", "twopage.pdf"):
        print(out / name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
