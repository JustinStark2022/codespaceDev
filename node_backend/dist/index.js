import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import screenTimeRoutes from "./routes/screenTime.routes";
import gamesRoutes from "./routes/games.routes";
import alertsRoutes from "./routes/alerts.routes";
import lessonsRoutes from "./routes/lessons.routes";
import bibleRoutes from "./routes/bible.routes";
import { verifyToken } from "./middleware/auth.middleware";
const app = express();
// CORS configuration - IMPORTANT for login to work
app.use(cors({
    origin: ["http://localhost:5173", "http://client:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
}));
app.use(express.json());
app.use(cookieParser());
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 3001,
    });
});
// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/screentime", screenTimeRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/bible", bibleRoutes);
// Public endpoint for testing
app.get("/api/public", (req, res) => {
    res.json({ message: "This is a public endpoint" });
});
// Protected route example - Fix TypeScript error
app.get("/api/protected", verifyToken, (req, res) => {
    res.json({ message: "This is a protected endpoint", user: req.user });
});
export default app;
