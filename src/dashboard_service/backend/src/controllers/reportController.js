// backend/src/controllers/reportController.js
import UserBatchesCache from "../models/UserBatchesCache.js";
import BatchCache from "../models/BatchCache.js";
import { buildReportResponse } from "../utils/buildReportResponse.js";

export const getUserReport = async (req, res) => {
  const { user_id } = req.params;
  if (req.user.role !== "admin" && req.user.username !== user_id) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const cached = await UserBatchesCache.findOne({ user_id });
    const enrichedBatches = (cached?.batches_summary || []).map((b) => {
      // обогащаем health_status прямо здесь, чтобы PDF и JSON были одинаковые
      const anomalies = b.summary.anomaly_count ?? 0;
      const healthScore = b.summary.health_score;

      let health_status = "Pending";
      if (healthScore === null || healthScore === undefined) {
        health_status = "Pending";
      } else {
        // ✅ ПРАВИЛЬНАЯ логика на основе процентного соотношения
        const healthPercentage = healthScore * 100;
        if (healthPercentage >= 80) health_status = "Healthy";
        else if (healthPercentage >= 40) health_status = "Monitor";
        else health_status = "Critical";
      }

      return {
        batch_id: b.batch_id,
        timestamp: b.timestamp,
        anomaly_count: anomalies,
        health_score: b.summary.health_score,
        health_status,
      };
    });

    const data = {
      type: "dashboard_report",
      user_id,
      cached_at: cached?.cached_at,
      batches: enrichedBatches,
    };
    return buildReportResponse(req, res, "dashboard_report", data);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate dashboard report" });
  }
};

export const getBatchReport = async (req, res) => {
  const { batch_id } = req.params;
  try {
    const batch = await BatchCache.findOne({ batch_id });
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    if (req.user.role !== "admin" && req.user.username !== batch.user_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const timeline =
      batch.complete_data?.autoencoder?.results?.map((w, idx) => ({
        window_index: idx,
        anomaly_count: w.overall?.anomaly_count ?? 0,
        system_health_status: w.overall?.system_health_status || "Unknown",
      })) || [];

    const data = {
      type: "batch_report",
      batch_id,
      user_id: batch.user_id,
      cached_at: batch.cached_at,
      processed_summary: batch.processed_summary, // уже содержит component_health
      timeline,
    };
    return buildReportResponse(req, res, "batch_report", data);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate batch report" });
  }
};

export const getWindowReport = async (req, res) => {
  const { batch_id, window_id } = req.params;
  try {
    const batch = await BatchCache.findOne({ batch_id });
    if (!batch?.complete_data) return res.status(404).json({ error: "Batch not found" });
    if (req.user.role !== "admin" && req.user.username !== batch.user_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const ae = batch.complete_data.autoencoder?.results?.[window_id];
    const lstm = batch.complete_data.dual_lstm?.results?.[0]?.predictions?.find(
      (p) => p.window_index == window_id
    );

    const data = {
      type: "window_report",
      batch_id,
      window_id,
      autoencoder: ae
        ? { overall: ae.overall, components: ae } // полный набор компонентов
        : null,
      attention: ae?.autoencoder_features?.attention_weights || null,
      lstm: lstm
        ? {
          steps: lstm.predictions.steps,
          features: lstm.predictions.features,
          values: lstm.predictions.values,
        }
        : null,
    };
    return buildReportResponse(req, res, "window_report", data);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate window report" });
  }
};
