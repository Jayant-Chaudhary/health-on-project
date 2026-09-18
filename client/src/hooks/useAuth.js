import { useAuthContext } from '../context/AuthContext.jsx';

/**
 * Hook to access Auth state & methods (user, profile, login, signup, logout)
 */
export function useAuth() {
  return useAuthContext();
}
