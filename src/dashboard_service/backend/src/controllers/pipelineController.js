import axios from "axios";

const PIPELINE_API_BASE = process.env.PIPELINE_API_BASE || "http://127.0.0.1:8000";

// получить статус pipeline
export const getPipelineStatus = async (req, res) => {
  const { user_id } = req.params;
  try {
    const r = await axios.get(`${PIPELINE_API_BASE}/streaming/pipeline/status/${user_id}`);
    res.json(r.data);
  } catch (err) {
    console.error("[PIPELINE] status error:", err.message);
    res.status(err.response?.status || 500).json({ error: "Failed to get pipeline status" });
  }
};

// старт pipeline
export const startPipeline = async (req, res) => {
  const { user_id } = req.params;
  try {
    const r = await axios.post(`${PIPELINE_API_BASE}/streaming/pipeline/start/${user_id}`);
    res.json(r.data);
  } catch (err) {
    console.error("[PIPELINE] start error:", err.message);
    res.status(err.response?.status || 500).json({ error: "Failed to start pipeline" });
  }
};

// стоп pipeline
export const stopPipeline = async (req, res) => {
  const { user_id } = req.params;
  try {
    const r = await axios.post(`${PIPELINE_API_BASE}/streaming/pipeline/stop/${user_id}`);
    res.json(r.data);
  } catch (err) {
    console.error("[PIPELINE] stop error:", err.message);
    res.status(err.response?.status || 500).json({ error: "Failed to stop pipeline" });
  }
};
