// src/dashboard_service/frontend/src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import api from "../api/apiClient";
import BatchList from "../components/BatchList";
import SystemHealthPanel from "../components/SystemHealthPanel";
import ControlPanel from "../components/ControlPanel";
import { useAuthContext } from "../api/AuthContext";

export default function DashboardPage() {
  const { user_id } = useParams();
  const { user } = useAuthContext();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batchCount, setBatchCount] = useState(10);

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

  const downloadReport = (format) => {
    api
      .get(`/report/dashboard/${user_id}?format=${format}`, { responseType: "blob" })
      .then((res) => {
        const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", `dashboard_${user_id}.${format}`);
        document.body.appendChild(link);
        link.click();
      })
      .catch((err) => console.error("Report download failed", err));
  };

  // <-- хуки должны всегда быть вызваны одинаково
  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 60000);
    return () => clearInterval(interval);
  }, [user_id, batchCount]);

  // теперь условный Navigate ниже по дереву и не мешает хукам
  if (!user || user.username !== user_id) {
    return <Navigate to={`/dashboard/${user?.username || ""}`} replace />;
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div>
      <h1>Dashboard — {user_id}</h1>
      <SystemHealthPanel user={user} />
      <ControlPanel user={user} />

      <div style={{ margin: "10px 0" }}>
        <button onClick={() => downloadReport("json")}>
          Download Dashboard Report (JSON)
        </button>
        <button onClick={() => downloadReport("pdf")} style={{ marginLeft: "10px" }}>
          Download Dashboard Report (PDF)
        </button>
      </div>

      <div style={{ margin: "10px 0" }}>
        <label>Show last: </label>
        <select
          value={batchCount}
          onChange={(e) => setBatchCount(Number(e.target.value))}
        >
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
