// frontend/src/components/BatchList.jsx
export default function BatchList({ batches, user_id }) {
  return (
    <div>
      <h3>Batch List</h3>
      <ul>
        {batches.map((b) => (
          <li key={b.batch_id}>
            <a href={`/details/${user_id}/${b.batch_id}`}>
              {b.batch_id} | Health: {b.quick_health} | Anomalies: {b.anomaly_count}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
