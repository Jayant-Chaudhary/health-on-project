const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

describe('Questionnaire API', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };
  const mockProfile = {
    role: 'patient',
    full_name: 'Patient Test',
  };

  const mockToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();

    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
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
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
      };
    });
  });

  describe('GET /questionnaire/templates', () => {
    it('should list active templates', async () => {
      const mockTemplates = [{ id: 'q-1', question_text: 'How are you feeling?' }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }) };
        if (table === 'questionnaire_templates') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockTemplates, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/questionnaire/templates')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTemplates);
    });
  });

  describe('POST /questionnaire/responses', () => {
    const validPayload = {
      appointmentId: '123e4567-e89b-12d3-a456-426614174000',
      responses: [
        { templateId: '123e4567-e89b-12d3-a456-426614174001', answer: true },
      ],
    };

    it('should submit responses', async () => {
      const mockInsertedResponses = [{ id: 'resp-1' }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }) };
        if (table === 'questionnaire_responses') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: mockInsertedResponses, error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/questionnaire/responses')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockInsertedResponses);
    });

    it('should return 400 for invalid payload', async () => {
      const response = await request(app)
        .post('/questionnaire/responses')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ appointmentId: 'appt-123' }); // Missing responses

      expect(response.status).toBe(400);
    });
  });

  describe('GET /questionnaire/responses/:appointmentId', () => {
    it('should get responses for an appointment', async () => {
      const mockResponses = [{ id: 'resp-1', answer: 'Good' }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }) };
        if (table === 'questionnaire_responses') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockResponses, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/questionnaire/responses/appt-123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponses);
    });
  });
});
