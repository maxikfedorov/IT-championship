// backend/src/routes/report.js
import express from "express";
import {
  getUserReport,
  getBatchReport,
  getWindowReport,
} from "../controllers/reportController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // <-- правильный импорт

const router = express.Router();

// теперь вызываем authMiddleware() без аргументов (любой авторизованный доступ)
router.get("/dashboard/:user_id", authMiddleware(), getUserReport);
router.get("/batch/:batch_id", authMiddleware(), getBatchReport);
router.get("/batch/:batch_id/window/:window_id", authMiddleware(), getWindowReport);

export default router;
