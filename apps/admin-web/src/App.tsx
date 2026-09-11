import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { CampusStructurePage } from './pages/CampusStructurePage';
import { ModulesPage } from './pages/ModulesPage';
import { LecturersPage } from './pages/LecturersPage';
import { SessionsPage } from './pages/SessionsPage';
import { DisplaysPage } from './pages/DisplaysPage';
import { ManageAdminsPage } from './pages/ManageAdminsPage';
import { SignageSettingsPage } from './pages/SignageSettingsPage';
import { ProfilePage } from './pages/ProfilePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/campus-structure" element={<CampusStructurePage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route path="/lecturers" element={<LecturersPage />} />
            <Route path="/displays" element={<DisplaysPage />} />
            <Route path="/manage-admins" element={<ManageAdminsPage />} />
            <Route path="/signage-settings" element={<SignageSettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
