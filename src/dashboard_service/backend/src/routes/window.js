// backend/src/routes/window.js
import express from "express";
import {
  getAutoencoderWindow,
  getAttentionWindow,
  getLSTMWindow,
  getAnomaliesTimeline
} from "../controllers/windowController.js";

const router = express.Router();

router.get("/:batch_id/window/:window_id/autoencoder", getAutoencoderWindow);
router.get("/:batch_id/window/:window_id/attention", getAttentionWindow);
router.get("/:batch_id/window/:window_id/lstm", getLSTMWindow);
router.get("/:batch_id/anomalies/timeline", getAnomaliesTimeline);

export default router;
