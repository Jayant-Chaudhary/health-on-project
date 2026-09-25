import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

/**
 * For pages that only make sense signed out (login, signup).
 *
 * A signed-in user who lands here — typically by pressing Back after logging
 * in — is sent to their home instead, with `replace` so the login page does
 * not stay in the history for Back to find again.
 */
export default function PublicOnlyRoute({ children }) {
  const { session, loading, role } = useAuthContext();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session) {
    return <Navigate to={role === 'clinician' ? '/clinician' : '/'} replace />;
  }

  return children;
}
