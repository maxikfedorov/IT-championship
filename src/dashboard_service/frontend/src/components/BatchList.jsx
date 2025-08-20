// frontend/src/components/BatchList.jsx
import { Link } from "react-router-dom";

export default function BatchList({ batches, user_id }) {
  return (
    <div>
      <h3>Batches</h3>
      <ul>
        {batches.map((batch) => (
          <li key={batch.batch_id}>
            <Link to={`/details/${user_id}/${batch.batch_id}`}>
              {batch.batch_id} | Health: {batch.summary?.health_score ?? "-"} | Anomalies: {batch.summary?.anomaly_count ?? 0}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
