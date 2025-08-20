// backend/src/controllers/reportController.js
import { getDashboard } from "./dashboardController.js";
import { getBatchOverview } from "./batchController.js";
import { getAutoencoderWindow, getAttentionWindow, getLSTMWindow } from "./windowController.js";
import { getAnomaliesTimeline } from "./windowController.js";
import UserBatchesCache from "../models/UserBatchesCache.js";
import BatchCache from "../models/BatchCache.js";

// -------- Dashboard Report --------
export const getUserReport = async (req, res) => {
  const { user_id } = req.params;
  try {
    // reuse cache directly
    const cached = await UserBatchesCache.findOne({ user_id });
    if (!cached) {
      return res.json({ user_id, batches: [], cached_at: null });
    }

    res.json({
      type: "dashboard_report",
      user_id,
      cached_at: cached.cached_at,
      batches: cached.batches_summary || [],
    });
  } catch (err) {
    console.error("[REPORT] Dashboard report error", err);
    res.status(500).json({ error: "Failed to generate dashboard report" });
  }
};

// -------- Batch Report --------
export const getBatchReport = async (req, res) => {
  const { batch_id } = req.params;
  try {
    const batch = await BatchCache.findOne({ batch_id });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // timeline из complete_data
    const timeline = batch.complete_data?.autoencoder?.results?.map((w, idx) => ({
      window_index: idx,
      anomaly_count: w.overall?.anomaly_count ?? 0,
      system_health_status: w.overall?.system_health_status || "Unknown",
    })) || [];

    res.json({
      type: "batch_report",
      batch_id,
      user_id: batch.user_id,
      cached_at: batch.cached_at,
      processed_summary: batch.processed_summary,
      timeline,
    });
  } catch (err) {
    console.error("[REPORT] Batch report error", err);
    res.status(500).json({ error: "Failed to generate batch report" });
  }
};

// -------- Window Report --------
export const getWindowReport = async (req, res) => {
  const { batch_id, window_id } = req.params;
  try {
    const batch = await BatchCache.findOne({ batch_id });
    if (!batch?.complete_data) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const ae = batch.complete_data.autoencoder?.results?.[window_id];
    const lstm = batch.complete_data.dual_lstm?.results?.[0]?.predictions?.find(
      (p) => p.window_index == window_id
    );

    res.json({
      type: "window_report",
      batch_id,
      window_id,
      autoencoder: ae
        ? {
            overall: ae.overall,
            components: {
              bearing: ae.bearing,
              rotor: ae.rotor,
              stator: ae.stator,
              eccentricity: ae.eccentricity,
            },
          }
        : null,
      attention: ae?.autoencoder_features?.attention_weights || null,
      lstm: lstm
        ? {
            steps: lstm.predictions.steps,
            features: lstm.predictions.features,
            values: lstm.predictions.values,
          }
        : null,
    });
  } catch (err) {
    console.error("[REPORT] Window report error", err);
    res.status(500).json({ error: "Failed to generate window report" });
  }
};
