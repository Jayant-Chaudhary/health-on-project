// The module reads OCR_SERVICE_URL at require-time, so it is seeded first.
// A trailing slash checks that the base URL is normalized.
const BASE_URL = 'http://ocr.test:8000';
process.env.OCR_SERVICE_URL = `${BASE_URL}/`;

const axios = require('axios');
const env = require('../../config/env');
const { extractFromFile, processDocument, checkOcrHealth } = require('../../services/ocrService');

jest.mock('axios');

/** The multipart body axios was given, as text, for asserting on its parts. */
const sentBody = (callIndex = 0) => axios.post.mock.calls[callIndex][1].getBuffer().toString();

const makeBuffer = (content = 'data') => Buffer.from(content);

describe('ocrService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // extractFromFile
  // ---------------------------------------------------------------------------

  describe('extractFromFile', () => {
    const validOpts = {
      buffer: makeBuffer(),
      filename: 'report.jpg',
      contentType: 'image/jpeg',
    };

    // --- Input validation ---

    describe('input validation', () => {
      it('throws TypeError when buffer is not a Buffer', async () => {
        await expect(
          extractFromFile({ buffer: 'not-a-buffer', filename: 'f.jpg', contentType: 'image/jpeg' })
        ).rejects.toThrow(TypeError);
        await expect(
          extractFromFile({ buffer: 'not-a-buffer', filename: 'f.jpg', contentType: 'image/jpeg' })
        ).rejects.toThrow('A non-empty file buffer is required');
      });

      it('throws TypeError when buffer is empty', async () => {
        await expect(
          extractFromFile({ buffer: Buffer.alloc(0), filename: 'f.jpg', contentType: 'image/jpeg' })
        ).rejects.toThrow(TypeError);
      });

      it('throws TypeError when buffer is undefined', async () => {
        await expect(
          extractFromFile({ buffer: undefined, filename: 'f.jpg', contentType: 'image/jpeg' })
        ).rejects.toThrow(TypeError);
      });
    });

    // --- Happy path ---

    describe('happy path', () => {
      it('POSTs to /ocr/predict-by-file and returns response.data', async () => {
        const mockData = { data: [{ rec_texts: ['Haemoglobin: 12 g/dL'] }] };
        axios.post.mockResolvedValue({ data: mockData });

        const result = await extractFromFile(validOpts);

        expect(axios.post).toHaveBeenCalledTimes(1);
        const [url, , config] = axios.post.mock.calls[0];
        expect(url).toBe(`${BASE_URL}/ocr/predict-by-file`);
        expect(config.timeout).toBe(env.ocr.timeoutMs);
        expect(result).toEqual(mockData);
      });

      it('names a file with no filename after its MIME type', async () => {
        axios.post.mockResolvedValue({ data: {} });

        await extractFromFile({ buffer: makeBuffer(), filename: undefined, contentType: 'image/jpeg' });

        // The OCR service rejects unknown extensions, so "upload.bin" would fail.
        expect(sentBody()).toContain('filename="upload.jpg"');
      });

      it('treats an empty filename the same way', async () => {
        axios.post.mockResolvedValue({ data: {} });

        await extractFromFile({ buffer: makeBuffer(), filename: '', contentType: 'image/png' });

        expect(sentBody()).toContain('filename="upload.png"');
      });

      it('keeps the original filename when there is one', async () => {
        axios.post.mockResolvedValue({ data: {} });

        await extractFromFile({ ...validOpts, filename: 'IMG_1234.JPG' });

        expect(sentBody()).toContain('filename="IMG_1234.JPG"');
      });
    });

    // --- X-Request-Id forwarding ---

    describe('X-Request-Id forwarding', () => {
      it('includes X-Request-Id header when requestId is provided', async () => {
        axios.post.mockResolvedValue({ data: {} });

        await extractFromFile({ ...validOpts, requestId: 'req-abc-123' });

        const [, , config] = axios.post.mock.calls[0];
        expect(config.headers['X-Request-Id']).toBe('req-abc-123');
      });

      it('does not include X-Request-Id header when requestId is absent', async () => {
        axios.post.mockResolvedValue({ data: {} });

        await extractFromFile(validOpts); // no requestId

        const [, , config] = axios.post.mock.calls[0];
        expect(config.headers['X-Request-Id']).toBeUndefined();
      });
    });

    // --- OCR service HTTP errors (error.response exists) ---

    describe('OCR service HTTP error responses', () => {
      it('throws a 502 error using detail field from response body', async () => {
        const axiosError = new Error('Bad Gateway');
        axiosError.response = { data: { detail: 'Unsupported image format' } };
        axios.post.mockRejectedValue(axiosError);

        const err = await extractFromFile(validOpts).catch((e) => e);
        expect(err.message).toBe('OCR service error: Unsupported image format');
        expect(err.status).toBe(502);
        expect(err.cause).toBe(axiosError);
      });

      it('falls back to message field when detail is absent', async () => {
        const axiosError = new Error('Bad Gateway');
        axiosError.response = { data: { message: 'Internal error' } };
        axios.post.mockRejectedValue(axiosError);

        const err = await extractFromFile(validOpts).catch((e) => e);
        expect(err.message).toBe('OCR service error: Internal error');
        expect(err.status).toBe(502);
      });

      it('falls back to error.message when response body has neither detail nor message', async () => {
        const axiosError = new Error('Something went wrong');
        axiosError.response = { data: {} };
        axios.post.mockRejectedValue(axiosError);

        const err = await extractFromFile(validOpts).catch((e) => e);
        expect(err.message).toBe('OCR service error: Something went wrong');
        expect(err.status).toBe(502);
      });
    });

    // --- Network-level errors (no error.response) ---

    describe('timeouts → 504 "timed out"', () => {
      ['ECONNABORTED', 'ETIMEDOUT'].forEach((code) => {
        it(`maps ${code} to 504, not "unavailable"`, async () => {
          const timeoutError = new Error(`timeout: ${code}`);
          timeoutError.code = code;
          axios.post.mockRejectedValue(timeoutError);

          const err = await extractFromFile(validOpts).catch((e) => e);
          expect(err.status).toBe(504);
          expect(err.message).toMatch(/timed out/i);
          expect(err.cause).toBe(timeoutError);
        });
      });
    });

    describe('network / DNS errors → 503 "unavailable"', () => {
      const unavailableCodes = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];

      unavailableCodes.forEach((code) => {
        it(`maps ${code} to 503 with "unavailable" message`, async () => {
          const netError = new Error(`network error: ${code}`);
          netError.code = code;
          axios.post.mockRejectedValue(netError);

          const err = await extractFromFile(validOpts).catch((e) => e);
          expect(err.status).toBe(503);
          expect(err.message).toMatch(/unavailable/i);
          expect(err.cause).toBe(netError);
        });
      });
    });

    describe('unknown network errors → 502', () => {
      it('maps an error with no recognised code to 502', async () => {
        const unknownError = new Error('Something weird happened');
        unknownError.code = 'EWEIRD';
        axios.post.mockRejectedValue(unknownError);

        const err = await extractFromFile(validOpts).catch((e) => e);
        expect(err.status).toBe(502);
        expect(err.message).toMatch(/Failed to process document/);
        expect(err.cause).toBe(unknownError);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // checkOcrHealth
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // processDocument
  // ---------------------------------------------------------------------------

  describe('processDocument', () => {
    const upload = {
      buffer: makeBuffer('%PDF-1.4'),
      filename: 'report.pdf',
      contentType: 'application/pdf',
      storagePath: 'lab-reports/p1/abc.pdf',
      appointmentId: '11111111-1111-1111-1111-111111111111',
    };

    const serviceResponse = {
      ingest: {
        storagePath: upload.storagePath,
        metrics: [{ key: 'Hemoglobin', value: '11.2', unit: 'g/dL', confidence: 1 }],
        ocrStatus: 'success',
        reportDate: '2025-10-12',
      },
      result: { status: 'success', engine: 'digital', text: 'Hemoglobin 11.2 g/dL' },
    };

    it('POSTs the file and its storage path to /document/process', async () => {
      axios.post.mockResolvedValue({ data: serviceResponse });

      await processDocument(upload);

      const [url, , config] = axios.post.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/document/process`);
      expect(config.timeout).toBe(env.ocr.timeoutMs);
      const body = sentBody();
      expect(body).toContain('filename="report.pdf"');
      expect(body).toMatch(/name="storage_path"\r\n\r\nlab-reports\/p1\/abc\.pdf/);
      expect(body).toMatch(/name="appointment_id"\r\n\r\n11111111-/);
    });

    it('omits appointment_id when there is none', async () => {
      axios.post.mockResolvedValue({ data: serviceResponse });

      await processDocument({ ...upload, appointmentId: null });

      expect(sentBody()).not.toContain('appointment_id');
    });

    it('returns the ingest payload plus the raw envelope', async () => {
      axios.post.mockResolvedValue({ data: serviceResponse });

      await expect(processDocument(upload)).resolves.toEqual({
        storagePath: upload.storagePath,
        reportDate: '2025-10-12',
        ocrStatus: 'success',
        metrics: serviceResponse.ingest.metrics,
        raw: serviceResponse.result,
      });
    });

    it('never throws: an unreachable service becomes a failed result', async () => {
      const netError = new Error('connect ECONNREFUSED');
      netError.code = 'ECONNREFUSED';
      axios.post.mockRejectedValue(netError);

      const result = await processDocument(upload);

      expect(result).toMatchObject({
        storagePath: upload.storagePath,
        ocrStatus: 'failed',
        metrics: [],
        reportDate: null,
      });
      expect(result.error).toMatch(/unavailable/i);
    });

    it('treats a response without an ingest payload as failed', async () => {
      axios.post.mockResolvedValue({ data: { code: 200, data: [] } });

      const result = await processDocument(upload);

      expect(result.ocrStatus).toBe('failed');
      expect(result.error).toMatch(/no ingest payload/);
    });

    it('does not pass through an ocrStatus outside the database enum', async () => {
      axios.post.mockResolvedValue({
        data: { ...serviceResponse, ingest: { ...serviceResponse.ingest, ocrStatus: 'weird' } },
      });

      await expect(processDocument(upload)).resolves.toMatchObject({ ocrStatus: 'failed' });
    });

    it('fails an empty buffer without calling the service', async () => {
      const result = await processDocument({ ...upload, buffer: Buffer.alloc(0) });

      expect(result.ocrStatus).toBe('failed');
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('checkOcrHealth', () => {
    it('returns true when the health endpoint responds with 200', async () => {
      axios.get.mockResolvedValue({ status: 200 });
      await expect(checkOcrHealth()).resolves.toBe(true);
      expect(axios.get.mock.calls[0][0]).toBe(`${BASE_URL}/health`);
    });

    it('returns false when the endpoint responds with a non-200 status', async () => {
      axios.get.mockResolvedValue({ status: 503 });
      await expect(checkOcrHealth()).resolves.toBe(false);
    });

    it('returns false when the request throws (service down)', async () => {
      axios.get.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(checkOcrHealth()).resolves.toBe(false);
    });

    it('logs a warning via console.warn when the request throws', async () => {
      const err = new Error('getaddrinfo ENOTFOUND localhost');
      axios.get.mockRejectedValue(err);

      await checkOcrHealth();

      expect(console.warn).toHaveBeenCalledWith(
        '[OCR] Health check failed:',
        err.message
      );
    });

    it('includes a timeout of 5000 ms in the request config', async () => {
      axios.get.mockResolvedValue({ status: 200 });
      await checkOcrHealth();
      const [, config] = axios.get.mock.calls[0];
      expect(config.timeout).toBe(5000);
    });
  });
});
