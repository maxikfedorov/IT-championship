// backend/src/controllers/cacheController.js
import BatchCache from "../models/BatchCache.js";
import { refreshBatchCache } from "../services/cacheService.js";

export const getCacheStats = async (req, res) => {
  try {
    const totalDocs = await BatchCache.countDocuments();
    const latest = await BatchCache.findOne().sort({ cached_at: -1 });

    res.json({
      totalDocs,
      lastCached: latest
        ? { batch_id: latest.batch_id, cached_at: latest.cached_at }
        : null
    });
  } catch (err) {
    console.error("[CACHE] Error", err);
    res.status(500).json({ error: "Cache stats failed" });
  }
};

export const refreshCache = async (req, res) => {
  const { batch_id } = req.params;
  const { user_id } = req.query;

  if (!batch_id) return res.status(400).json({ error: "batch_id required" });

  try {
    const refreshed = await refreshBatchCache(batch_id, user_id);
    res.json({ refreshed: true, batch_id: refreshed.batch_id });
  } catch (err) {
    console.error("[CACHE] Refresh error", err);
    res.status(500).json({ error: "Cache refresh failed" });
  }
};
