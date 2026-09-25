const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');
const { ok, mockTables, profileRow } = require('./helpers/supabaseMock');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

jest.mock('../services/storage.service', () => ({
  ...jest.requireActual('../services/storage.service'),
  createSignedUrl: jest.fn(async (bucket, path) => `https://signed.example/${bucket}/${path}`),
}));

describe('Post Visit API', () => {
  const mockClinician = { id: 'clinician-123', email: 'dr@example.com' };
  const mockPatient = { id: 'patient-456', email: 'patient@example.com' };
  const mockToken = 'valid-token';

  /** appt-1 is between these two; a stranger's appointment is not. */
  const ownAppointment = { id: 'appt-1', patient_id: mockPatient.id, clinician_id: mockClinician.id };
  const strangersAppointment = { id: 'appt-1', patient_id: 'someone', clinician_id: 'another-dr' };

  const signInAs = (user) =>
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user }, error: null });

  const send = (method, path) =>
    request(app)[method](path).set('Authorization', `Bearer ${mockToken}`);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /post-visit/:appointmentId/notes', () => {
    it('should save notes if clinician', async () => {
      signInAs(mockClinician);
      const mockSavedNotes = { id: 'note-1', notes_text: 'Patient doing well' };
      mockTables(supabaseAdmin, {
        profiles: profileRow('clinician'),
        appointments: ok(ownAppointment),
        consultation_notes: ok(mockSavedNotes),
      });

      const response = await send('put', '/api/post-visit/appt-1/notes').send({ notesText: 'Patient doing well' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSavedNotes);
    });

    it("should return 403 for another clinician's appointment", async () => {
      signInAs(mockClinician);
      mockTables(supabaseAdmin, {
        profiles: profileRow('clinician'),
        appointments: ok(strangersAppointment),
      });

      const response = await send('put', '/api/post-visit/appt-1/notes').send({ notesText: 'Some notes' });

      expect(response.status).toBe(403);
    });

    it('should return 403 if patient tries to save notes', async () => {
      signInAs(mockPatient);
      mockTables(supabaseAdmin, { profiles: profileRow('patient') });

      const response = await send('put', '/api/post-visit/appt-1/notes').send({ notesText: 'Some notes' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /post-visit/:appointmentId/prescriptions', () => {
    it('should add prescription if clinician', async () => {
      signInAs(mockClinician);
      const mockPrescription = { id: 'rx-1' };
      mockTables(supabaseAdmin, {
        profiles: profileRow('clinician'),
        appointments: ok(ownAppointment),
        prescriptions: ok(mockPrescription),
      });

      const response = await send('post', '/api/post-visit/appt-1/prescriptions').send({
        storagePath: 'prescriptions/rx-1.pdf',
        typedInstructions: 'Take 2 pills daily',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockPrescription);
    });
  });

  describe('POST /post-visit/:appointmentId/action-items', () => {
    it('should add action item for the appointment patient', async () => {
      signInAs(mockClinician);
      const mockActionItem = { id: 'ai-1', label: 'Blood test' };
      const chains = mockTables(supabaseAdmin, {
        profiles: profileRow('clinician'),
        appointments: ok(ownAppointment),
        post_visit_action_items: ok(mockActionItem),
      });

      const response = await send('post', '/api/post-visit/appt-1/action-items').send({ label: 'Blood test' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockActionItem);
      expect(chains.post_visit_action_items[0].insert).toHaveBeenCalledWith({
        appointment_id: 'appt-1',
        patient_id: mockPatient.id,
        label: 'Blood test',
      });
    });

    it('should return 409 while the patient has not accepted their invite', async () => {
      signInAs(mockClinician);
      mockTables(supabaseAdmin, {
        profiles: profileRow('clinician'),
        appointments: ok({ ...ownAppointment, patient_id: null }),
      });

      const response = await send('post', '/api/post-visit/appt-1/action-items').send({ label: 'Blood test' });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /post-visit/:appointmentId', () => {
    it('should get post visit summary with signed prescription URLs', async () => {
      signInAs(mockPatient);
      const mockNotes = { id: 'note-1' };
      const mockActionItems = [{ id: 'ai-1' }];
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        appointments: ok(ownAppointment),
        consultation_notes: ok(mockNotes),
        prescriptions: ok([{ id: 'rx-1', storage_path: 'p/rx-1.png' }]),
        post_visit_action_items: ok(mockActionItems),
      });

      const response = await send('get', '/api/post-visit/appt-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        notes: mockNotes,
        prescriptions: [
          { id: 'rx-1', storage_path: 'p/rx-1.png', signed_url: 'https://signed.example/prescriptions/p/rx-1.png' },
        ],
        actionItems: mockActionItems,
      });
    });

    it("should return 403 for someone else's appointment", async () => {
      signInAs(mockPatient);
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        appointments: ok(strangersAppointment),
      });

      const response = await send('get', '/api/post-visit/appt-1');

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /post-visit/action-items/:itemId', () => {
    it('should let the patient tick off their own next step', async () => {
      signInAs(mockPatient);
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        // The access lookup, then the update.
        post_visit_action_items: [ok({ id: 'ai-1', appointment_id: 'appt-1' }), ok({ id: 'ai-1', is_completed: true })],
        appointments: ok(ownAppointment),
      });

      const response = await send('patch', '/api/post-visit/action-items/ai-1').send({ isCompleted: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 'ai-1', is_completed: true });
    });

    it("should return 403 for another patient's next step", async () => {
      signInAs(mockPatient);
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        post_visit_action_items: ok({ id: 'ai-1', appointment_id: 'appt-1' }),
        appointments: ok(strangersAppointment),
      });

      const response = await send('patch', '/api/post-visit/action-items/ai-1').send({ isCompleted: true });

      expect(response.status).toBe(403);
    });

    it('should return 400 without a boolean isCompleted', async () => {
      signInAs(mockPatient);
      mockTables(supabaseAdmin, { profiles: profileRow('patient') });

      const response = await send('patch', '/api/post-visit/action-items/ai-1').send({ isCompleted: 'yes' });

      expect(response.status).toBe(400);
    });
  });
});
