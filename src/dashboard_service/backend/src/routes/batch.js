// backend/src/routes/batch.js
import express from "express";
import { getBatchOverview } from "../controllers/batchController.js";

const router = express.Router();

router.get("/:batch_id/overview", getBatchOverview);

export default router;
