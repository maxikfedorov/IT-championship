// backend/src/controllers/windowController.js
import BatchCache from "../models/BatchCache.js";

// helper: get batch from cache
const getBatchFromCache = async (batch_id) => {
  const batch = await BatchCache.findOne({ batch_id });
  return batch ? batch.complete_data : null;
};

// 1. Автоэнкодер для окна
export const getAutoencoderWindow = async (req, res) => {
  const { batch_id, window_id } = req.params;
  try {
    const data = await getBatchFromCache(batch_id);
    if (!data) return res.json({});

    const window = data.autoencoder?.results?.[window_id];
    if (!window) return res.status(404).json({ error: "Window not found" });

    res.json({
      window_index: window_id,
      overall: window.overall,
      components: {
        bearing: window.bearing,
        rotor: window.rotor,
        stator: window.stator,
        eccentricity: window.eccentricity,
      },
    });
  } catch (err) {
    console.error("[WINDOW] Autoencoder error", err);
    res.status(500).json({ error: "Autoencoder fetch failed" });
  }
};

// 2. Attention
export const getAttentionWindow = async (req, res) => {
  const { batch_id, window_id } = req.params;
  try {
    const data = await getBatchFromCache(batch_id);
    if (!data) return res.json({});

    const window = data.autoencoder?.results?.[window_id];
    if (!window) return res.status(404).json({ error: "Window not found" });

    res.json({
      window_index: window_id,
      attention_weights: window.autoencoder_features?.attention_weights || {},
    });
  } catch (err) {
    console.error("[WINDOW] Attention error", err);
    res.status(500).json({ error: "Attention fetch failed" });
  }
};

// 3. LSTM
export const getLSTMWindow = async (req, res) => {
  const { batch_id, window_id } = req.params;
  try {
    const data = await getBatchFromCache(batch_id);
    if (!data) return res.json({});

    const lstmData = data.dual_lstm?.results?.[0]?.predictions?.find(
      (p) => p.window_index == window_id
    );
    if (!lstmData) return res.status(404).json({ error: "LSTM prediction not found" });

    res.json({
      window_index: window_id,
      steps: lstmData.predictions.steps,
      features: lstmData.predictions.features,
      values: lstmData.predictions.values,
    });
  } catch (err) {
    console.error("[WINDOW] LSTM error", err);
    res.status(500).json({ error: "LSTM fetch failed" });
  }
};

// 4. Timeline
export const getAnomaliesTimeline = async (req, res) => {
  const { batch_id } = req.params;
  try {
    const data = await getBatchFromCache(batch_id);
    if (!data || !data.autoencoder?.results) {
      console.warn(`[WINDOW] No data for timeline ${batch_id}`);
      return res.json({ batch_id, timeline: [], pending: true }); // ⚡ флаг pending
    }

    const timeline = data.autoencoder.results.map((w, idx) => ({
      window_index: idx,
      anomaly_count: w.overall?.anomaly_count ?? 0,
      system_health_status: w.overall?.system_health_status || "Unknown",
    }));

    res.json({ batch_id, timeline, pending: false });
  } catch (err) {
    console.error("[WINDOW] Timeline error", err);
    res.status(500).json({ error: "Timeline fetch failed" });
  }
};
