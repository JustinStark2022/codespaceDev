// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";
221
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    email?: string;
  };
}

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET not configured");
      return res.status(500).json({ error: "Authentication configuration error" });
    }

    const decoded = jwt.verify(token, jwtSecret) as { id: number; role: string; email?: string };
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }

    logger.error("Token verification failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mock middleware for development/testing
export const mockAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  req.user = {
    id: 1,
    role: "parent",
    email: "test@example.com",
  };
  next();
};
