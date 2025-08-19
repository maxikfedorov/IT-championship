// frontend/src/pages/BatchDetailsPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/apiClient";

import BatchOverview from "../components/BatchOverview";
import WindowSelector from "../components/WindowSelector";
import AnomalyTimeline from "../components/AnomalyTimeline";

export default function BatchDetailsPage() {
  const { user_id, batch_id } = useParams();
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState(null);

  useEffect(() => {
    api.get(`/api/batch/${batch_id}/overview?user_id=${user_id}`).then((res) => {
      setOverview(res.data.processed_summary);
    });
    api.get(`/api/batch/${batch_id}/anomalies/timeline`).then((res) => {
      setTimeline(res.data.timeline);
    });
  }, [batch_id, user_id]);

  if (!overview) return <div>Loading batch data...</div>;

  return (
    <div>
      <h2>Batch {batch_id} Details</h2>
      <BatchOverview summary={overview} />
      <WindowSelector
        totalWindows={overview.total_windows}
        user_id={user_id}
        batch_id={batch_id}
      />
      <AnomalyTimeline timeline={timeline} />
    </div>
  );
}
