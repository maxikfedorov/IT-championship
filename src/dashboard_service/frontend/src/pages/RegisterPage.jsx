import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("engineer");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", { username, password, role });
      // После успешной регистрации перекидываем на login
      navigate("/login");
    } catch (err) {
      setError("Registration failed");
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="engineer">Engineer</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">Register</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p>Already have an account? <a href="/login">Login</a></p>
    </div>
  );
}
