import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import redisClient from "../config/redisClient.js";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30m";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// helper to create tokens
const generateTokens = (user) => {
  const payload = { userId: user._id, username: user.username, role: user.role };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
};

// save refresh token in Redis
const storeRefreshToken = async (userId, refreshToken) => {
  // "refresh:<userId>" = refreshToken with 7 days TTL
  await redisClient.setEx(`refresh:${userId}`, 60 * 60 * 24 * 7, refreshToken);
};

// Register
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

    const { accessToken, refreshToken } = generateTokens(newUser);
    await storeRefreshToken(newUser._id.toString(), refreshToken);

    res.json({
      message: "User registered",
      user: { username, role: newUser.role },
      accessToken,
      refreshToken
    });
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

    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user._id.toString(), refreshToken);

    res.json({ accessToken, refreshToken, user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error("[AUTH] login error", err);
    res.status(500).json({ error: "Login failed" });
  }
};

// Refresh
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    console.log("[AUTH] got refreshToken from client:", refreshToken); // DEBUG

    if (!refreshToken) return res.status(401).json({ error: "No refresh token provided" });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    console.log("[AUTH] decoded refresh payload:", decoded); // DEBUG

    const storedToken = await redisClient.get(`refresh:${decoded.userId}`);
    console.log("[AUTH] stored refresh in Redis:", storedToken); // DEBUG

    if (!storedToken || storedToken !== refreshToken) {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    const payload = { userId: decoded.userId, username: decoded.username, role: decoded.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({ accessToken });
  } catch (err) {
    console.error("[AUTH] refresh error", err);
    res.status(403).json({ error: "Invalid refresh token" });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const { userId } = req.user; // берем из access токена
    await redisClient.del(`refresh:${userId}`);
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("[AUTH] logout error", err);
    res.status(500).json({ error: "Logout failed" });
  }
};
