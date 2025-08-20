// frontend/src/pages/BatchDetailsPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/apiClient";

import BatchOverview from "../components/BatchOverview";
import WindowSelector from "../components/WindowSelector";
import AnomalyTimeline from "../components/AnomalyTimeline";
import Breadcrumbs from "../components/Breadcrumbs";

export default function BatchDetailsPage() {
  const { user_id, batch_id } = useParams();
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [pending, setPending] = useState(false);

  // функция загрузки таймлайна
  const fetchTimeline = () => {
    api.get(`/api/batch/${batch_id}/anomalies/timeline`)
      .then((res) => {
        setTimeline(res.data.timeline || []);
        setPending(res.data.pending || false);
      })
      .catch(() => {
        setTimeline(null);
        setPending(false);
      });
  };

  useEffect(() => {
    // грузим overview
    api.get(`/api/batch/${batch_id}/overview?user_id=${user_id}`)
      .then((res) => setOverview(res.data.processed_summary))
      .catch(() => setOverview(null));

    // стартовый запрос timeline
    fetchTimeline();
  }, [batch_id, user_id]);

  // авто-повтор, если pending = true
  useEffect(() => {
    if (pending) {
      const t = setTimeout(fetchTimeline, 2000); // повтор через 2с
      return () => clearTimeout(t);
    }
  }, [pending]);

  if (!overview) return <div>Loading batch data...</div>;

  return (
    <div>
      <Breadcrumbs />
      <h2>Batch {batch_id} Details</h2>
      <BatchOverview summary={overview} />
      <WindowSelector
        totalWindows={overview.total_windows}
        user_id={user_id}
        batch_id={batch_id}
      />
      {timeline && (
        <AnomalyTimeline
          timeline={timeline}
          pending={pending}
          onReload={fetchTimeline}
        />
      )}
    </div>
  );
}
