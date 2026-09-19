import { Navigate, Route, Routes } from 'react-router-dom';
import { ClinicianDashboard } from '../pages/clinician/ClinicianDashboard.jsx';
import { ComingSoon } from '../pages/clinician/ComingSoon.jsx';

/**
 * Route table. Only the clinician dashboard is built in this milestone;
 * the patient portal routes land under `/patient` in a later pass.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/clinician" replace />} />
      <Route path="/clinician" element={<ClinicianDashboard />} />
      <Route path="/clinician/schedule" element={<ComingSoon title="Schedule" icon="calendar" />} />
      <Route path="/clinician/patients" element={<ComingSoon title="Patients" icon="users" />} />
      <Route path="/clinician/lab-inbox" element={<ComingSoon title="Lab Inbox" icon="flask" />} />
      <Route path="/clinician/analytics" element={<ComingSoon title="Analytics" icon="chart" />} />
      <Route path="*" element={<Navigate to="/clinician" replace />} />
    </Routes>
  );
}

export default AppRoutes;
