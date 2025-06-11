import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { getUserLessonsWithProgress, getUserLessonProgress, updateLessonProgress, completeLessonProgress, assignLessonToChild, // <-- Import the new controller
 } from "../controllers/lessons.controller";
const router = Router();
router.get("/", verifyToken, getUserLessonsWithProgress);
router.get("/progress", verifyToken, getUserLessonProgress);
router.post("/progress", verifyToken, updateLessonProgress);
router.post("/complete", verifyToken, completeLessonProgress);
// Assign a lesson to a child (parent only)
router.post("/:lessonId/assign", verifyToken, assignLessonToChild);
export default router;
