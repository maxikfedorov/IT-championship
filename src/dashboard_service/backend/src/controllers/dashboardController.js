// backend/src/controllers/dashboardController.js
import UserBatchesCache from "../models/UserBatchesCache.js";
import { refreshUserBatchesCache } from "../services/cacheService.js";

export const getDashboard = async (req, res) => {
  const { user_id } = req.params;
  const { count = 10, refresh = "false" } = req.query;

  try {
    let cached = await UserBatchesCache.findOne({ user_id });

    if (!cached || refresh === "true") {
      cached = await refreshUserBatchesCache(user_id, count);
    }

    // если так и не появилось — возвращаем пустой список
if (!cached || !cached.batches_summary) {
  return res.json({
    user_id,
    batches: [],
    cached_at: null
  });
}


    res.json({
      user_id,
      batches: cached.batches_summary || [],
      cached_at: cached.cached_at || null
    });
  } catch (err) {
    console.error("[DASHBOARD] Error", err);
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
};
