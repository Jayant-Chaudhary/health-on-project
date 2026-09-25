/**
 * Marks a clinician account as verified.
 *
 * Verification is an administrator's decision, so there is deliberately no
 * API route for it; this script is the admin tool until one exists. It runs
 * with the service-role key from server/.env.
 *
 *   node scripts/verifyClinician.js <email>            # verify
 *   node scripts/verifyClinician.js <email> --revoke   # set back to unverified
 */
const supabaseAdmin = require('../src/config/supabaseAdminClient');
const { findAuthUserByEmail } = require('../src/services/authUsers.service');

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) {
    console.error('Usage: node scripts/verifyClinician.js <email> [--revoke]');
    return 1;
  }
  const isVerified = flag !== '--revoke';

  const user = await findAuthUserByEmail(email);
  if (!user) {
    console.error(`No account found for ${email}. Check the spelling, or sign up first.`);
    return 1;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) {
    console.error(`${email} has no profile yet. Finish onboarding first.`);
    return 1;
  }
  if (profile.role !== 'clinician') {
    console.error(`${email} is a ${profile.role}, not a clinician. Nothing changed.`);
    return 1;
  }

  // Upsert: a clinician who signed up before clinician_details existed has no row.
  const { error } = await supabaseAdmin
    .from('clinician_details')
    .upsert({ profile_id: user.id, is_verified: isVerified }, { onConflict: 'profile_id' });

  if (error) throw error;

  console.log(
    `${profile.full_name || email} (${user.id}) is now ${isVerified ? 'verified' : 'unverified'}.`
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Failed:', err.message || err);
    process.exit(1);
  });
