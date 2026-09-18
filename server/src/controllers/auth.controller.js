const supabaseAdmin = require('../config/supabaseAdminClient');

/**
 * @desc   Accept an appointment invite token and set user password
 * @route  POST /auth/accept-invite
 */
async function acceptInvite(req, res, next) {
  try {
    const { token, password } = req.validated;

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('appointment_invites')
      .select('*, appointments ( id, patient_id )')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.used_at) {
      return res.status(410).json({ error: 'This invite has already been used' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invite has expired' });
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = existingUsers?.users?.find((u) => u.email === invite.patient_email);

    if (!authUser) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.patient_email,
        password,
        email_confirm: true,
      });
      if (createError) {
        return res.status(500).json({ error: `Failed to create account: ${createError.message}` });
      }
      authUser = created.user;
    } else {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password,
      });
      if (updateError) {
        return res.status(500).json({ error: `Failed to set password: ${updateError.message}` });
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: authUser.id, role: 'patient', full_name: authUser.user_metadata?.full_name || null });

    if (profileError) {
      return res.status(500).json({ error: `Failed to create profile: ${profileError.message}` });
    }

    if (!invite.appointments.patient_id) {
      await supabaseAdmin
        .from('appointments')
        .update({ patient_id: authUser.id })
        .eq('id', invite.appointments.id);
    }

    await supabaseAdmin
      .from('appointment_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id);

    res.status(200).json({
      message: 'Account ready. You can now log in with your new password.',
      email: invite.patient_email,
      appointmentId: invite.appointments.id,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @desc   Register a user directly (Patient/Clinician)
 * @route  POST /auth/signup
 */
async function signup(req, res, next) {
  try {
    const { email, password, fullName, role = 'patient', phone } = req.validated;

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    const user = created.user;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        role: role,
        full_name: fullName || '',
        phone: phone || '',
      });

    if (profileError) {
      console.error('[Profile creation warning]:', profileError.message);
    }

    if (role === 'patient') {
      await supabaseAdmin.from('patient_details').upsert({ profile_id: user.id });
    }

    res.status(201).json({
      message: 'Signup successful',
      user: { id: user.id, email: user.email, role, fullName },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @desc   Authenticate existing user
 * @route  POST /auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.validated;

    // Use admin or public client for password authentication
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.status(200).json({
      message: 'Login successful',
      session: data.session,
      user: data.user,
      profile: profile || null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @desc   Log out current session
 * @route  POST /auth/logout
 */
async function logout(req, res) {
  res.status(200).json({ message: 'Logout successful' });
}

/**
 * @desc   Get current authenticated user profile
 * @route  GET /auth/me
 */
async function getMe(req, res) {
  res.status(200).json({ user: req.user });
}

module.exports = { acceptInvite, signup, login, logout, getMe };
