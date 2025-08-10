// src/server.ts
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const envPaths = [path.resolve(process.cwd(), ".env"), path.resolve(__dirname, "../.env")];
let envLoaded = false;
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    console.log(`Loading environment from: ${p}`);
    dotenv.config({ path: p });
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  console.warn("No .env file found! Falling back to process env only.");
  dotenv.config();
}

if (!process.env.PORT) process.env.PORT = "3001";
if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import logger from "@/utils/logger";
import aiRoutes from "@/routes/ai.routes";
import userRoutes from "@/routes/user.routes";
import authRoutes from "@/routes/auth.routes";

const requiredEnv = ["PORT", "NODE_ENV", "JWT_SECRET"];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = new Set([
        process.env.FRONTEND_URL || "http://localhost:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.5.214:5173",
      ]);
      if (!origin || allowed.has(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(morgan("combined"));

// Health
app.get("/health", (_req, res) => res.json({ status: "healthy", time: new Date().toISOString() }));

// Mount API routes
app.use("/api/ai", aiRoutes);
app.use("/api/user", userRoutes);
app.use("/api", authRoutes); // <- gives /api/login, /api/register, /api/logout, /api/me

// 404
app.use((req, res) => res.status(404).json({ error: "Route not found", path: req.path }));

// Error handler (keep last)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

function start() {
  const server = app.listen(PORT, () => {
    logger.info(`🚀 Express server running on http://localhost:${PORT}`);
    logger.info(`📂 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔑 JWT configured: ${!!process.env.JWT_SECRET}`);
  });
  const shutdown = (sig: string) => {
    logger.info(`Received ${sig}. Closing server...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

if (require.main === module) start();
export default app;