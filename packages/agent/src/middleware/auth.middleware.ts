import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

/**
 * Validate API key from x-api-key header
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || typeof apiKey !== "string") {
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  if (!env.API_KEYS.includes(apiKey)) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  next();
}
