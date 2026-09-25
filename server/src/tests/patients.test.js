const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');
const { ok, mockTables, profileRow } = require('./helpers/supabaseMock');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: { getUser: jest.fn() },
  from: jest.fn(),
}));

describe('Patients API', () => {
  const clinician = { id: 'clinician-1', email: 'dr@example.com' };
  const send = (path) => request(app).get(path).set('Authorization', 'Bearer t');

  beforeEach(() => {
    jest.clearAllMocks();
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: clinician }, error: null });
  });

  it('should return one row per patient with last and next visit', async () => {
    const past = '2020-01-01T10:00:00Z';
    const later = '2020-02-01T10:00:00Z';
    const future = '2999-01-01T10:00:00Z';
    const asha = { id: 'p-1', full_name: 'Asha Rao', phone: '123' };

    const chains = mockTables(supabaseAdmin, {
      profiles: profileRow('clinician'),
      appointments: ok([
        { id: 'a-1', patient_id: 'p-1', scheduled_at: past, status: 'completed', patient: asha, appointment_invites: [{ patient_email: 'asha@example.com' }] },
        { id: 'a-2', patient_id: 'p-1', scheduled_at: later, status: 'completed', patient: asha, appointment_invites: null },
        { id: 'a-3', patient_id: 'p-1', scheduled_at: future, status: 'active', patient: asha, appointment_invites: null },
        { id: 'a-4', patient_id: 'p-2', scheduled_at: past, status: 'cancelled', patient: { id: 'p-2', full_name: 'Bina' }, appointment_invites: { patient_email: 'bina@example.com' } },
      ]),
    });

    const response = await send('/api/patients');

    expect(response.status).toBe(200);
    expect(chains.appointments[0].eq).toHaveBeenCalledWith('clinician_id', clinician.id);
    expect(response.body).toEqual([
      {
        id: 'p-1',
        fullName: 'Asha Rao',
        phone: '123',
        email: 'asha@example.com',
        visitCount: 3,
        lastVisit: { appointmentId: 'a-2', scheduledAt: later, status: 'completed' },
        nextVisit: { appointmentId: 'a-3', scheduledAt: future, status: 'active' },
      },
      {
        id: 'p-2',
        fullName: 'Bina',
        phone: null,
        email: 'bina@example.com',
        visitCount: 0,
        lastVisit: null,
        nextVisit: null,
      },
    ]);
  });

  it('should be closed to patients', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: { id: 'p-1' } }, error: null });
    mockTables(supabaseAdmin, { profiles: profileRow('patient') });

    const response = await send('/api/patients');

    expect(response.status).toBe(403);
  });
});
