import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoUri = `mongodb://${process.env.MONGO_CACHE_USER}:${process.env.MONGO_CACHE_PASSWORD}@${process.env.MONGO_CACHE_HOST}:${process.env.MONGO_CACHE_PORT}/${process.env.MONGO_CACHE_DATABASE}?authSource=admin`;
    
    const conn = await mongoose.connect(mongoUri);
    console.log(`[DB] Connected: ${conn.connection.host}:${conn.connection.port}`);
  } catch (err) {
    console.error("[DB] Connection error:", err.message);
    process.exit(1);
  }
};
