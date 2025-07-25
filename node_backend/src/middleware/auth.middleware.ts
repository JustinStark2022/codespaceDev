// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "@/utils/logger";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    email?: string;
  };
}

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET not configured");
      return res.status(500).json({ error: "Authentication configuration error" });
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = {
      id: decoded.id || decoded.userId,
      role: decoded.role || "user",
      email: decoded.email
    };

    next();
  } catch (error) {
    logger.error("Token verification failed:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Mock middleware for development/testing
export const mockAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Mock user for testing
  req.user = {
    id: 1,
    role: "parent",
    email: "test@example.com"
  };
  next();
};
      role: user.role,
      username: user.username
    };

    next();
  } catch (err: any) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    
    logger.error(err, "Error in auth middleware");
    return res.status(500).json({ message: "Internal server error" });
  }
};
