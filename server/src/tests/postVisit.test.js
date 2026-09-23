const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

describe('Post Visit API', () => {
  const mockClinician = {
    id: 'clinician-123',
    email: 'dr@example.com',
  };
  const mockPatient = {
    id: 'patient-456',
    email: 'patient@example.com',
  };

  const mockClinicianProfile = {
    role: 'clinician',
    full_name: 'Dr. Test',
  };
  
  const mockPatientProfile = {
    role: 'patient',
    full_name: 'Patient Test',
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
        upsert: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockReturnThis(),
      };
    });
  };

  describe('PUT /post-visit/:appointmentId/notes', () => {
    it('should save notes if clinician', async () => {
      setupAuthMock(mockClinician, mockClinicianProfile);
      const mockSavedNotes = { id: 'note-1', notes_text: 'Patient doing well' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockClinicianProfile, error: null }) };
        if (table === 'consultation_notes') {
          return {
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockSavedNotes, error: null }),
          };
        }
      });

      const response = await request(app)
        .put('/post-visit/appt-1/notes')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ notesText: 'Patient doing well' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSavedNotes);
    });

    it('should return 403 if patient tries to save notes', async () => {
      setupAuthMock(mockPatient, mockPatientProfile);

      const response = await request(app)
        .put('/post-visit/appt-1/notes')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ notesText: 'Some notes' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /post-visit/:appointmentId/prescriptions', () => {
    it('should add prescription if clinician', async () => {
      setupAuthMock(mockClinician, mockClinicianProfile);
      const mockPrescription = { id: 'rx-1' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockClinicianProfile, error: null }) };
        if (table === 'prescriptions') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockPrescription, error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/post-visit/appt-1/prescriptions')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ storagePath: 'prescriptions/rx-1.pdf', typedInstructions: 'Take 2 pills daily' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockPrescription);
    });
  });

  describe('POST /post-visit/:appointmentId/action-items', () => {
    it('should add action item if clinician', async () => {
      setupAuthMock(mockClinician, mockClinicianProfile);
      const mockActionItem = { id: 'ai-1', label: 'Blood test' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockClinicianProfile, error: null }) };
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { patient_id: mockPatient.id }, error: null }),
          };
        }
        if (table === 'post_visit_action_items') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockActionItem, error: null }),
          };
        }
      });

      const response = await request(app)
        .post('/post-visit/appt-1/action-items')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ label: 'Blood test' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockActionItem);
    });
  });

  describe('GET /post-visit/:appointmentId', () => {
    it('should get post visit summary', async () => {
      setupAuthMock(mockPatient, mockPatientProfile);
      const mockNotes = { id: 'note-1' };
      const mockPrescriptions = [{ id: 'rx-1' }];
      const mockActionItems = [{ id: 'ai-1' }];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: mockPatientProfile, error: null }) };
        if (table === 'consultation_notes') {
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: mockNotes, error: null }) };
        }
        if (table === 'prescriptions') {
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: mockPrescriptions, error: null }) };
        }
        if (table === 'post_visit_action_items') {
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({ data: mockActionItems, error: null }) };
        }
      });

      const response = await request(app)
        .get('/post-visit/appt-1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        notes: mockNotes,
        prescriptions: mockPrescriptions,
        actionItems: mockActionItems,
      });
    });
  });
});
