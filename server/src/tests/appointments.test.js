const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');
const { createAndSendInvite } = require('../services/invite.service');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

jest.mock('../services/invite.service', () => ({
  createAndSendInvite: jest.fn(),
}));

describe('Appointments API', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };
  const mockProfile = {
    role: 'clinician',
    full_name: 'Dr. Test',
  };

  const mockToken = 'valid-token';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for authGuard
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  const setupProfileMock = (role = 'clinician') => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { ...mockProfile, role }, error: null }),
        };
      }
      return {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
      };
    });
  };

  describe('POST /appointments', () => {
    const validPayload = {
      patientEmail: 'patient@example.com',
      patientFullName: 'Patient Test',
      scheduledAt: '2026-10-01T10:00:00Z',
    };

    it('should create an appointment if user is clinician', async () => {
      const mockCreatedAppointment = { id: 'appt-123', status: 'invited' };
      
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'appointments') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockCreatedAppointment, error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/appointments')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockCreatedAppointment);
      expect(createAndSendInvite).toHaveBeenCalledWith({
        appointmentId: 'appt-123',
        patientEmail: validPayload.patientEmail,
        patientFullName: validPayload.patientFullName,
      });
    });

    it('should return 403 if user is not a clinician', async () => {
      setupProfileMock('patient');

      const response = await request(app)
        .post('/appointments')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPayload);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid payload', async () => {
      setupProfileMock('clinician');

      const response = await request(app)
        .post('/appointments')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ patientEmail: 'not-an-email' }); // Missing required fields and bad email

      expect(response.status).toBe(400);
    });
  });

  describe('GET /appointments', () => {
    it('should list appointments for the user', async () => {
      setupProfileMock('patient');
      const mockAppointments = [{ id: 'appt-1' }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { ...mockProfile, role: 'patient' }, error: null }),
          };
        }
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockAppointments, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/appointments')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAppointments);
    });
  });

  describe('GET /appointments/:id', () => {
    it('should return appointment if user is owner', async () => {
      setupProfileMock('patient');
      const mockAppointment = { id: 'appt-1', patient_id: mockUser.id };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { ...mockProfile, role: 'patient' }, error: null }),
          };
        }
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockAppointment, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/appointments/appt-1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAppointment);
    });

    it('should return 403 if user is not owner', async () => {
      setupProfileMock('patient');
      const mockAppointment = { id: 'appt-1', patient_id: 'someone-else' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { ...mockProfile, role: 'patient' }, error: null }),
          };
        }
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockAppointment, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/appointments/appt-1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 if not found', async () => {
      setupProfileMock('patient');

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { ...mockProfile, role: 'patient' }, error: null }),
          };
        }
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      const response = await request(app)
        .get('/appointments/non-existent')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /appointments/:id/status', () => {
    it('should update appointment status if user is clinician', async () => {
      setupProfileMock('clinician');
      const mockUpdated = { id: 'appt-1', status: 'confirmed' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'appointments') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
          };
        }
      });

      const response = await request(app)
        .patch('/appointments/appt-1/status')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdated);
    });
  });
});
