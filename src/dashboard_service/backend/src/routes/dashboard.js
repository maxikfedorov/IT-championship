// backend/src/routes/dashboard.js
import express from "express";
import { getDashboard, getMotorHealthOverview } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/:user_id", getDashboard);
router.get("/:user_id/motor-health", getMotorHealthOverview); // ✨ НОВЫЙ

export default router;
