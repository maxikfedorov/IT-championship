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
      processed_summary: summary,
    },
    { upsert: true, new: true }
  );

  console.log(`[CACHE] Refreshed batch ${batchId}`);
  return cachedDoc;
};

// Утилита: считаем health на основе processed_summary
function deriveHealthScore(processed) {
  if (!processed) return { health_score: null, anomaly_count: null };

  const anomalyCount = processed.anomaly_windows ?? 0;
  const avgError = processed.avg_reconstruction_error ?? 0;

  let healthScore = 1.0;
  if (anomalyCount > 0) healthScore = 0.3;
  else if (avgError > 0.5) healthScore = 0.5;
  else healthScore = 0.9;

  return { health_score: healthScore, anomaly_count: anomalyCount };
}

// refresh user batches list
export const refreshUserBatchesCache = async (userId, count = 10) => {
  const batches = await fetchUserBatches(userId, count);

  const summaries = (batches && batches.length > 0)
    ? await Promise.all(
        batches.map(async (b) => {
          const batchId = b.batch_id || b._id || "unknown";

          // смотрим кеш по батчу
          const cached = await BatchCache.findOne({ batch_id: batchId });

          let health, anomalyCount;
          if (cached && cached.processed_summary) {
            const derived = deriveHealthScore(cached.processed_summary);
            health = derived.health_score;
            anomalyCount = derived.anomaly_count;
          } else {
            // fallback на metadata
            health = b.metadata?.quick_health ?? null;
            anomalyCount = b.metadata?.anomaly_count ?? 0;
          }

          return {
            batch_id: batchId,
            timestamp: b.created_at || b.metadata?.timestamp || b.timestamp || new Date().toISOString(),

            summary: {
              health_score: health,
              anomaly_count: anomalyCount,
            },
          };
        })
      )
    : [];

  const ttlMinutes = parseInt(process.env.USER_BATCHES_CACHE_TTL || "2", 10);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const cachedDoc = await UserBatchesCache.findOneAndUpdate(
    { user_id: userId },
    {
      user_id: userId,
      cached_at: new Date(),
      ttl_expires: expiresAt,
      batches_summary: summaries,
    },
    { upsert: true, new: true }
  );

  console.log(
    `[CACHE] Refreshed user batch list for ${userId} (${summaries.length} batches)`
  );
  return cachedDoc;
};
