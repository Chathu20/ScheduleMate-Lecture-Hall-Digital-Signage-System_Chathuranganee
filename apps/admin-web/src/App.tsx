import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CampusStructurePage } from './pages/CampusStructurePage';
import { ModulesLecturersPage } from './pages/ModulesLecturersPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campus-structure"
            element={
              <ProtectedRoute>
                <CampusStructurePage />
              </ProtectedRoute>
            }
          />
          <Route
              path="/modules-lecturers"
              element={
                <ProtectedRoute>
                  <ModulesLecturersPage />
                </ProtectedRoute>
              }
            />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;