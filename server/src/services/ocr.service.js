const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Runs the Python extraction pipeline over an uploaded file.
 *
 * The pipeline is a separate process on purpose: it pulls in OpenCV and a
 * Paddle runtime, which have no business inside the API process. It writes
 * the ingest payload to stdout and exits non-zero only when extraction
 * failed outright.
 *
 * This never throws. A missing interpreter, a crash, or a timeout all come
 * back as a `failed` payload with no metrics, because an upload the patient
 * already made must still be recorded — the clinician then sees it as a
 * review item rather than the upload silently vanishing.
 */
async function extractFromFile({ buffer, originalName, storagePath }) {
  const extension = path.extname(originalName || '').toLowerCase() || '.pdf';
  const tempPath = path.join(os.tmpdir(), `lab-report-${crypto.randomUUID()}${extension}`);

  try {
    await fs.writeFile(tempPath, buffer);

    const stdout = await new Promise((resolve, reject) => {
      execFile(
        env.ocr.pythonBin,
        [env.ocr.scriptPath, tempPath, '--storage-path', storagePath],
        { timeout: env.ocr.timeoutMs, maxBuffer: 16 * 1024 * 1024, cwd: path.dirname(env.ocr.scriptPath) },
        (error, out, stderr) => {
          // A non-zero exit still carries a usable payload on stdout when the
          // pipeline reports `failed`; only treat it as fatal if stdout is empty.
          if (error && !out) {
            return reject(new Error(stderr?.trim() || error.message));
          }
          resolve(out);
        }
      );
    });

    const payload = JSON.parse(stdout);
    return {
      storagePath,
      reportDate: payload.reportDate ?? null,
      ocrStatus: payload.ocrStatus ?? 'success',
      metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
    };
  } catch (err) {
    console.warn('[ocr] extraction failed, recording the upload anyway:', err.message);
    return { storagePath, reportDate: null, ocrStatus: 'failed', metrics: [], error: err.message };
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}

module.exports = { extractFromFile };
