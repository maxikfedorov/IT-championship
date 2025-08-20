// src\dashboard_service\frontend\src\pages\DashboardPage.jsx

import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import api from "../api/apiClient";
import BatchList from "../components/BatchList";
import SystemHealthPanel from "../components/SystemHealthPanel";
import ControlPanel from "../components/ControlPanel";

export default function DashboardPage() {
  const { user_id } = useParams();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batchCount, setBatchCount] = useState(10); // ⚡ по умолчанию показываем 10

  const localUser = JSON.parse(localStorage.getItem("user") || "{}");

  if (!localUser.username || localUser.username !== user_id) {
    return <Navigate to={`/dashboard/${localUser.username}`} replace />;
  }

  const fetchBatches = () => {
    api
      .get(`/dashboard/${user_id}?count=${batchCount}&refresh=true`)
      .then((res) => {
        setBatches(res.data.batches || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load batches");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 60000); // обновление раз в минуту
    return () => clearInterval(interval);
  }, [user_id, batchCount]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div>
      <h1>Dashboard — {user_id}</h1>
      <SystemHealthPanel user={localUser} />
      <ControlPanel user={localUser} />

      {/* ⚡ Выбор лимита */}
      <div style={{ margin: "10px 0" }}>
        <label>Show last: </label>
        <select value={batchCount} onChange={(e) => setBatchCount(Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span> batches</span>
      </div>

      {batches.length > 0 ? (
        <BatchList batches={batches} user_id={user_id} />
      ) : (
        <p>No batches found for this user.</p>
      )}
    </div>
  );
}
