import { supabase } from './supabaseClient.js';


export async function signUpUser({ email, password, role = 'patient' }) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
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

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        role: role,
      });

    if (profileError) {
      console.error('[Profile Creation Warning]:', profileError.message);
    }

    if (role === 'patient') {
      await supabase
        .from('patient_details')
        .upsert({ profile_id: user.id });
    } else if (role === 'clinician') {
      await supabase
        .from('clinician_details')
        .upsert({
          profile_id: user.id,
          is_verified: false
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

export async function signInUser({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, session: null, profile: null, error };
    }

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
    return { user: null, session: null, profile: null, error: err };
  }
}

export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err };
  }
}

export async function fetchProfile(userId) {
  if (!userId) return null;
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, clinician_details(*), patient_details(*)')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('[fetchProfile Error]:', error.message);
      return null;
    }
    
    // Flatten for convenience if needed, but keeping nested is fine too
    if (profile.clinician_details && profile.clinician_details.length > 0) {
      profile.clinicianDetails = profile.clinician_details[0];
    }
    if (profile.patient_details && profile.patient_details.length > 0) {
      profile.patientDetails = profile.patient_details[0];
    }
    
    return profile;
  } catch (err) {
    console.error('[fetchProfile Exception]:', err);
    return null;
  }
}

export async function completeOnboarding(userId, role, details) {
  try {
    // 1. Update basic profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: details.fullName,
        phone: details.phone
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    // 2. Update specific details
    if (role === 'patient') {
      // Add any specific patient updates if needed
    } else if (role === 'clinician') {
      const { error: clinicianError } = await supabase
        .from('clinician_details')
        .update({
          specialty: details.specialty,
          license_number: details.licenseNumber,
          state_medical_council: details.stateMedicalCouncil
        })
        .eq('profile_id', userId);
        
      if (clinicianError) throw clinicianError;
    }
    return { success: true, error: null };
  } catch (err) {
    console.error('[Onboarding Error]:', err.message);
    return { success: false, error: err };
  }
}

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
    return { user: session.user, profile, session };
  } catch (err) {
    return { user: null, profile: null, session: null };
  }
}

export { signInUser as signIn, signUpUser as signUp, signOutUser as signOut };


