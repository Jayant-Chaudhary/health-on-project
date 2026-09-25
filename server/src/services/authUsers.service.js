const supabaseAdmin = require('../config/supabaseAdminClient');

const PAGE_SIZE = 1000;

/**
 * The Supabase auth user behind an email address, or null.
 *
 * `listUsers()` is paginated (50 per page by default), so a single call
 * silently misses everyone past the first page — a returning patient would
 * then be treated as new. This walks every page.
 */
async function findAuthUserByEmail(email) {
  const target = email.toLowerCase();

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;

    const users = data?.users || [];
    const match = users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (users.length < PAGE_SIZE) return null;
  }
}

module.exports = { findAuthUserByEmail };
