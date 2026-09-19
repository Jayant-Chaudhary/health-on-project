import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppShell from '../layouts/AppShell';
import CheckinLayout from '../layouts/CheckinLayout';

// Pages
import HomePage from '../pages/home/HomePage';
import ProfilePage from '../pages/profile/ProfilePage';
import ReportsPage from '../pages/reports/ReportsPage';
import VisitSummaryPage from '../pages/summary/VisitSummaryPage';
import SymptomsStep from '../pages/checkin/SymptomsStep';
import ChecklistStep from '../pages/checkin/ChecklistStep';
import CheckinDonePage from '../pages/checkin/CheckinDonePage';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>Login Placeholder</div>} />
        <Route path="/invite/:token" element={<div>Invite Placeholder</div>} />
        
        {/* Protected App Shell Routes (with Top Navbar) */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/summary" element={<VisitSummaryPage />} />
        </Route>

        {/* Check-in Flow Routes (Standalone Layout) */}
        <Route element={<ProtectedRoute><CheckinLayout /></ProtectedRoute>}>
          <Route path="/checkin/symptoms" element={<SymptomsStep />} />
          <Route path="/checkin/checklist" element={<ChecklistStep />} />
        </Route>
        
        <Route path="/checkin/done" element={<ProtectedRoute><CheckinDonePage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
