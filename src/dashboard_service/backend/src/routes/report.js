// backend/src/routes/report.js
import express from "express";
import {
  getUserReport,
  getBatchReport,
  getWindowReport,
} from "../controllers/reportController.js";

const router = express.Router();

router.get("/dashboard/:user_id", getUserReport);
router.get("/batch/:batch_id", getBatchReport);
router.get("/batch/:batch_id/window/:window_id", getWindowReport);

export default router;
