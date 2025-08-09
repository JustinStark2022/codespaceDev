// Load environment variables first, before any other imports
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Try to load environment variables from different possible locations
const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../.env"),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn("No .env file found! Using default environment variables if available.");
  dotenv.config(); // Try default location as last resort
}

// Emergency fallback for critical variables
if (!process.env.PORT) {
  process.env.PORT = "3001";
  console.log("Using default PORT=3001");
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
  console.log("Using default NODE_ENV=development");
}

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import logger from "./utils/logger";
import aiRoutes from "./routes/ai.routes";

// Validate required environment variables
const requiredEnvVars = ["PORT", "NODE_ENV", "RUNPOD_API_KEY"] as const;
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

const app = express();

// -------- Middleware --------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

// -------- Routes --------
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    port: PORT,
  });
});

app.use("/api/ai", aiRoutes);

// -------- 404 handler (must be after routes) --------
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// -------- Error handling (must be last) --------
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error(err.stack || err.message);
    res.status(500).json({
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    });
  },
);

// -------- Start server (only once) --------
function start() {
  const server = app.listen(PORT, () => {
    logger.info(`🚀 Express server running on http://localhost:${PORT}`);
    logger.info(`📂 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔑 API Key configured: ${!!process.env.RUNPOD_API_KEY}`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`[INFO] Received ${signal}. Closing server…`);
    server.close(() => {
      logger.info("[INFO] Server closed.");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// Start only if this file is the entry point (prevents double-starts if imported)
if (require.main === module) {
  start();
}

// Export for testing/import without starting
export default app;