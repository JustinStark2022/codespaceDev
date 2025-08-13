// src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export interface AuthUser {
  id: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Attach req.user if a valid JWT is found (cookie "token" or Authorization: Bearer) */
export function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice("Bearer ".length)
      : undefined;

    const token = (req as any).cookies?.token || bearer;
    if (!token) return next();

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    if (decoded && typeof decoded.id === "number") {
      req.user = { id: decoded.id, role: decoded.role || "parent" };
    }
  } catch {
    // ignore bad token; route guards will block where needed
  }
  next();
}

/** Require a valid user to proceed */
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
}

/** Optional role guard */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
  