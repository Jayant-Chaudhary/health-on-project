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

describe('Questionnaire API', () => {
  const mockPatient = { id: 'patient-123', email: 'test@example.com' };
  const mockClinician = { id: 'clinician-9', email: 'dr@example.com' };
  const mockToken = 'valid-token';

  const appointmentId = '123e4567-e89b-12d3-a456-426614174000';
  const ownAppointment = { id: appointmentId, patient_id: mockPatient.id, clinician_id: mockClinician.id };

  const signInAs = (user) =>
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user }, error: null });

  const send = (method, path) =>
    request(app)[method](path).set('Authorization', `Bearer ${mockToken}`);

  beforeEach(() => {
    jest.clearAllMocks();
    signInAs(mockPatient);
  });

  describe('GET /questionnaire/templates', () => {
    it('should list active templates', async () => {
      const mockTemplates = [{ id: 'q-1', question_text: 'How are you feeling?' }];
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        questionnaire_templates: ok(mockTemplates),
      });

      const response = await send('get', '/api/questionnaire/templates');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTemplates);
    });
  });

  describe('GET /questionnaire/appointment/:appointmentId', () => {
    it('should return the questions chosen for the appointment', async () => {
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        appointments: ok(ownAppointment),
        appointment_questionnaires: ok([
          { template_id: 'q-2', questionnaire_templates: { id: 'q-2', sort_order: 2 } },
          { template_id: 'q-1', questionnaire_templates: { id: 'q-1', sort_order: 1 } },
        ]),
      });

      const response = await send('get', `/api/questionnaire/appointment/${appointmentId}`);

      expect(response.status).toBe(200);
      expect(response.body.map((t) => t.id)).toEqual(['q-1', 'q-2']);
    });

    it('should fall back to the default questions when none were chosen', async () => {
      const defaults = [{ id: 'default-1' }];
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        appointments: ok(ownAppointment),
        appointment_questionnaires: ok([]),
        questionnaire_templates: ok(defaults),
      });

      const response = await send('get', `/api/questionnaire/appointment/${appointmentId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(defaults);
    });
  });

  describe('POST /questionnaire/templates', () => {
    it('should let a clinician save a question', async () => {
      signInAs(mockClinician);
      mockTables(supabaseAdmin, {
        profiles: profileRow('clinician'),
        questionnaire_templates: ok({ id: 'q-9', question_text: 'Any cramps?' }),
      });

      const response = await send('post', '/api/questionnaire/templates').send({ questionText: 'Any cramps?' });

      expect(response.status).toBe(201);
    });

    it('should return 403 for a patient', async () => {
      mockTables(supabaseAdmin, { profiles: profileRow('patient') });

      const response = await send('post', '/api/questionnaire/templates').send({ questionText: 'Any cramps?' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /questionnaire/responses', () => {
    const validPayload = {
      appointmentId,
      responses: [
        { templateId: '123e4567-e89b-12d3-a456-426614174001', answer: true, detail: 'Since Monday' },
      ],
    };

    it('should replace earlier answers with the submitted ones', async () => {
      const mockInsertedResponses = [{ id: 'resp-1' }];
      const chains = mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        appointments: ok(ownAppointment),
        // The clear, then the insert.
        questionnaire_responses: [ok(null), ok(mockInsertedResponses)],
      });

      const response = await send('post', '/api/questionnaire/responses').send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockInsertedResponses);
      expect(chains.questionnaire_responses[0].delete).toHaveBeenCalled();
      expect(chains.questionnaire_responses[1].insert).toHaveBeenCalledWith([
        {
          appointment_id: appointmentId,
          patient_id: mockPatient.id,
          template_id: validPayload.responses[0].templateId,
          answer: true,
          detail: 'Since Monday',
        },
      ]);
    });

    it("should return 403 for someone else's appointment", async () => {
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        appointments: ok({ ...ownAppointment, patient_id: 'someone-else' }),
      });

      const response = await send('post', '/api/questionnaire/responses').send(validPayload);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid payload', async () => {
      mockTables(supabaseAdmin, { profiles: profileRow('patient') });

      const response = await send('post', '/api/questionnaire/responses').send({ appointmentId: 'appt-123' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /questionnaire/responses/:appointmentId', () => {
    it('should get responses for an appointment', async () => {
      const mockResponses = [{ id: 'resp-1', answer: true }];
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        appointments: ok(ownAppointment),
        questionnaire_responses: ok(mockResponses),
      });

      const response = await send('get', `/api/questionnaire/responses/${appointmentId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponses);
    });

    it("should return 403 for another clinician's appointment", async () => {
      signInAs(mockClinician);
      mockTables(supabaseAdmin, {
        profiles: profileRow('clinician'),
        appointments: ok({ ...ownAppointment, clinician_id: 'another-dr' }),
      });

      const response = await send('get', `/api/questionnaire/responses/${appointmentId}`);

      expect(response.status).toBe(403);
    });
  });
});
