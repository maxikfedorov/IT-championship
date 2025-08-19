// frontend/src/components/BatchOverview.jsx
export default function BatchOverview({ summary }) {
  if (!summary) return <div>No summary data</div>;

  return (
    <div>
      <h3>Batch Overview</h3>
      <p>Total Windows: {summary.total_windows}</p>
      <p>Anomaly Windows: {summary.anomaly_windows}</p>
      <h4>Component Health</h4>
      <ul>
        {Object.entries(summary.component_health || {}).map(([comp, v]) => (
          <li key={comp}>
            {comp}: Confidence {v.avg_confidence}, Anomalies {v.anomalies}
          </li>
        ))}
      </ul>
    </div>
  );
}
