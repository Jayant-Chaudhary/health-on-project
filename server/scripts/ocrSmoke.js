/**
 * Manual smoke test: run one file through the OCR service and print the result.
 *
 *   node scripts/ocrSmoke.js path/to/report.pdf
 *
 * Uses OCR_SERVICE_URL from server/.env (default http://localhost:8000).
 */
const fs = require('fs');
const path = require('path');
const { processDocument, checkOcrHealth } = require('../src/services/ocrService');

const CONTENT_TYPES = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/ocrSmoke.js <file.pdf|png|jpg>');
    process.exit(2);
  }

  if (!(await checkOcrHealth())) {
    console.error('OCR service is not reachable; start PaddleOCRFastAPI first.');
    process.exit(1);
  }

  const result = await processDocument({
    buffer: fs.readFileSync(file),
    filename: path.basename(file),
    contentType: CONTENT_TYPES[path.extname(file).toLowerCase()],
    storagePath: `smoke/${path.basename(file)}`,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ocrStatus === 'failed' ? 1 : 0);
}

main();
