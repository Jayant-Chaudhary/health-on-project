const axios = require('axios');
const FormData = require('form-data');
const env = require('../config/env');

const OCR_SERVICE_URL = env.ocrServiceUrl.replace(/\/+$/, '');

// Some clients omit the original filename; the OCR service sniffs the real
// type from the bytes, but a sensible extension keeps its suffix checks happy.
const EXTENSION_BY_MIME = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

function fallbackFilename(contentType) {
  return `upload.${EXTENSION_BY_MIME[contentType] || 'bin'}`;
}

function buildForm({ buffer, filename, contentType }, fields = {}) {
  const form = new FormData();
  form.append('file', buffer, {
    filename: filename || fallbackFilename(contentType),
    contentType,
  });
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.append(name, String(value));
  }
  return form;
}

/** Map an axios failure to an Error carrying the HTTP status to return. */
function toServiceError(error) {
  if (error.response) {
    const detail = error.response.data?.detail || error.response.data?.message;
    const message = detail || error.message;
    const serviceError = new Error(`OCR service error: ${message}`);
    serviceError.status = 502;
    serviceError.cause = error;
    return serviceError;
  }

  // The service answered nothing within the timeout: it is up but slow
  // (a long scan, or models still loading), which is not the same as down.
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    const serviceError = new Error('OCR service timed out. Please try again later.');
    serviceError.status = 504;
    serviceError.cause = error;
    return serviceError;
  }

  // Network / DNS codes that indicate the service is unreachable.
  const unavailable =
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||   // hostname does not resolve
    error.code === 'EAI_AGAIN';     // transient DNS failure

  const serviceError = new Error(
    unavailable
      ? 'OCR service is unavailable. Please try again later.'
      : `Failed to process document: ${error.message}`
  );
  serviceError.status = unavailable ? 503 : 502;
  serviceError.cause = error;
  return serviceError;
}

/**
 * Send a file buffer to the OCR service and return the raw response payload.
 *
 * @param {object} opts
 * @param {Buffer}  opts.buffer      - File contents as a Buffer.
 * @param {string}  opts.filename    - Original filename (used by the OCR backend for codec hints).
 * @param {string}  opts.contentType - MIME type of the file.
 * @param {string}  [opts.requestId] - Optional correlation ID forwarded from the Express request.
 */
async function extractFromFile({ buffer, filename, contentType, requestId }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TypeError('A non-empty file buffer is required');
  }

  const form = buildForm({ buffer, filename, contentType });

  const extraHeaders = {};
  if (requestId) {
    extraHeaders['X-Request-Id'] = requestId;
  }

  try {
    const response = await axios.post(
      `${OCR_SERVICE_URL}/ocr/predict-by-file`,
      form,
      {
        headers: { ...form.getHeaders(), ...extraHeaders },
        timeout: env.ocr.timeoutMs,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return response.data;
  } catch (error) {
    throw toServiceError(error);
  }
}

/**
 * Run a lab report (PDF or photo) through the extraction pipeline.
 *
 * The OCR service tries the PDF's own text first (pdfplumber) and falls back
 * to PaddleOCR for scans and photos, then returns metrics shaped for
 * `POST /lab-reports`.
 *
 * This never throws. An unreachable service, a timeout or a bad response all
 * come back as a `failed` result with no metrics, because an upload the
 * patient already made must still be recorded — the clinician then sees it
 * as a review item rather than the upload silently vanishing.
 *
 * @returns {Promise<{storagePath, reportDate, ocrStatus, metrics, raw, error?}>}
 */
async function processDocument({ buffer, filename, contentType, storagePath, appointmentId }) {
  try {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new TypeError('A non-empty file buffer is required');
    }

    const form = buildForm(
      { buffer, filename, contentType },
      { storage_path: storagePath, appointment_id: appointmentId }
    );

    let response;
    try {
      response = await axios.post(`${OCR_SERVICE_URL}/document/process`, form, {
        headers: form.getHeaders(),
        timeout: env.ocr.timeoutMs,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
    } catch (error) {
      throw toServiceError(error);
    }

    const ingest = response.data?.ingest;
    if (!ingest || typeof ingest !== 'object') {
      throw new Error('OCR service returned no ingest payload');
    }

    return {
      storagePath,
      reportDate: ingest.reportDate ?? null,
      ocrStatus: ['success', 'partial', 'failed'].includes(ingest.ocrStatus) ? ingest.ocrStatus : 'failed',
      metrics: Array.isArray(ingest.metrics) ? ingest.metrics : [],
      // The full envelope (text, routing, warnings) for raw_ocr_payload.
      raw: response.data.result ?? null,
    };
  } catch (err) {
    console.warn('[ocr] extraction failed, recording the upload anyway:', err.message);
    return { storagePath, reportDate: null, ocrStatus: 'failed', metrics: [], raw: null, error: err.message };
  }
}

/**
 * Ping the OCR service to check whether it is reachable.
 * Returns true if the service responds with HTTP 200, false otherwise.
 */
async function checkOcrHealth() {
  try {
    const response = await axios.get(`${OCR_SERVICE_URL}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    // Log so ops can distinguish "service is down" from "OCR_SERVICE_URL is misconfigured".
    console.warn('[OCR] Health check failed:', error?.message ?? 'unknown error');
    return false;
  }
}

module.exports = { extractFromFile, processDocument, checkOcrHealth };
