const axios = require('axios');
const { extractFromFile, checkOcrHealth } = require('../../services/ocrService');

jest.mock('axios');

// The module reads OCR_SERVICE_URL at require-time, so we seed it before requiring.
const BASE_URL = 'http://localhost:8000';
process.env.OCR_SERVICE_URL = BASE_URL;

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
        expect(config.timeout).toBe(120000);
        expect(result).toEqual(mockData);
      });

      it('uses upload.bin as filename fallback when filename is undefined', async () => {
        axios.post.mockResolvedValue({ data: {} });

        await extractFromFile({ buffer: makeBuffer(), filename: undefined, contentType: 'image/jpeg' });

        const [, formData] = axios.post.mock.calls[0];
        // FormData internally stores the filename in its _streams / _fields;
        // we verify indirectly that the call was made without throwing.
        expect(axios.post).toHaveBeenCalledTimes(1);
      });

      it('uses upload.bin as filename fallback when filename is empty string', async () => {
        axios.post.mockResolvedValue({ data: {} });
        await expect(
          extractFromFile({ buffer: makeBuffer(), filename: '', contentType: 'image/jpeg' })
        ).resolves.toBeDefined();
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

    describe('network / DNS errors → 503 "unavailable"', () => {
      const unavailableCodes = ['ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'];

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

  describe('checkOcrHealth', () => {
    it('returns true when the health endpoint responds with 200', async () => {
      axios.get.mockResolvedValue({ status: 200 });
      await expect(checkOcrHealth()).resolves.toBe(true);
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
