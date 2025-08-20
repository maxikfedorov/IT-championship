// backend/src/index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./config/db.js";

import batchRoutes from "./routes/batch.js";
import windowRoutes from "./routes/window.js";

import authRoutes from "./routes/auth.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
// Пример: защищаем страницу кэша (только admin)
import cacheRoutes from "./routes/cache.js";
import motorRoutes from "./routes/motor.js";
// Для engineer разрешаем:
import dashboardRoutes from "./routes/dashboard.js";
import pipelineRoutes from "./routes/pipeline.js";

dotenv.config({ path: ".env.backend" });

const app = express();

// middlewares
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.use("/auth", authRoutes);

app.use("/api/batch", batchRoutes);
app.use("/api/batch", windowRoutes);
app.use("/api/motor", motorRoutes);
app.use("/api/pipeline", pipelineRoutes);

app.use("/api/cache", authMiddleware("admin"), cacheRoutes);


app.use("/dashboard", authMiddleware(["engineer", "admin"]), dashboardRoutes);

// test route
app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

// connect db and start server
const PORT = process.env.DASHBOARD_PORT || 8010;
const HOST = process.env.DASHBOARD_HOST || "0.0.0.0";

connectDB().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`[SERVER] Dashboard backend running at http://${HOST}:${PORT}`);
  });
});
