const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

describe('Vitals API', () => {
  const mockUser = {
    id: 'patient-123',
    email: 'test@example.com',
  };
  const mockProfile = {
    role: 'patient',
    full_name: 'Patient Test',
  };
  
  const mockClinician = {
    id: 'clinician-123',
    email: 'dr@example.com',
  };
  const mockClinicianProfile = {
    role: 'clinician',
    full_name: 'Dr. Test',
  };

  const mockToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupAuthMock = (user, profile) => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: profile, error: null }),
        };
      }
      return {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };
    });
  };

  describe('POST /vitals', () => {
    const validPayload = {
      metricKey: 'weight',
      value: 70,
      unit: 'kg',
    };

    it('should log a vital sign', async () => {
      setupAuthMock(mockUser, mockProfile);
      const mockInsertedVital = { id: 'vital-1', ...validPayload };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }) };
        if (table === 'vitals_logs') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockInsertedVital, error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/api/vitals')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockInsertedVital);
    });

    it('should return 400 for invalid payload', async () => {
      setupAuthMock(mockUser, mockProfile);

      const response = await request(app)
        .post('/api/vitals')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ metricKey: 'weight' }); // Missing value

      expect(response.status).toBe(400);
    });
  });

  describe('GET /vitals', () => {
    it('should list vitals for the authenticated patient', async () => {
      setupAuthMock(mockUser, mockProfile);
      const mockVitals = [{ id: 'vital-1', metric_key: 'weight', value: 70 }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }) };
        if (table === 'vitals_logs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockVitals, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/api/vitals')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockVitals);
    });

    it('should list vitals for a specific patient if requester is clinician', async () => {
      setupAuthMock(mockClinician, mockClinicianProfile);
      const mockVitals = [{ id: 'vital-1', metric_key: 'weight', value: 70 }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockClinicianProfile, error: null }) };
        if (table === 'vitals_logs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockVitals, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/api/vitals?patientId=patient-123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockVitals);
    });
  });
});
