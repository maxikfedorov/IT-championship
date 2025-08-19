// frontend/src/pages/WindowDetailsPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/apiClient";

import AutoencoderCard from "../components/AutoencoderCard";
import AttentionHeatmap from "../components/AttentionHeatmap";
import LSTMPredictionsChart from "../components/LSTMPredictionsChart";
import ComponentHealthMatrix from "../components/ComponentHealthMatrix";

export default function WindowDetailsPage() {
  const { batch_id, window_id } = useParams();
  const [autoencoder, setAutoencoder] = useState(null);
  const [attention, setAttention] = useState(null);
  const [lstm, setLstm] = useState(null);

  useEffect(() => {
    api.get(`/api/batch/${batch_id}/window/${window_id}/autoencoder`)
      .then((res) => setAutoencoder(res.data))
      .catch(() => setAutoencoder(null));

    api.get(`/api/batch/${batch_id}/window/${window_id}/attention`)
      .then((res) => setAttention(res.data.attention_weights))
      .catch(() => setAttention(null));

    api.get(`/api/batch/${batch_id}/window/${window_id}/lstm`)
      .then((res) => setLstm(res.data))
      .catch(() => setLstm(null));
  }, [batch_id, window_id]);

  if (!autoencoder) return <div>Loading...</div>;

  return (
    <div>
      <h2>Window {window_id} (Batch {batch_id})</h2>
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
