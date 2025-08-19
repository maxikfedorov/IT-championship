// backend/src/models/BatchCache.js
import mongoose from "mongoose";

const BatchCacheSchema = new mongoose.Schema({
  batch_id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  cached_at: { type: Date, default: Date.now },
  ttl_expires: { type: Date, index: { expires: 0 } }, // TTL индекс
  complete_data: { type: Object },
  processed_summary: { type: Object }
});

export default mongoose.model("BatchCache", BatchCacheSchema, "batches_cache");
