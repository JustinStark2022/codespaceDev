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

export const TOKEN_COOKIE_CANDIDATES = ["access_token", "token"];
const AUTH_COOKIE_KEYS = TOKEN_COOKIE_CANDIDATES;

// Removed bearer/Authorization header support (cookie-only, intentional)

function readCookieToken(req: Request): string | null {
  const cookies = (req as any).cookies;
  if (!cookies) return null;
  for (const k of AUTH_COOKIE_KEYS) {
    if (cookies[k]) return cookies[k];
  }
  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  // HttpOnly cookie-only auth: cookie-parser must have populated req.cookies
  if (!(req as any).cookies) {
    logger.error("cookie-parser not registered before requireAuth");
    if (process.env.NODE_ENV !== "production") res.setHeader("X-Auth-Debug", "missing_cookie_parser");
    return res.status(500).json({ message: "Server misconfiguration" });
  }
  try {
    const token = readCookieToken(req); // cookie only
    if (!token) {
      if (process.env.NODE_ENV !== "production") res.setHeader("X-Auth-Debug", "missing_cookie_token");
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as (jwt.JwtPayload & Partial<TokenClaims> & { id?: string | number });
    const rawId = (decoded as any).sub ?? (decoded as any).id;
    const id = Number(rawId);
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