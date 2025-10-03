import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "@/utils/logger";

const requireEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} missing`);
  return v;
};
const JWT_SECRET = requireEnv("JWT_SECRET");

export interface AuthPayload {
  id: number;
  role?: string;
}

export interface AuthedRequest extends Request {
  user?: AuthPayload;
}

function readCookieToken(req: Request): string | null {
  const cookies = (req as any).cookies ?? {};
  return cookies["access_token"] || cookies["token"] || null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = readCookieToken(req);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string | number; id?: number; role?: string };
    const rawId = decoded.sub ?? decoded.id;
    const id = typeof rawId === "string" ? Number(rawId) : rawId;
    if (!Number.isFinite(id)) return res.status(401).json({ message: "Unauthorized" });

    req.user = { id: Number(id), role: decoded.role };
    next();
  } catch (err: any) {
    logger.warn("Auth verify failed", { error: err?.message });
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const r = req.user?.role;
    if (!r || !roles.includes(r)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
