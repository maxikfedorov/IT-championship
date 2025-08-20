import api from "../api/apiClient";

export default function ControlPanel({ user }) {
  const startPipeline = () => api.post(`/api/pipeline/start/${user.username}`).then(() => alert("Pipeline started"));
  const stopPipeline = () => api.post(`/api/pipeline/stop/${user.username}`).then(() => alert("Pipeline stopped"));
  const startMotor = () => api.post("/api/motor/start").then(() => alert("Motor started"));
  const stopMotor = () => api.post("/api/motor/stop").then(() => alert("Motor stopped"));

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
      <h3>Control Panel</h3>
      <button onClick={startPipeline}>Start Pipeline</button>
      <button onClick={stopPipeline}>Stop Pipeline</button>
      <br /><br />
      <button onClick={startMotor}>Start Motor</button>
      <button onClick={stopMotor}>Stop Motor</button>
    </div>
  );
}
