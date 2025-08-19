// backend/src/services/aiService.js
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

export const fetchCompleteBatch = async (batchId) => {
  const url = `${AI_SERVICE_URL}/batches/${batchId}/complete`;
  const { data } = await axios.get(url);
  console.log(`[AI_SERVICE] Loaded complete batch ${batchId}`);
  return data;
};

export const fetchUserBatches = async (userId, count = 10) => {
  const url = `${AI_SERVICE_URL}/batches/user/${userId}/recent?count=${count}`;
  const { data } = await axios.get(url);

  if (!data.batches) {
    console.warn(`[AI_SERVICE] No batches[] key in response`);
    return [];
  }

  console.log(`[AI_SERVICE] Loaded ${data.actual_count} batches for ${userId}`);
  return data.batches; // ✅ теперь точно массив
};
