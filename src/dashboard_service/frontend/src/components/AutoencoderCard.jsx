// frontend/src/components/AutoencoderCard.jsx
export default function AutoencoderCard({ component, data }) {
  if (!data) return null;

  // Определяем статус
  let status = "Healthy";
  let color = "green";
  if (data.is_anomaly) {
    status = "Critical";
    color = "red";
  } else if (data.confidence_score < 0.7 && data.confidence_score >= 0.3) {
    status = "Monitor";
    color = "orange";
  } else if (data.confidence_score < 0.3) {
    status = "Low Confidence";
    color = "gray";
  }

  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: "6px",
        padding: "10px",
        margin: "10px",
        width: "220px",
        background: "#f8f8f8"
      }}
    >
      <h4 style={{ margin: "0 0 10px 0", textTransform: "capitalize" }}>
        {component} — <span style={{ color }}>{status}</span>
      </h4>
      <p>
        <strong>Error:</strong> {data.reconstruction_error.toFixed(2)}
      </p>
      <p>
        <strong>Confidence:</strong> {(data.confidence_score * 100).toFixed(1)}%
      </p>
      <p>
        <strong>Severity:</strong> {data.anomaly_severity?.toFixed(2)}
      </p>
      <p>
        <strong>Top-3 features:</strong>
        <br />
        <small>{data.top3_features}</small>
      </p>
    </div>
  );
}
