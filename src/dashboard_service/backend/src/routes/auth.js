// backend/src/routes/auth.js
import express from "express";
import { register, login, refresh, logout } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);

// logout обязательно защищаем access токеном
router.post("/logout", authMiddleware(), logout);

export default router;
