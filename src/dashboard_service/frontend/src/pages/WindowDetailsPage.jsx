// src/dashboard_service/frontend/src/pages/WindowDetailsPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/apiClient";

import AutoencoderCard from "../components/AutoencoderCard";
import AttentionHeatmap from "../components/AttentionHeatmap";
import LSTMPredictionsChart from "../components/LSTMPredictionsChart";
import ComponentHealthMatrix from "../components/ComponentHealthMatrix";
import Breadcrumbs from "../components/Breadcrumbs";

export default function WindowDetailsPage() {
  const { batch_id, window_id } = useParams();
  const [autoencoder, setAutoencoder] = useState(null);
  const [attention, setAttention] = useState(null);
  const [lstm, setLstm] = useState(null);

  useEffect(() => {
    api
      .get(`/api/batch/${batch_id}/window/${window_id}/autoencoder`)
      .then((res) => setAutoencoder(res.data))
      .catch(() => setAutoencoder(null));

    api
      .get(`/api/batch/${batch_id}/window/${window_id}/attention`)
      .then((res) => setAttention(res.data.attention_weights))
      .catch(() => setAttention(null));

    api
      .get(`/api/batch/${batch_id}/window/${window_id}/lstm`)
      .then((res) => setLstm(res.data))
      .catch(() => setLstm(null));
  }, [batch_id, window_id]);

  const downloadReport = (format) => {
    api
      .get(`/report/batch/${batch_id}/window/${window_id}?format=${format}`, { responseType: "blob" })
      .then((res) => {
        const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", `batch_${batch_id}_window_${window_id}.${format}`);
        document.body.appendChild(link);
        link.click();
      })
      .catch((err) => console.error("Report download failed", err));
  };

  if (!autoencoder) return <div>Loading...</div>;

  return (
    <div>
      <Breadcrumbs />
      <h2>Window {window_id} (Batch {batch_id})</h2>

      <div style={{ margin: "10px 0" }}>
        <button onClick={() => downloadReport("json")}>
          Download Window Report (JSON)
        </button>
        <button onClick={() => downloadReport("pdf")} style={{ marginLeft: "10px" }}>
          Download Window Report (PDF)
        </button>
      </div>

      <h3>System status: {autoencoder.overall.system_health_status}</h3>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {Object.entries(autoencoder.components).map(([comp, v]) => (
          <AutoencoderCard key={comp} component={comp} data={v} />
        ))}
      </div>

      <ComponentHealthMatrix components={autoencoder.components} />

      {attention ? (
        <AttentionHeatmap attention={attention} />
      ) : (
        <p>No attention weights.</p>
      )}

      {lstm ? (
        <LSTMPredictionsChart lstm={lstm} />
      ) : (
        <p>No LSTM predictions available.</p>
      )}
    </div>
  );
}
