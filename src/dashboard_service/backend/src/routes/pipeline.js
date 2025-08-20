import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getPipelineStatus, startPipeline, stopPipeline } from "../controllers/pipelineController.js";

const router = express.Router();

router.get("/status/:user_id", authMiddleware(), getPipelineStatus);
router.post("/start/:user_id", authMiddleware(), startPipeline);  // было только admin
router.post("/stop/:user_id", authMiddleware(), stopPipeline);   // было только admin

export default router;
