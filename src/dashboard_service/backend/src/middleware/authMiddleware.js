// backend/src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";

export const authMiddleware = (roles = []) => {
  // roles может быть string или array
  if (typeof roles === "string") roles = [roles];

  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const user = jwt.verify(token, JWT_SECRET);
      req.user = user;

      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (err) {
      console.error("[AUTH] token verify error", err);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
};
