import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.node_backend') });

import logger from "./utils/logger";
import aiRoutes from "./routes/ai.routes";

// Validate required environment variables
const requiredEnvVars = ["PORT", "NODE_ENV", "RUNPOD_API_KEY"];
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
}

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/ai", aiRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: PORT,
  });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
// API routes
app.use("/api/ai", aiRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err.stack || err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method
  });
});

// Start Express server
app.listen(PORT, () => {
  logger.info(`🚀 Express server running on http://localhost:${PORT}`);
  logger.info(`📂 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔑 API Key configured: ${!!process.env.RUNPOD_API_KEY}`);
});
// API routes
// app.use("/api", authRoutes);
// app.use("/api/user", userRoutes);
// app.use("/api/bible", bibleRoutes);
// app.use("/api/lessons", lessonsRoutes);
// app.use("/api/alerts", alertsRoutes);
// app.use("/api/chat", chatRoutes);
// app.use("/api/friends", friendsRoutes);
// app.use("/api/location", locationRoutes);
// app.use("/api/screentime", screenTimeRoutes);
// app.use("/api/child-dashboard", childDashboardRoutes);
// app.use("/api/games", gamesRoutes);
app.use("/api/ai", aiRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err.stack || err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`);
  logger.info(`Environment loaded: ${Object.keys(requiredEnvVars).filter(key => requiredEnvVars[key as keyof typeof requiredEnvVars]).join(', ')}`);
});
