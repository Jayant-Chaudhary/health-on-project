import { supabase } from './supabaseClient.js';

/**
 * Register a new user in Supabase Auth and create a profile entry.
 * 
 * @param {Object} params
 * @param {string} params.email - User email address
 * @param {string} params.password - User password
 * @param {string} [params.fullName] - User full name
 * @param {'patient'|'clinician'|'receptionist'} [params.role='patient'] - User role
 * @param {string} [params.phone] - User phone number
 * @returns {Promise<{ user: Object|null, session: Object|null, error: Object|null }>}
 */
export async function signUpUser({ email, password, fullName = '', role = 'patient', phone = '' }) {
  try {
    // 1. Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (authError) {
      console.error('[SignUp Error]:', authError.message);
      return { user: null, session: null, error: authError };
    }

    const user = authData.user;
    if (!user) {
      return { user: null, session: null, error: new Error('User creation returned empty user.') };
    }

    // 2. Create user profile in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        role: role,
        full_name: fullName,
        phone: phone,
      });

    if (profileError) {
      console.error('[Profile Creation Warning]:', profileError.message);
      // Non-blocking, but return note
    }

    // 3. If patient role, optionally initialize patient_details
    if (role === 'patient') {
      await supabase
        .from('patient_details')
        .upsert({
          profile_id: user.id,
        });
    }

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (err) {
    console.error('[SignUp Unexpected Exception]:', err);
    return { user: null, session: null, error: err };
  }
}

/**
 * Sign in an existing user using email and password.
 * 
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{ user: Object|null, session: Object|null, profile: Object|null, error: Object|null }>}
 */
export async function signInUser({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[SignIn Error]:', error.message);
      return { user: null, session: null, profile: null, error };
    }

    // Fetch matching user profile
    let profile = null;
    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      profile = profileData;
    }

    return {
      user: data.user,
      session: data.session,
      profile,
      error: null,
    };
  } catch (err) {
    console.error('[SignIn Unexpected Exception]:', err);
    return { user: null, session: null, profile: null, error: err };
  }
}

/**
 * Log out the currently authenticated user session.
 * 
 * @returns {Promise<{ success: boolean, error: Object|null }>}
 */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[SignOut Error]:', error.message);
      return { success: false, error };
    }
    return { success: true, error: null };
  } catch (err) {
    console.error('[SignOut Unexpected Exception]:', err);
    return { success: false, error: err };
  }
}

/**
 * Get current logged in user and session details.
 * 
 * @returns {Promise<{ user: Object|null, profile: Object|null, session: Object|null }>}
 */
export async function getCurrentUser() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { user: null, profile: null, session: null };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return {
      user: session.user,
      profile,
      session,
    };
  } catch (err) {
    console.error('[GetCurrentUser Exception]:', err);
    return { user: null, profile: null, session: null };
  }
}
