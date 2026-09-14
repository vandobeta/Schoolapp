import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OfflineProvider } from "./context/OfflineContext";
import { Layout } from "./components/Layout";
import { Login, StaffLogin, Register } from "./pages/Auth";
import { Dashboard, Admin, Activities, Messages } from "./pages/Dashboard";
import Forums from "./pages/Forums";
import LandingPage from "./pages/LandingPage";
import ExamGeneratorPage from "./pages/ExamGeneratorPage";

const FullscreenManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const enterFullscreen = () => {
      const doc = document.documentElement;
      if (!document.fullscreenElement) {
        if (doc.requestFullscreen) {
          doc.requestFullscreen().catch(() => {});
        }
      }
    };

    document.addEventListener("mousedown", enterFullscreen);
    document.addEventListener("keydown", enterFullscreen);

    return () => {
      document.removeEventListener("mousedown", enterFullscreen);
      document.removeEventListener("keydown", enterFullscreen);
    };
  }, []);

  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <FullscreenManager>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="/activities" element={
                <ProtectedRoute roles={["student", "teacher", "dos", "hm", "examiner", "developer"]}>
                  <Activities />
                </ProtectedRoute>
              } />

              <Route path="/messages" element={
                <ProtectedRoute roles={["student", "teacher", "dos", "hm", "examiner", "publisher", "developer"]}>
                  <Messages />
                </ProtectedRoute>
              } />

              <Route path="/forums" element={
                <ProtectedRoute roles={["teacher", "dos", "hm", "examiner", "publisher", "developer"]}>
                  <Forums />
                </ProtectedRoute>
              } />

              <Route path="/admin" element={
                <ProtectedRoute roles={["dos", "hm", "developer"]}>
                  <Admin />
                </ProtectedRoute>
              } />

              <Route path="/exam-generator" element={
                <ProtectedRoute roles={["teacher", "examiner", "dos", "hm", "developer"]}>
                  <ExamGeneratorPage />
                </ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </FullscreenManager>
      </OfflineProvider>
    </AuthProvider>
  );
}
