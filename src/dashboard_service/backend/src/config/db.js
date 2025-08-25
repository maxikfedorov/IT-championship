// src/config/db.js
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // Определяем порт в зависимости от окружения
    const isDocker = process.env.DOCKER_ENV === 'true' || process.env.ENVIRONMENT === 'docker';
    const port = isDocker ? '27017' : process.env.MONGO_CACHE_PORT; // В Docker всегда 27017
    
    const mongoUri = `mongodb://${process.env.MONGO_CACHE_USER}:${process.env.MONGO_CACHE_PASSWORD}@${process.env.MONGO_CACHE_HOST}:${port}/${process.env.MONGO_CACHE_DATABASE}?authSource=admin`;
    
    console.log(`[DB] Connecting to: ${process.env.MONGO_CACHE_HOST}:${port}`);
    
    const conn = await mongoose.connect(mongoUri);
    console.log(`[DB] Connected: ${conn.connection.host}:${conn.connection.port}`);
  } catch (err) {
    console.error("[DB] Connection error:", err.message);
    process.exit(1);
  }
};
