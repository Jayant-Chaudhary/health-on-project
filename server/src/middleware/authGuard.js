const supabaseAdmin = require('../config/supabaseAdminClient');

async function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name, clinician_details ( is_verified )')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found or role unassigned' });
    }

    // One-to-one embeds come back as an object, older PostgREST as an array.
    const clinicianDetails = Array.isArray(profile.clinician_details)
      ? profile.clinician_details[0]
      : profile.clinician_details;

    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      fullName: profile.full_name,
      isVerified: profile.role === 'clinician' ? clinicianDetails?.is_verified === true : true,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authGuard;
