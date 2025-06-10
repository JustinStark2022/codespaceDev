import { Router } from "express";
import alertRoutes from "./alerts.routes";
import screenTimeRoutes from "./screenTime.routes";
import gamesRoutes from "./games.routes";
import userRoutes from "./user.routes";
import aiRoutes from "./ai.routes";
const router = Router();
router.use("/alerts", alertRoutes);
router.use("/screentime", screenTimeRoutes);
router.use("/games", gamesRoutes);
router.use("/user", userRoutes);
router.use("/ai", aiRoutes);
export default router;
// Example usage in your main server file:
// app.use("/api/alerts", alertRoutes);
// app.use("/api/screentime", screenTimeRoutes);
// app.use("/api/games", gamesRoutes);
// app.use("/api/user", userRoutes);
// app.use("/api/ai", aiRoutes);
