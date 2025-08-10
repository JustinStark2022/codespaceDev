// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";

/** Shape of the user payload we expect inside the JWT */
export interface AuthUser {
  id: number;
  role: string;
  email?: string;
}

/** Request type extended with decoded user */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/** Pull a JWT from Authorization header or common cookie names */
function extractToken(req: Request): string | null {
  // Header: Authorization: Bearer <token>
  const auth = req.header("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }

  // Cookies (requires cookie-parser to be mounted in server.ts)
  const cookies: Record<string, string | undefined> = (req as any).cookies || {};
  return cookies.token || cookies.jwt || null;
}

/** Strict auth: requires a valid token, attaches decoded user to req.user */
export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET not configured");
      return res.status(500).json({ error: "Authentication configuration error" });
    }

    const decoded = jwt.verify(token, jwtSecret) as AuthUser;

    // Basic payload sanity check
    if (!decoded || typeof decoded !== "object" || decoded.id == null || !decoded.role) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    req.user = {
      id: Number(decoded.id),
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error: any) {
    if (error?.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }

    logger.error("Token verification failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Optional, for local development:
 * If you want to bypass auth in dev, set USE_MOCK_AUTH=true in your .env
 * and mount mockAuth instead of verifyToken on routes you’re testing.
 */
export const mockAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  req.user = {
    id: 1,
    role: "parent",
    email: "test@example.com",
  };
  next();
};