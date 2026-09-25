const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');
const env = require('../config/env');
const { ok, mockTables, profileRow } = require('./helpers/supabaseMock');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: { getUser: jest.fn() },
  from: jest.fn(),
}));

describe('POST /api/profile/demo-verify', () => {
  const user = { id: 'dr-1', email: 'dr@example.com' };
  const send = () => request(app).post('/api/profile/demo-verify').set('Authorization', 'Bearer t');

  beforeEach(() => {
    jest.clearAllMocks();
    env.demoSelfVerify = true;
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user }, error: null });
  });

  it('should verify an unverified clinician', async () => {
    const chains = mockTables(supabaseAdmin, {
      profiles: profileRow('clinician', { verified: false }),
      clinician_details: ok(null),
    });

    const response = await send();

    expect(response.status).toBe(200);
    expect(chains.clinician_details[0].upsert).toHaveBeenCalledWith(
      { profile_id: user.id, is_verified: true },
      { onConflict: 'profile_id' }
    );
  });

  it('should refuse when the demo switch is off', async () => {
    env.demoSelfVerify = false;
    const chains = mockTables(supabaseAdmin, {
      profiles: profileRow('clinician', { verified: false }),
      clinician_details: ok(null),
    });

    const response = await send();

    expect(response.status).toBe(403);
    expect(chains.clinician_details).toBeUndefined();
  });

  it('should refuse a patient', async () => {
    mockTables(supabaseAdmin, { profiles: profileRow('patient') });

    const response = await send();

    expect(response.status).toBe(403);
  });
});
