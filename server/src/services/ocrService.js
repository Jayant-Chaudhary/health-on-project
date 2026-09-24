const axios = require('axios');
const FormData = require('form-data');
const env = require('../config/env');

const OCR_SERVICE_URL = env.ocrServiceUrl.replace(/\/+$/, '');

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

  const form = new FormData();
  form.append('file', buffer, {
    filename: filename || 'upload.bin', // fallback: some clients omit originalname
    contentType,
  });

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
        timeout: 120000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      const detail = error.response.data?.detail || error.response.data?.message;
      const message = detail || error.message;
      const serviceError = new Error(`OCR service error: ${message}`);
      serviceError.status = 502;
      serviceError.cause = error;
      throw serviceError;
    }

    // Network / DNS / timeout codes that indicate the service is unreachable.
    const unavailable =
      error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||   // hostname does not resolve
      error.code === 'EAI_AGAIN';     // transient DNS failure

    const serviceError = new Error(
      unavailable
        ? 'OCR service is unavailable. Please try again later.'
        : `Failed to process document: ${error.message}`
    );
    serviceError.status = unavailable ? 503 : 502;
    serviceError.cause = error;
    throw serviceError;
  }
}

/**
 * Ping the OCR service to check whether it is reachable.
 * Returns true if the service responds with HTTP 200, false otherwise.
 */
async function checkOcrHealth() {
  try {
    // The OCR backend (PaddleOCR/FastAPI) exposes no dedicated /health route.
    // /openapi.json is served by FastAPI on every boot and is a reliable liveness
    // signal. If the backend ever adds a /health endpoint, switch to that instead.
    const response = await axios.get(`${OCR_SERVICE_URL}/openapi.json`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    // Log so ops can distinguish "service is down" from "OCR_SERVICE_URL is misconfigured".
    console.warn('[OCR] Health check failed:', error?.message ?? 'unknown error');
    return false;
  }
}

module.exports = { extractFromFile, checkOcrHealth };
