// frontend/src/components/ComponentHealthMatrix.jsx
export default function ComponentHealthMatrix({ components }) {
  if (!components) return null;
  return (
    <div>
      <h4>Component Health Matrix</h4>
      <table border="1" cellPadding="3">
        <thead>
          <tr>
            <th>Component</th>
            <th>Error</th>
            <th>Anomaly</th>
            <th>Confidence</th>
            <th>Attention</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(components).map(([comp, v]) => (
            <tr key={comp}>
              <td>{comp}</td>
              <td>{v.reconstruction_error}</td>
              <td>{v.is_anomaly ? "Yes" : "No"}</td>
              <td>{v.confidence_score}</td>
              <td>{v.attention_focus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
