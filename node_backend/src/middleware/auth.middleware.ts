// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: number;
  role: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: number; role: string };
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    // 1) Bearer token in Authorization header
    const auth = req.headers.authorization;
    let token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;

    // 2) Or httpOnly cookie named "token"
    if (!token && (req as any).cookies) {
      token = (req as any).cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Missing auth token" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded?.id) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}