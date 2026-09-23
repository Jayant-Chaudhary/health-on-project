import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Spinner } from '../components/common/Spinner.jsx';

/**
 * Role-guarded route wrapper.
 *
 * Not applied to the dashboard route yet. Wrap a route with this once invites
 * are issuing real sessions.
 */
export function ProtectedRoute({ role, children }) {
  const { user, role: userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/" replace />;

  return children;
}

export default ProtectedRoute;
