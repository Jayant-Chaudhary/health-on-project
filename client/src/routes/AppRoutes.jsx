import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppShell from '../layouts/AppShell';
import CheckinLayout from '../layouts/CheckinLayout';

// Patient Pages
import HomePage from '../pages/home/HomePage';
import ProfilePage from '../pages/profile/ProfilePage';
import ReportsPage from '../pages/reports/ReportsPage';
import VisitSummaryPage from '../pages/summary/VisitSummaryPage';
import SymptomsStep from '../pages/checkin/SymptomsStep';
import ChecklistStep from '../pages/checkin/ChecklistStep';
import CheckinDonePage from '../pages/checkin/CheckinDonePage';

// Clinician Pages
import { ClinicianDashboard } from '../pages/clinician/ClinicianDashboard.jsx';
import { ComingSoon } from '../pages/clinician/ComingSoon.jsx';

export function AppRoutes() {
  return (
    <Routes>
      {/* Patient Public Routes */}
      <Route path="/login" element={<div>Login Placeholder</div>} />
      <Route path="/invite/:token" element={<div>Invite Placeholder</div>} />
      
      {/* Patient App Shell Routes */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/summary" element={<VisitSummaryPage />} />
      </Route>

      {/* Patient Check-in Flow Routes */}
      <Route element={<ProtectedRoute><CheckinLayout /></ProtectedRoute>}>
        <Route path="/checkin/symptoms" element={<SymptomsStep />} />
        <Route path="/checkin/checklist" element={<ChecklistStep />} />
      </Route>
      <Route path="/checkin/done" element={<ProtectedRoute><CheckinDonePage /></ProtectedRoute>} />

      {/* Clinician Routes */}
      <Route path="/clinician" element={<ClinicianDashboard />} />
      <Route path="/clinician/schedule" element={<ComingSoon title="Schedule" icon="calendar" />} />
      <Route path="/clinician/patients" element={<ComingSoon title="Patients" icon="users" />} />
      <Route path="/clinician/lab-inbox" element={<ComingSoon title="Lab Inbox" icon="flask" />} />
      <Route path="/clinician/analytics" element={<ComingSoon title="Analytics" icon="chart" />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
