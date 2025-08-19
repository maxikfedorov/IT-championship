// backend/src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // хранится в виде bcrypt hash
  role: { type: String, enum: ["engineer", "admin"], default: "engineer" }
});

export default mongoose.model("User", userSchema);
