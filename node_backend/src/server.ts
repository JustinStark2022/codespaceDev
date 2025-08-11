// src/server.ts
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import userRoutes from "@/routes/user.routes";
import authRoutes from "./routes/auth.routes";
import aiRoutes from "./routes/ai.routes";          // <-- make sure path & filename match
import logger from "./utils/logger";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// middleware
app.use(
  cors({
    origin: [FRONTEND_URL],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

// health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// routes
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api/ai", aiRoutes);                      // <-- this mounts /api/ai/dashboard etc.

// serve nothing else in dev (vite serves your client)
app.use((_req, res) => res.status(404).json({ message: "Not found" }));

app.listen(PORT, () => {
  logger.info(`🚀 Express server running on http://localhost:${PORT}`);
  logger.info(`📂 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`🔑 JWT configured: ${!!process.env.JWT_SECRET}`);
});
