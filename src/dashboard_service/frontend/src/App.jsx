// src/dashboard_service/frontend/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import BatchDetailsPage from "./pages/BatchDetailsPage";
import WindowDetailsPage from "./pages/WindowDetailsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RequireAuth from "./components/RequireAuth";
import UserProfile from "./components/UserProfile";
import { useAuthContext } from "./api/AuthContext";

function App() {
  const { user, logout } = useAuthContext();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user
              ? <Navigate to={`/dashboard/${user.username}`} />
              : <LoginPage />
          }
        />

        <Route
          path="/register"
          element={
            user
              ? <Navigate to={`/dashboard/${user.username}`} />
              : <RegisterPage />
          }
        />

        <Route
          path="/dashboard/:user_id"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/details/:user_id/:batch_id"
          element={
            <RequireAuth>
              <BatchDetailsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/details/:user_id/:batch_id/:window_id"
          element={
            <RequireAuth>
              <WindowDetailsPage />
            </RequireAuth>
          }
        />

        {/* по умолчанию */}
        <Route
          path="*"
          element={
            user
              ? <Navigate to={`/dashboard/${user.username}`} />
              : <Navigate to="/login" />
          }
        />
      </Routes>

      {/* Floating User Profile - показывается только на защищенных страницах */}
      {user && (
        <UserProfile user={user} onLogout={logout} />
      )}
    </BrowserRouter>
  );
}

export default App;
