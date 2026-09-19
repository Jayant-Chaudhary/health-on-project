import { useState, useEffect } from 'react';

// A mock useAuth hook that simulates a logged-in user in dev mode
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking session
    setTimeout(() => {
      const mockSession = { user: { id: 'patient_1', email: 'priya@example.com' } };
      // If we're mocking, auto-login for now
      if (import.meta.env.VITE_USE_MOCK !== 'false') {
        setSession(mockSession);
      }
      setLoading(false);
    }, 500);
  }, []);

  const login = (email, password) => {
    setSession({ user: { id: 'patient_1', email } });
  };

  const logout = () => {
    setSession(null);
  };

  return { session, loading, login, logout };
}
