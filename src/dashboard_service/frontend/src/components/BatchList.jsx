// frontend/src/components/BatchList.jsx
import { Link } from "react-router-dom";

export default function BatchList({ batches, user_id }) {
  const formatBatchId = (batch_id) => {
    const match = batch_id.match(/batch_(\d+)$/);
    return match ? `Batch #${match[1]}` : batch_id;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleString(); // локально (MSK и т.п.)
  };

  const renderHealth = (score) => {
    if (score === undefined || score === null) {
      return <span style={{ color: "gray" }}>⏳ Pending</span>; // ожидание данных
    }
    if (score >= 0.8) return <span style={{ color: "green" }}>Healthy</span>;
    if (score >= 0.4) return <span style={{ color: "orange" }}>Monitor</span>;
    return <span style={{ color: "red" }}>Critical</span>;
  };

  return (
    <div>
      <h3>Batches</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {batches.map((batch) => (
          <li key={batch.batch_id} style={{ marginBottom: "6px" }}>
            <Link to={`/details/${user_id}/${batch.batch_id}`} style={{ textDecoration: "none", color: "black" }}>
              <b>{formatBatchId(batch.batch_id)}</b> — {formatDate(batch.timestamp)} |{" "}
              Health: {renderHealth(batch.summary?.health_score)} |{" "}
              Anomalies:{" "}
              <span style={{ color: batch.summary?.anomaly_count > 0 ? "red" : "green" }}>
                {batch.summary?.anomaly_count ?? "-"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
