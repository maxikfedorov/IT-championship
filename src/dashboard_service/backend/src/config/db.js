// backend/src/config/db.js
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL, {
      dbName: process.env.MONGO_DATABASE || "dashboard_cache"
    });
    console.log(`[DB] Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("[DB] Connection error", err);
    process.exit(1);
  }
};
