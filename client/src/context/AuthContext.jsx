import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient.js';
import { fetchProfile, signIn as apiSignIn, signUp as apiSignUp, signOut as apiSignOut, completeOnboarding as apiCompleteOnboarding } from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        } catch (e) {
          console.error('Failed to load profile:', e);
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        } catch (e) {
          console.error('Failed to update profile:', e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials) => {
    return await apiSignIn(credentials);
  };

  const signup = async (payload) => {
    return await apiSignUp(payload);
  };

  const logout = async () => {
    return await apiSignOut();
  };

  const completeOnboarding = async (details) => {
    if (!user || !profile) return { success: false, error: new Error('User not loaded') };
    const result = await apiCompleteOnboarding(user.id, profile.role, details);
    if (result.success) {
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
    }
    return result;
  };

  const value = {
    user,
    profile,
    session,
    loading,
    role: profile?.role || null,
    login,
    signup,
    logout,
    completeOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
