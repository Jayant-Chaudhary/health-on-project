import { useState, useEffect } from 'react';
import { getCurrentUser, signInUser, signUpUser, signOutUser } from '../services/authService';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const { session, profile } = await getCurrentUser();
        setSession(session);
        setUserProfile(profile);
      } catch (err) {
        console.error('Failed to load session', err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (email, password) => {
    const { session, profile, error } = await signInUser({ email, password });
    if (!error) {
      setSession(session);
      setUserProfile(profile);
    }
    return { session, profile, error };
  };
  
  const signup = async (data) => {
    const { session, user, error } = await signUpUser(data);
    if (!error && session) {
      setSession(session);
      // fetch profile since signup doesn't return it directly
      const { profile } = await getCurrentUser();
      setUserProfile(profile);
    }
    return { session, user, error };
  };

  const logout = async () => {
    await signOutUser();
    setSession(null);
    setUserProfile(null);
  };

  return { session, profile: userProfile, loading, login, signup, logout };
}
