/**
 * End-to-end tests against a live OCR service (PaddleOCRFastAPI).
 *
 * Not part of `npm test`. Start the service, then:
 *   OCR_SERVICE_URL=http://localhost:8000 npm run test:e2e
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const app = require('../app');
const { processDocument, extractFromFile, checkOcrHealth } = require('../services/ocrService');

/**
 * A one-page digital PDF with text drawn at fixed positions - enough for
 * pdfplumber to read a header and a results table without any PDF library.
 * Each line is [x, y, text]; y counts up from the bottom of an A4 page.
 */
function buildLabReportPdf(lines) {
  const escape = (text) => text.replace(/[\\()]/g, (c) => `\\${c}`);
  const content = lines
    .map(([x, y, text]) => `BT /F1 11 Tf ${x} ${y} Td (${escape(text)}) Tj ET`)
    .join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const offset = Buffer.byteLength(pdf);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xrefAt = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const row = (y, cells) => [[50, y, cells[0]], [200, y, cells[1]], [290, y, cells[2]], [330, y, cells[3]], [420, y, cells[4]]]
  .filter(([, , text]) => text);

const REPORT = buildLabReportPdf([
  [50, 790, 'City Diagnostics Laboratory'],
  [50, 760, 'Name : Jane Doe'],
  [50, 740, 'Age : 31 Years'],
  [50, 720, 'Collected : 12-Oct-2025 10:30'],
  [50, 680, 'Complete Blood Count'],
  ...row(650, ['Hemoglobin', '11.2', 'L', 'g/dL', '12.0 - 15.5']),
  ...row(628, ['Platelet Count', '1,50,000', '', '/cumm', '1,50,000 - 4,10,000']),
  ...row(606, ['HBsAg', 'Non Reactive', '', '', '']),
]);

describe('OCR service (live)', () => {
  beforeAll(async () => {
    const healthy = await checkOcrHealth();
    if (!healthy) {
      throw new Error(`OCR service is not reachable at ${process.env.OCR_SERVICE_URL || 'http://localhost:8000'}`);
    }
  });

  it('reports healthy through the API', async () => {
    const response = await request(app).get('/api/ocr/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ healthy: true });
  });

  it('extracts metrics from a digital PDF without OCR', async () => {
    const result = await processDocument({
      buffer: REPORT,
      filename: 'report.pdf',
      contentType: 'application/pdf',
      storagePath: 'lab-reports/e2e/report.pdf',
    });

    expect(result.error).toBeUndefined();
    expect(result.ocrStatus).toBe('success');
    expect(result.reportDate).toBe('2025-10-12');
    expect(result.raw.engine).toBe('digital');
    expect(result.metrics).toEqual([
      expect.objectContaining({ key: 'Hemoglobin', value: '11.2', unit: 'g/dL' }),
      expect.objectContaining({ key: 'Platelet Count', value: '1,50,000', unit: '/cumm' }),
      expect.objectContaining({ key: 'HBsAg', value: 'Non Reactive' }),
    ]);
    // The abnormal flag is kept apart from the value, in the raw envelope.
    expect(result.raw.metrics[0].flag).toBe('L');
  });

  it('reads text from a photo through /ocr/predict-by-file', async () => {
    const image = fs.readFileSync(path.join(__dirname, 'services', '1.png'));

    const result = await extractFromFile({ buffer: image, filename: 'SCREENSHOT.PNG', contentType: 'image/png' });

    const text = result.data.flatMap((page) => page.rec_texts).join(' ');
    expect(text).toMatch(/installation package/i);
    expect(result.data[0].rec_scores.length).toBe(result.data[0].rec_texts.length);
  });
});
