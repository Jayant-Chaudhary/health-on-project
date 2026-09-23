import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowIncomplete = false, requireVerifiedClinician = false }) {
  const { session, loading, profile, role } = useAuthContext();
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

  if (!allowIncomplete && (!profile || !profile.full_name)) {
    const activeRole = role || profile?.role || 'patient';
    if (activeRole === 'patient') {
      return <Navigate to="/onboarding/patient" replace />;
    } else if (activeRole === 'clinician') {
      return <Navigate to="/onboarding/clinician" replace />;
    }
  }

  if (requireVerifiedClinician && role === 'clinician') {
    if (profile?.clinicianDetails?.is_verified === false) {
      return <Navigate to="/verification-pending" replace />;
    }
  }

  return children;
}
