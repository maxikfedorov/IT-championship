// backend/src/controllers/authController.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";
const JWT_EXPIRES_IN = "30m"; // access token живет 30 минут

// Registration
export const register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashed, role: role || "engineer" });
    await newUser.save();

    res.json({ message: "User registered", user: { username, role: newUser.role } });
  } catch (err) {
    console.error("[AUTH] register error", err);
    res.status(500).json({ error: "Registration failed" });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid username or password" });

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error("[AUTH] login error", err);
    res.status(500).json({ error: "Login failed" });
  }
};
