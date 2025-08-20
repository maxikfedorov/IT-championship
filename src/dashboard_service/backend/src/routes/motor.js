import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getMotorStatus, startMotor, stopMotor } from "../controllers/motorController.js";

const router = express.Router();

router.get("/status", authMiddleware(), getMotorStatus);
router.post("/start", authMiddleware(), startMotor); // доступно и engineer
router.post("/stop", authMiddleware(), stopMotor);

export default router;
