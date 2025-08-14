import type { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser"; // make sure server.ts uses this middleware
import jwt from "jsonwebtoken";
import logger from "@/utils/logger";

// If you already have token helpers, you can keep them;
// otherwise we verify directly here for clarity.
const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET missing. Add it to your env.");
}

export interface AuthPayload {
  id: number;
  role: string;
}

export interface AuthedRequest extends Request {
  user?: AuthPayload;
}

function extractToken(req: Request): string | null {
  // 1) Authorization header
  const auth = req.headers.authorization;
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice("bearer ".length).trim();
  }

  // 2) Cookie named "token"
  // (Make sure app.use(cookieParser()) is added in server.ts)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  const tokenCookie = (req.cookies && req.cookies.token) || null;
  if (typeof tokenCookie === "string" && tokenCookie.length > 0) {
    return tokenCookie;
  }

  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      logger.warn("Auth missing: no token presented");
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload | any;
    if (!decoded || typeof decoded.id !== "number") {
      logger.warn("Auth invalid: decoded token missing 'id'");
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = { id: decoded.id, role: decoded.role || "parent" };
    return next();
  } catch (err: any) {
    logger.warn("Auth verify failed", { error: err?.message });
    return res.status(401).json({ message: "Unauthorized" });
  }
}

/** Optional: role guard */
export function requireRole(role: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
