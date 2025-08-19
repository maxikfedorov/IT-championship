// frontend/src/components/RedirectIfAuth.jsx
import { Navigate } from "react-router-dom";

export default function RedirectIfAuth({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");

  if (token && user?.username) {
    return <Navigate to={`/dashboard/${user.username}`} replace />;
  }
  return children;
}
