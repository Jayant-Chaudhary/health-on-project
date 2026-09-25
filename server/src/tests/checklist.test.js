const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');
const { ensureStaticChecklistItems } = require('../services/checklist.service');
const { ok, mockTables, profileRow } = require('./helpers/supabaseMock');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

jest.mock('../services/checklist.service', () => ({
  ensureStaticChecklistItems: jest.fn(),
}));

describe('Checklist API', () => {
  const mockPatient = { id: 'patient-123', email: 'test@example.com' };
  const mockClinician = { id: 'clinician-9', email: 'dr@example.com' };
  const mockToken = 'valid-token';

  const ownAppointment = { id: 'appt-123', patient_id: mockPatient.id, clinician_id: mockClinician.id };

  const signInAs = (user) =>
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user }, error: null });

  const send = (method, path) =>
    request(app)[method](path).set('Authorization', `Bearer ${mockToken}`);

  beforeEach(() => {
    jest.clearAllMocks();
    signInAs(mockPatient);
    ensureStaticChecklistItems.mockResolvedValue([]);
  });

  describe('GET /checklist/:appointmentId', () => {
    it('should return checklist items for an appointment', async () => {
      const mockItems = [{ id: 'item-1', label: 'Bring ID' }];
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        appointments: ok(ownAppointment),
        pre_visit_checklist_items: ok(mockItems),
      });

      const response = await send('get', '/api/checklist/appt-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockItems);
      expect(ensureStaticChecklistItems).toHaveBeenCalledWith('appt-123', mockPatient.id);
    });

    it("should seed items under the patient's id when the clinician opens the list", async () => {
      signInAs(mockClinician);
      mockTables(supabaseAdmin, {
        profiles: profileRow('clinician'),
        appointments: ok(ownAppointment),
        pre_visit_checklist_items: ok([]),
      });

      const response = await send('get', '/api/checklist/appt-123');

      expect(response.status).toBe(200);
      expect(ensureStaticChecklistItems).toHaveBeenCalledWith('appt-123', mockPatient.id);
    });

    it("should return 403 for someone else's appointment", async () => {
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        appointments: ok({ ...ownAppointment, patient_id: 'someone-else' }),
      });

      const response = await send('get', '/api/checklist/appt-123');

      expect(response.status).toBe(403);
      expect(ensureStaticChecklistItems).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /checklist/items/:itemId', () => {
    it('should toggle item completion status', async () => {
      const mockUpdatedItem = { id: 'item-1', is_completed: true };
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        // The access lookup, then the update.
        pre_visit_checklist_items: [ok({ id: 'item-1', appointment_id: 'appt-123' }), ok(mockUpdatedItem)],
        appointments: ok(ownAppointment),
      });

      const response = await send('patch', '/api/checklist/items/item-1').send({ isCompleted: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedItem);
    });

    it("should return 403 for another patient's item", async () => {
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        pre_visit_checklist_items: ok({ id: 'item-1', appointment_id: 'appt-123' }),
        appointments: ok({ ...ownAppointment, patient_id: 'someone-else' }),
      });

      const response = await send('patch', '/api/checklist/items/item-1').send({ isCompleted: true });

      expect(response.status).toBe(403);
    });

    it('should return 404 for an unknown item', async () => {
      mockTables(supabaseAdmin, {
        profiles: profileRow('patient'),
        pre_visit_checklist_items: ok(null),
      });

      const response = await send('patch', '/api/checklist/items/nope').send({ isCompleted: true });

      expect(response.status).toBe(404);
    });

    it('should return 400 if isCompleted is missing or invalid type', async () => {
      mockTables(supabaseAdmin, { profiles: profileRow('patient') });

      const response = await send('patch', '/api/checklist/items/item-1').send({ isCompleted: 'not-a-boolean' });

      expect(response.status).toBe(400);
    });
  });
});
