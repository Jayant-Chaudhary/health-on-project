const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');
const ocrService = require('../services/ocrService');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

jest.mock('../services/ocrService', () => ({
  checkOcrHealth: jest.fn(),
  extractFromFile: jest.fn(),
}));

describe('OCR API Integration', () => {
  const mockClinician = { id: 'clinician-123', email: 'dr@example.com' };
  const mockProfile = { role: 'clinician', full_name: 'Dr. Test' };
  const mockToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupAuthMock = () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: mockClinician },
      error: null,
    });
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
    });
  };

  describe('GET /ocr/health', () => {
    it('returns 200 with { healthy: true } when OCR service is up', async () => {
      ocrService.checkOcrHealth.mockResolvedValue(true);

      const response = await request(app).get('/ocr/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ healthy: true });
    });

    it('returns 503 with { healthy: false } when OCR service is down', async () => {
      ocrService.checkOcrHealth.mockResolvedValue(false);

      const response = await request(app).get('/ocr/health');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ healthy: false });
    });
  });

  describe('POST /ocr/recognize', () => {
    it('returns 401 if missing authentication', async () => {
      const response = await request(app)
        .post('/ocr/recognize')
        .attach('file', Buffer.from('fake-image-data'), 'test.jpg');

      expect(response.status).toBe(401);
    });

    it('returns 400 if no file is uploaded', async () => {
      setupAuthMock();

      const response = await request(app)
        .post('/ocr/recognize')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ somethingElse: 'value' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Upload an image/);
    });

    it('returns 415 if unsupported file type is uploaded', async () => {
      setupAuthMock();

      const response = await request(app)
        .post('/ocr/recognize')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('file', Buffer.from('fake-pdf'), { filename: 'test.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(415);
      expect(response.body.error).toMatch(/Supported image types/);
    });

    it('returns 200 and processes a valid image', async () => {
      setupAuthMock();

      const mockOcrResult = {
        data: [
          { rec_texts: ['Hemoglobin', '14.2 g/dL'] },
          { rec_texts: ['Glucose', '90 mg/dL'] }
        ]
      };
      ocrService.extractFromFile.mockResolvedValue(mockOcrResult);

      const response = await request(app)
        .post('/ocr/recognize')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('file', Buffer.from('fake-image-data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        data: mockOcrResult.data,
        text: 'Hemoglobin\n14.2 g/dL\nGlucose\n90 mg/dL'
      });
      expect(ocrService.extractFromFile).toHaveBeenCalledTimes(1);
      expect(ocrService.extractFromFile).toHaveBeenCalledWith(expect.objectContaining({
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      }));
    });

    it('bubbles up OCR service errors (e.g., 502/503)', async () => {
      setupAuthMock();

      const serviceError = new Error('OCR service is unavailable.');
      serviceError.status = 503;
      ocrService.extractFromFile.mockRejectedValue(serviceError);

      const response = await request(app)
        .post('/ocr/recognize')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('file', Buffer.from('fake-image-data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('OCR service is unavailable.');
    });
    
    it('gracefully handles missing data array in OCR result', async () => {
      setupAuthMock();

      ocrService.extractFromFile.mockResolvedValue({}); // Empty payload

      const response = await request(app)
        .post('/ocr/recognize')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('file', Buffer.from('fake-image-data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(response.status).toBe(200);
      expect(response.body.text).toBe('');
    });
  });
});
