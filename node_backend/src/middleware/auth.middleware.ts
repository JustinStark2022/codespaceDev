// node_backend/src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "@/utils/logger";

const requireEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} missing`);
  return v;
};

// Make TS happy with jsonwebtoken overloads
const JWT_SECRET: jwt.Secret = requireEnv("JWT_SECRET");
const JWT_EXPIRES: jwt.SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES ?? "7d") as jwt.SignOptions["expiresIn"];

export interface AuthPayload {
  id: number;
  role?: string;
}

export interface AuthedRequest extends Request {
  user?: AuthPayload;
}

interface TokenClaims {
  sub: string;
  role?: string;
}

// Narrow the opts type to only the field we use, with the exact type expected
type SignOpts = { expiresIn?: jwt.SignOptions["expiresIn"] };

export function signAuthToken(payload: AuthPayload, opts?: SignOpts) {
  const claims: TokenClaims = { sub: String(payload.id), role: payload.role };
  // Explicitly annotate the options object so the correct overload is selected
  const options: jwt.SignOptions = {
    expiresIn: opts?.expiresIn ?? JWT_EXPIRES,
  };
  return jwt.sign(claims, JWT_SECRET, options);
}

const AUTH_COOKIE_KEYS = ["access_token", "token"];

function readCookieToken(req: Request): string | null {
  const cookies = (req as any).cookies;
  if (!cookies) return null;
  for (const k of AUTH_COOKIE_KEYS) {
    if (cookies[k]) return cookies[k];
  }
  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!(req as any).cookies) {
    logger.error("cookie-parser not registered before requireAuth");
    if (process.env.NODE_ENV !== "production") res.setHeader("X-Auth-Debug", "missing_cookie_parser");
    return res.status(500).json({ message: "Server misconfiguration" });
  }
  try {
    const token = readCookieToken(req);
    if (!token) {
      if (process.env.NODE_ENV !== "production") res.setHeader("X-Auth-Debug", "missing_cookie_token");
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & TokenClaims;
    const id = Number(decoded.sub);
    if (!Number.isFinite(id)) {
      if (process.env.NODE_ENV !== "production") res.setHeader("X-Auth-Debug", "invalid_id");
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = { id, role: decoded.role };
    next();
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
