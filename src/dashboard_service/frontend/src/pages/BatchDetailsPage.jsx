// src/dashboard_service/frontend/src/pages/BatchDetailsPage.jsx
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

  const fetchTimeline = () => {
    api
      .get(`/api/batch/${batch_id}/anomalies/timeline`)
      .then((res) => {
        setTimeline(res.data.timeline || []);
        setPending(res.data.pending || false);
      })
      .catch(() => {
        setTimeline(null);
        setPending(false);
      });
  };

  const downloadReport = (format) => {
    api
      .get(`/report/batch/${batch_id}?format=${format}`, { responseType: "blob" })
      .then((res) => {
        const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", `batch_${batch_id}.${format}`);
        document.body.appendChild(link);
        link.click();
      })
      .catch((err) => console.error("Report download failed", err));
  };

  useEffect(() => {
    api
      .get(`/api/batch/${batch_id}/overview?user_id=${user_id}`)
      .then((res) => setOverview(res.data.processed_summary))
      .catch(() => setOverview(null));

    fetchTimeline();
  }, [batch_id, user_id]);

  useEffect(() => {
    if (pending) {
      const t = setTimeout(fetchTimeline, 2000);
      return () => clearTimeout(t);
    }
  }, [pending]);

  if (!overview) return <div>Loading batch data...</div>;

  return (
    <div>
      <Breadcrumbs />
      <h2>Batch {batch_id} Details</h2>

      <div style={{ margin: "10px 0" }}>
        <button onClick={() => downloadReport("json")}>
          Download Batch Report (JSON)
        </button>
        <button onClick={() => downloadReport("pdf")} style={{ marginLeft: "10px" }}>
          Download Batch Report (PDF)
        </button>
      </div>

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
