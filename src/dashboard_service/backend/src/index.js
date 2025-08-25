// src\dashboard_service\backend\src\index.js

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";

import batchRoutes from "./routes/batch.js";
import windowRoutes from "./routes/window.js";
import authRoutes from "./routes/auth.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import cacheRoutes from "./routes/cache.js";
import motorRoutes from "./routes/motor.js";
import dashboardRoutes from "./routes/dashboard.js";
import pipelineRoutes from "./routes/pipeline.js";
import reportRoutes from "./routes/report.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const app = express();

// middlewares
app.use(express.json());
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000', 
    'http://localhost:5173', // Vite dev server
    'http://127.0.0.1:5173',
    'http://localhost:8010',
    'http://127.0.0.1:8010'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

app.use(morgan("dev"));

// routes
app.use("/auth", authRoutes);
app.use("/api/batch", batchRoutes);
app.use("/api/batch", windowRoutes);
app.use("/api/motor", motorRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/cache", authMiddleware("admin"), cacheRoutes);
app.use("/report", reportRoutes);
app.use("/dashboard", authMiddleware(["engineer", "admin"]), dashboardRoutes);

app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

const PORT = process.env.DASHBOARD_PORT || 8010;
const HOST = process.env.DASHBOARD_HOST || "0.0.0.0";

connectDB().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`[SERVER] Dashboard backend running at http://${HOST}:${PORT}`);
  });
});
