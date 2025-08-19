// frontend/src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import api from "../api/apiClient";
import BatchList from "../components/BatchList";

export default function DashboardPage() {
  const { user_id } = useParams();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const localUser = JSON.parse(localStorage.getItem("user") || "{}");

  // запрещаем чужие дашборды
  if (!localUser.username || localUser.username !== user_id) {
    return <Navigate to={`/dashboard/${localUser.username}`} replace />;
  }

  useEffect(() => {
    api
      .get(`/dashboard/${user_id}?count=5&refresh=true`)
      .then((res) => {
        setBatches(res.data.batches || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load batches");
        setLoading(false);
      });
  }, [user_id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div>
      <h1>Dashboard — {user_id}</h1>
      {batches.length > 0 ? (
        <BatchList batches={batches} user_id={user_id} />
      ) : (
        <p>No batches found for this user.</p>
      )}
    </div>
  );
}
