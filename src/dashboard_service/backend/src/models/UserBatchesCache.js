// backend/src/models/UserBatchesCache.js
import mongoose from "mongoose";

const UserBatchesCacheSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  cached_at: { type: Date, default: Date.now },
  ttl_expires: { type: Date, index: { expires: 0 } },
  batches_summary: { type: Array, default: [] }
});

export default mongoose.model(
  "UserBatchesCache",
  UserBatchesCacheSchema,
  "user_batches_cache"
);
