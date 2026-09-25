jest.mock('../../config/supabaseAdminClient', () => ({
  auth: { admin: { listUsers: jest.fn() } },
}));

const supabaseAdmin = require('../../config/supabaseAdminClient');
const { findAuthUserByEmail } = require('../../services/authUsers.service');

const page = (users) => ({ data: { users }, error: null });
const fullPage = (prefix) =>
  Array.from({ length: 1000 }, (_, i) => ({ id: `${prefix}-${i}`, email: `${prefix}-${i}@example.com` }));

describe('findAuthUserByEmail()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should find a user past the first page', async () => {
    supabaseAdmin.auth.admin.listUsers
      .mockResolvedValueOnce(page(fullPage('a')))
      .mockResolvedValueOnce(page([{ id: 'target', email: 'Late.Patient@Example.com' }]));

    const user = await findAuthUserByEmail('late.patient@example.com');

    expect(user).toEqual({ id: 'target', email: 'Late.Patient@Example.com' });
    expect(supabaseAdmin.auth.admin.listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 });
  });

  it('should return null once a short page shows the list has ended', async () => {
    supabaseAdmin.auth.admin.listUsers.mockResolvedValueOnce(page([{ id: 'x', email: 'x@example.com' }]));

    await expect(findAuthUserByEmail('nobody@example.com')).resolves.toBeNull();
    expect(supabaseAdmin.auth.admin.listUsers).toHaveBeenCalledTimes(1);
  });

  it('should surface an API error rather than treating it as "not found"', async () => {
    supabaseAdmin.auth.admin.listUsers.mockResolvedValueOnce({ data: null, error: new Error('boom') });

    await expect(findAuthUserByEmail('x@example.com')).rejects.toThrow('boom');
  });
});
