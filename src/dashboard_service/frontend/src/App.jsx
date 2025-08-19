// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import BatchDetailsPage from "./pages/BatchDetailsPage";
import WindowDetailsPage from "./pages/WindowDetailsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RequireAuth from "./components/RequireAuth";
import { useAuth } from "./api/useAuth";

function App() {
  const { user, login, logout } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Логин: если юзер уже есть → кидаем в дашборд */}
        <Route
          path="/login"
          element={
            user ? <Navigate to={`/dashboard/${user.username}`} /> : <LoginPage onLogin={login} />
          }
        />
        
        {/* Регистрация: если юзер уже есть → в дашборд */}
        <Route
          path="/register"
          element={
            user ? <Navigate to={`/dashboard/${user.username}`} /> : <RegisterPage />
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

        {/* по умолчанию → если авторизован в dashboard, иначе на login */}
        <Route
          path="*"
          element={
            user 
              ? <Navigate to={`/dashboard/${user.username}`} /> 
              : <Navigate to="/login" />
          }
        />
      </Routes>

      {user && (
        <div style={{ position: "fixed", bottom: 10, right: 10 }}>
          Logged in as <b>{user.username}</b> ({user.role})
          <button onClick={logout} style={{ marginLeft: "10px" }}>
            Logout
          </button>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
