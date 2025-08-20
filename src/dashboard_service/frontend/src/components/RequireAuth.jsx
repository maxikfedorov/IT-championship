// frontend/src/components/RequireAuth.jsx
import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }) {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
