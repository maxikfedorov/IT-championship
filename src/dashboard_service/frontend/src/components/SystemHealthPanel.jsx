// src\dashboard_service\frontend\src\components\SystemHealthPanel.jsx

import { useEffect, useState } from "react";
import api from "../api/apiClient";

export default function SystemHealthPanel({ user }) {
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [motorStatus, setMotorStatus] = useState(null);

  const fetchStatuses = () => {
    api.get(`/api/pipeline/status/${user.username}`)
      .then(r => setPipelineStatus(r.data))
      .catch(() => setPipelineStatus({ status: "error" }));

    api.get("/api/motor/status")
      .then(r => setMotorStatus(r.data))
      .catch(() => setMotorStatus({ status: "error" }));
  };

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000); // автообновление каждые 5 сек
    return () => clearInterval(interval);
  }, [user.username]);

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
      <h3>System Health (auto-refresh 5s)</h3>
      <p>Pipeline: {JSON.stringify(pipelineStatus)}</p>
      <p>Motor: {JSON.stringify(motorStatus)}</p>
      <button onClick={fetchStatuses}>🔄 Refresh Now</button>
    </div>
  );
}
