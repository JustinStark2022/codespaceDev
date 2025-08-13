// src/routes/_util.ts
import { Request, Response, NextFunction } from "express";

/** Pick the first available function from an object by name list. */
export function pickHandler<T extends (...args: any[]) => any>(
  obj: any,
  names: string[],
  opts?: { 
    kind?: "route" | "middleware";
    label?: string;
    strict?: boolean;
  }
): T {
  const { kind = "route", label = names[0], strict = false } = opts || {};
  for (const n of names) {
    const fn = obj?.[n];
    if (typeof fn === "function") return fn as T;
  }
  // also try default export
  if (typeof obj?.default === "function") return obj.default as T;

  if (strict && kind === "route") {
    // throw on startup if strict requested
    throw new Error(`Missing handler: ${label} (tried: ${names.join(", ")})`);
  }

  // safe fallbacks so app still boots
  if (kind === "middleware") {
    return ((_: Request, __: Response, next: NextFunction) => next()) as unknown as T;
  }
  return ((_: Request, res: Response) => {
    res.status(501).json({ message: `Not implemented: ${label}` });
  }) as unknown as T;
}
