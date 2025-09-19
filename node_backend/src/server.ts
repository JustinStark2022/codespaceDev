import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import userRoutes from "@/routes/user.routes";
import authRoutes from "./routes/auth.routes";
import aiRoutes from "@/routes/ai.routes";
import { env } from "@/utils/env-check";
import logger from "./utils/logger";
import { connectWithRetry } from "./db/db";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Middleware
app.use(
  cors({
    origin: [FRONTEND_URL, ...(process.env.ALLOWED_ORIGINS?.split(',') || [])],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Health check endpoint
app.get("/health", (_req, res) => res.status(200).send("ok"));

// API Routes
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use(`${env.API_PREFIX}/ai`, aiRoutes); // <-- this mounts /api/ai/dashboard etc.

// 404 Handler for unmatched routes
app.use((_req, res) => res.status(404).json({ message: "Not found" }));

// Start server function
const startServer = () => {
  app.listen(PORT, () => {
    logger.info(`🚀 Express server running on http://localhost:${PORT}`);
    logger.info(`📂 Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(`🔑 JWT configured: ${!!process.env.JWT_SECRET}`);
    logger.info(`🌐 Frontend URL: ${FRONTEND_URL}`);
  });
};

// Main function to initialize and start the server
const main = async () => {
  await connectWithRetry();
  startServer();
};

main();
