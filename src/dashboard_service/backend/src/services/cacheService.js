// backend/src/services/cacheService.js
import BatchCache from "../models/BatchCache.js";
import UserBatchesCache from "../models/UserBatchesCache.js";
import { fetchCompleteBatch, fetchUserBatches } from "./aiService.js";
import { calcProcessedSummary } from "../utils/calcProcessedSummary.js";

// refresh single batch
export const refreshBatchCache = async (batchId, userId) => {
  const completeData = await fetchCompleteBatch(batchId);
  const summary = calcProcessedSummary(completeData);

  const ttlMinutes = parseInt(process.env.BATCH_CACHE_TTL || "30", 10);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const cachedDoc = await BatchCache.findOneAndUpdate(
    { batch_id: batchId },
    {
      batch_id: batchId,
      user_id: userId || completeData.metadata?.user_id || "unknown",
      cached_at: new Date(),
      ttl_expires: expiresAt,
      complete_data: completeData,
      processed_summary: summary
    },
    { upsert: true, new: true }
  );

  console.log(`[CACHE] Refreshed batch ${batchId}`);
  return cachedDoc;
};

// refresh user batches list
export const refreshUserBatchesCache = async (userId, count = 10) => {
  const batches = await fetchUserBatches(userId, count);

  // ✅ если данных нет, создаём пустой список
  const summaries = (batches && batches.length > 0)
    ? batches.map((b) => ({
        batch_id: b.batch_id || b._id || "unknown",
        timestamp: b.metadata?.timestamp || new Date().toISOString(),
        quick_health: b.metadata?.quick_health ?? 1.0,
        anomaly_count: b.metadata?.anomaly_count ?? 0
      }))
    : [];

  const ttlMinutes = parseInt(process.env.USER_BATCHES_CACHE_TTL || "2", 10);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const cachedDoc = await UserBatchesCache.findOneAndUpdate(
    { user_id: userId },
    {
      user_id: userId,
      cached_at: new Date(),
      ttl_expires: expiresAt,
      batches_summary: summaries
    },
    { upsert: true, new: true }
  );

  console.log(`[CACHE] Refreshed user batch list for ${userId} (${summaries.length} batches)`);
  return cachedDoc;
};
