// backend/src/routes/dashboard.js
import express from "express";
import { getDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/:user_id", getDashboard);

export default router;
