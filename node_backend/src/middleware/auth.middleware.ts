import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "@/utils/logger";

const requireEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} missing`);
  return v;
};
const JWT_SECRET = requireEnv("JWT_SECRET");

// Optional: centralize expiration (frontend should know only for refresh timing, not decode secret)
const JWT_EXPIRES = process.env.JWT_EXPIRES || "15m";

export interface AuthPayload {
  id: number;
  role?: string;
}

export interface AuthedRequest extends Request {
  user?: AuthPayload;
}

// Helper used by login route (keep payload minimal)
export function signAuthToken(payload: AuthPayload, opts?: { expiresIn?: string | number }) {
  return jwt.sign(
    { sub: payload.id, role: payload.role },
    JWT_SECRET,
    { expiresIn: opts?.expiresIn ?? JWT_EXPIRES }
  );
}

// Cookie-only auth (httpOnly). Frontend must send credentials: 'include'.
const AUTH_COOKIE_KEYS = ["access_token", "token"];

// Only support secure HTTPOnly cookies. No Authorization header fallback (intentional).
function readCookieToken(req: Request): string | null {
  const cookies = (req as any).cookies;
  if (!cookies) return null; // cookie-parser not mounted
  for (const k of AUTH_COOKIE_KEYS) {
    if (cookies[k]) return cookies[k];
  }
  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  // Detect missing cookie-parser early (must be: app.use(cookieParser()); before routes)
  if (!(req as any).cookies) {
    logger.error("cookie-parser middleware not registered before requireAuth");
    if (process.env.NODE_ENV !== "production") res.setHeader("X-Auth-Debug", "missing_cookie_parser");
    return res.status(500).json({ message: "Server misconfiguration" });
  }
  try {
    const token = readCookieToken(req); // cookie only
    if (!token) {
      if (process.env.NODE_ENV !== "production") res.setHeader("X-Auth-Debug", "missing_cookie_token");
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string | number; id?: number; role?: string };
    const rawId = decoded.sub ?? decoded.id;
    const id = typeof rawId === "string" ? Number(rawId) : rawId;
    if (!Number.isFinite(id)) {
      if (process.env.NODE_ENV !== "production") res.setHeader("X-Auth-Debug", "invalid_id");
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = { id: Number(id), role: decoded.role };
    return next();
  } catch (err: any) {
    const code = err?.name === "TokenExpiredError" ? "expired" : "verify_failed";
    logger.warn("Auth verify failed", { error: err?.message, code });
    if (process.env.NODE_ENV !== "production") res.setHeader("X-Auth-Debug", code);
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

// Frontend removal instructions:
// Search & remove Authorization: Bearer usage in frontend code.
// Only HTTPOnly cookies are used for authentication.
