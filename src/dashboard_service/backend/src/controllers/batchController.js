// backend/src/controllers/batchController.js
import BatchCache from "../models/BatchCache.js";
import { refreshBatchCache } from "../services/cacheService.js";

export const getBatchOverview = async (req, res) => {
  const { batch_id } = req.params;
  const { user_id, refresh = "false" } = req.query;

  if (!batch_id) return res.status(400).json({ error: "batch_id required" });

  try {
    let batch = await BatchCache.findOne({ batch_id });

    if (!batch || refresh === "true") {
      batch = await refreshBatchCache(batch_id, user_id);
    }

    res.json({
      batch_id,
      user_id: batch.user_id,
      cached_at: batch.cached_at,
      processed_summary: batch.processed_summary
    });
  } catch (err) {
    console.error("[BATCH] Overview error", err);
    res.status(500).json({ error: "Batch overview failed" });
  }
};
