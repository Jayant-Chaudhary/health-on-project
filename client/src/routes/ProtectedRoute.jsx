import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowIncomplete = false, requireVerifiedClinician = false }) {
  const { session, loading, profile, role, user } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const activeRole = role || profile?.role || user?.user_metadata?.role || 'patient';

  if (!allowIncomplete && (!profile || !profile.full_name)) {
    if (activeRole === 'clinician') {
      return <Navigate to="/onboarding/clinician" replace />;
    } else {
      return <Navigate to="/onboarding/patient" replace />;
    }
  }

  if (activeRole === 'clinician' && (location.pathname === '/' || location.pathname.startsWith('/checkin'))) {
    return <Navigate to="/clinician" replace />;
  }

  if (activeRole === 'patient' && location.pathname.startsWith('/clinician')) {
    return <Navigate to="/" replace />;
  }

  if (requireVerifiedClinician && activeRole === 'clinician') {
    // Unverified until an administrator says otherwise — a missing details
    // row is not a pass. The API enforces the same rule.
    if (profile?.clinicianDetails?.is_verified !== true) {
      return <Navigate to="/verification-pending" replace />;
    }
  }

  return children;
}
