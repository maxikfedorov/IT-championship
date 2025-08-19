// backend/src/routes/cache.js
import express from "express";
import { getCacheStats, refreshCache } from "../controllers/cacheController.js";

const router = express.Router();

router.get("/stats", getCacheStats);
router.post("/refresh/:batch_id", refreshCache);

export default router;
