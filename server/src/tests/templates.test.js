const request = require('supertest');
const app = require('../app');
const supabaseAdmin = require('../config/supabaseAdminClient');
const { ok, mockTables, profileRow } = require('./helpers/supabaseMock');

jest.mock('../config/supabaseAdminClient', () => ({
  auth: { getUser: jest.fn() },
  from: jest.fn(),
}));

describe('Clinician templates API', () => {
  const clinician = { id: 'clinician-1', email: 'dr@example.com' };

  const send = (method, path) => request(app)[method](path).set('Authorization', 'Bearer t');

  beforeEach(() => {
    jest.clearAllMocks();
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: clinician }, error: null });
  });

  it("should list the clinician's own templates of one kind", async () => {
    const rows = [{ id: 't-1', kind: 'action', label: 'Repeat CBC' }];
    const chains = mockTables(supabaseAdmin, {
      profiles: profileRow('clinician'),
      clinician_templates: ok(rows),
    });

    const response = await send('get', '/api/templates?kind=action');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(rows);
    const query = chains.clinician_templates[0];
    expect(query.eq).toHaveBeenCalledWith('clinician_id', clinician.id);
    expect(query.eq).toHaveBeenCalledWith('kind', 'action');
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('should reject an unknown kind', async () => {
    mockTables(supabaseAdmin, { profiles: profileRow('clinician') });

    const response = await send('get', '/api/templates?kind=other');

    expect(response.status).toBe(400);
  });

  it('should create a template owned by the clinician', async () => {
    const chains = mockTables(supabaseAdmin, {
      profiles: profileRow('clinician'),
      clinician_templates: ok({ id: 't-2' }),
    });

    const response = await send('post', '/api/templates').send({ kind: 'consultation', label: '  BP checked ' });

    expect(response.status).toBe(201);
    expect(chains.clinician_templates[0].insert).toHaveBeenCalledWith({
      clinician_id: clinician.id,
      kind: 'consultation',
      label: 'BP checked',
    });
  });

  it('should rename only a template the clinician owns', async () => {
    const chains = mockTables(supabaseAdmin, {
      profiles: profileRow('clinician'),
      clinician_templates: ok(null),
    });

    const response = await send('patch', '/api/templates/t-9').send({ label: 'New label' });

    expect(response.status).toBe(404);
    expect(chains.clinician_templates[0].eq).toHaveBeenCalledWith('clinician_id', clinician.id);
  });

  it('should soft-delete a template', async () => {
    const chains = mockTables(supabaseAdmin, {
      profiles: profileRow('clinician'),
      clinician_templates: ok({ id: 't-1' }),
    });

    const response = await send('delete', '/api/templates/t-1');

    expect(response.status).toBe(204);
    expect(chains.clinician_templates[0].update).toHaveBeenCalledWith({ is_active: false });
  });

  it('should be closed to patients', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: { id: 'p-1' } }, error: null });
    mockTables(supabaseAdmin, { profiles: profileRow('patient') });

    const response = await send('get', '/api/templates?kind=action');

    expect(response.status).toBe(403);
  });
});
