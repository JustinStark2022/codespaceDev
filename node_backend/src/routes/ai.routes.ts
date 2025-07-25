import { Router } from "express";
import { llmService } from "../services/llm.service";

const router = Router();

router.post("/content-scan", async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await llmService.generateResponse({ prompt });
    res.json({ result: response.text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await llmService.generateChatResponse(message);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/verse-of-the-day", async (_req, res) => {
  try {
    const verse = await llmService.generateVerseOfTheDay();
    res.json(verse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/devotional", async (req, res) => {
  try {
    const { topic } = req.query;
    const devotional = await llmService.generateDevotional(topic as string);
    res.json(devotional);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/weekly-summary/:familyId", async (req, res) => {
  try {
    const { familyId } = req.params;
    const summary = await llmService.generateWeeklySummary(parseInt(familyId));
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { content, type, contentName, platform, childId } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Content is required for scanning" });
      }

      const systemPrompt = `You are a Christian content safety analyzer for families.
      Analyze the provided content for appropriateness for children.
      Consider: violence, language, sexual content, occult themes, bullying, and alignment with Christian values.
      
      Respond with JSON containing:
      - flagged: boolean (true if inappropriate)
      - confidence: number (0-1)
      - safetyScore: number (1-100, higher is safer)
      - categories: array of concerning categories found
      - reason: string explaining the decision
      - parentGuidanceNeeded: boolean
      - recommendedAge: string (e.g., "8+", "13+")
      - guidanceNotes: string with advice for parents`;

      const prompt = `Analyze this ${type || 'content'} for family safety:
      
      Content Name: ${contentName || 'Unknown'}
      Platform: ${platform || 'Unknown'}
      Content: ${content}
      
      Provide a thorough Christian family safety analysis.`;

      const response = await llmService.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 600,
        temperature: 0.3,
      }, req.user?.id, childId, 'content_scan');

      let analysisResult;
      try {
        analysisResult = JSON.parse(response.text);
      } catch {
        // Fallback parsing
        const flagged = response.text.toLowerCase().includes('inappropriate') || 
                      response.text.toLowerCase().includes('not safe');
        analysisResult = {
          flagged,
          confidence: 0.8,
          safetyScore: flagged ? 30 : 85,
          categories: [],
          reason: response.text,
          parentGuidanceNeeded: flagged,
          recommendedAge: "All ages",
          guidanceNotes: "Review content with your child."
        };
      }

      // Save analysis to database (if tables exist)
      if (childId && contentName) {
        try {
          await db.insert(content_analysis).values({
            child_id: childId,
            content_name: contentName,
            content_type: type || 'unknown',
            platform: platform || null,
            ai_analysis: response.text,
            safety_score: analysisResult.safetyScore || 50,
            content_themes: JSON.stringify(analysisResult.categories || []),
            recommended_age: analysisResult.recommendedAge || 'Unknown',
            parent_guidance_needed: analysisResult.parentGuidanceNeeded || false,
            guidance_notes: analysisResult.guidanceNotes || null,
            approved: !analysisResult.flagged,
          });
        } catch (dbError) {
          logger.warn("Failed to save content analysis to database:", dbError);
        }
      }

      res.json({
        contentId: Date.now(), // Use timestamp as ID
        ...analysisResult,
        scanTime: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Content scan error:", error);
      res.status(500).json({ 
        error: "Failed to scan content",
        flagged: true, // Default to flagged on error for safety
        confidence: 0,
        reason: "Analysis failed - review manually"
      });
    }
  }
);

// Chat endpoint with user context
router.post(
  "/chat",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, context } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await llmService.generateChatResponse(
        message, 
        context, 
        req.user?.id
      );

      res.json({
        response,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Chat AI error:", error);
      res.status(500).json({
        error: "Failed to generate response",
        response: "I'm having trouble connecting right now. Please try again in a moment.",
      });
    }
  }
);

// Verse of the day endpoint
router.get("/verse-of-the-day", async (_req: Request, res: Response) => {
  try {
    const verse = await llmService.generateVerseOfTheDay();

    res.json({
      ...verse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Verse of the day AI error:", error);
    res.status(500).json({ error: "Failed to generate verse of the day" });
  }
});

// Devotional endpoint
router.get("/devotional", async (req: Request, res: Response) => {
  try {
    const { topic } = req.query;
    const devotional = await llmService.generateDevotional(topic as string);

    res.json({
      ...devotional,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Devotional AI error:", error);
    res.status(500).json({ error: "Failed to generate devotional" });
  }
});

// Real-time lesson generation for specific children
router.post(
  "/generate-lesson",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { topic, ageGroup, duration, childId, difficulty } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      // Get child context if provided (simplified without actual DB query)
      let childContext = '';
      if (childId) {
        try {
          const recentActivities = await db
            .select()
            .from(child_activity_logs)
            .where(eq(child_activity_logs.child_id, childId))
            .orderBy(desc(child_activity_logs.timestamp))
            .limit(5);

          if (recentActivities && recentActivities.length > 0) {
            childContext = `\n\nChild's recent interests: ${recentActivities
              .map((a: any) => a.activity_name || 'activity')
              .join(', ')}`;
          }
        } catch (dbError) {
          logger.warn("Failed to fetch child activities:", dbError);
        }
      }

      const systemPrompt = `You are an expert Christian educator creating Bible lessons for children.
      Create engaging, biblically accurate, age-appropriate lessons that connect with children's lives.
      Include interactive elements, practical applications, and ways to help children grow closer to Jesus.
      
      Format as JSON with these exact fields:
      - title: string
      - scripture_reference: string
      - description: string (brief summary)
      - content: string (full lesson content with HTML formatting)
      - objectives: array of strings (learning goals)
      - activities: array of objects with {type, title, duration, description}
      - age_range: string
      - difficulty: string (beginner/intermediate/advanced)
      - memory_verse: string
      - discussion_questions: array of strings
      - prayer: string (closing prayer)`;

      const prompt = `Create a comprehensive Bible lesson about "${topic}" for ${ageGroup || 'children ages 6-12'} 
      that takes about ${duration || 15} minutes.
      Difficulty level: ${difficulty || 'beginner'}
      ${childContext}
      
      Make it engaging, interactive, and help children understand how this applies to their daily lives.
      Include stories, activities, and ways to connect with Jesus.`;

      const response = await llmService.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 1200,
        temperature: 0.7,
      }, req.user?.id, childId, 'lesson_generation');

      try {
        const lesson = JSON.parse(response.text);
        
        // Validate required fields
        const validatedLesson = {
          id: Date.now(),
          title: lesson.title || `Lesson: ${topic}`,
          scripture_reference: lesson.scripture_reference || "Matthew 19:14",
          description: lesson.description || "A Bible lesson generated by AI",
          content: lesson.content || response.text,
          objectives: Array.isArray(lesson.objectives) ? lesson.objectives : ["Learn about God's love"],
          activities: Array.isArray(lesson.activities) ? lesson.activities : [
            { type: "discussion", title: "Talk about it", duration: 5, description: "Discuss the lesson" }
          ],
          age_range: lesson.age_range || ageGroup || "6-12",
          difficulty: lesson.difficulty || difficulty || "beginner",
          memory_verse: lesson.memory_verse || lesson.scripture_reference || "Jesus loves me",
          discussion_questions: Array.isArray(lesson.discussion_questions) ? lesson.discussion_questions : 
            ["What did you learn today?", "How can we apply this to our lives?"],
          prayer: lesson.prayer || "Dear Jesus, thank you for loving us. Help us to follow you. Amen.",
          generated: true,
          estimated_time: duration || 15,
          timestamp: new Date().toISOString(),
        };

        res.json(validatedLesson);
      } catch (parseError) {
        logger.error("Failed to parse lesson JSON:", parseError);
        // Fallback lesson structure
        res.json({
          id: Date.now(),
          title: `Lesson: ${topic}`,
          scripture_reference: "Matthew 19:14",
          description: "A Bible lesson generated by AI",
          content: response.text,
          objectives: ["Learn about God's love", "Understand biblical principles"],
          activities: [
            { type: "story", title: "Bible Story", duration: 8, description: "Learn the Bible story" },
            { type: "discussion", title: "Talk About It", duration: 4, description: "Discuss what we learned" },
            { type: "prayer", title: "Pray Together", duration: 3, description: "Close with prayer" }
          ],
          age_range: ageGroup || "6-12",
          difficulty: difficulty || "beginner",
          memory_verse: "Jesus said, 'Let the little children come to me.' - Matthew 19:14",
          discussion_questions: [
            "What did you learn from this lesson?",
            "How can we apply this to our daily lives?",
            "How does this help us grow closer to Jesus?"
          ],
          prayer: "Dear Jesus, thank you for this lesson. Help us to remember what we learned and live it out each day. Amen.",
          generated: true,
          estimated_time: duration || 15,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error("Lesson generation AI error:", error);
      res.status(500).json({ error: "Failed to generate lesson" });
    }
  }
);

// Weekly content summary endpoint
router.get(
  "/weekly-summary/:familyId",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { familyId } = req.params;
      const userId = req.user?.id;

      // Verify user has access to this family's data
      if (parseInt(familyId) !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const summary = await llmService.generateWeeklySummary(parseInt(familyId));

      res.json({
        success: true,
        summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Weekly summary generation error:", error);
      res.status(500).json({ error: "Failed to generate weekly summary" });
    }
  }
);

// Get existing weekly summaries
router.get(
  "/weekly-summaries",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      try {
        const summaries = await db
          .select()
          .from(weekly_content_summaries)
          .where(eq(weekly_content_summaries.family_id, userId))
          .orderBy(desc(weekly_content_summaries.generated_at))
          .limit(10);

        res.json({
          success: true,
          summaries,
        });
      } catch (dbError) {
        logger.warn("Database query failed, returning empty summaries:", dbError);
        res.json({
          success: true,
          summaries: [],
        });
      }
    } catch (error: any) {
      logger.error("Error fetching weekly summaries:", error);
      res.status(500).json({ error: "Failed to fetch summaries" });
    }
  }
);

// Log child activity for monitoring
router.post(
  "/log-activity",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { childId, activityType, activityName, platform, duration, contentCategory } = req.body;

      if (!childId || !activityType || !activityName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        await db.insert(child_activity_logs).values({
          child_id: childId,
          activity_type: activityType,
          activity_name: activityName,
          platform: platform || null,
          duration_minutes: duration || null,
          content_category: contentCategory || null,
        });
      } catch (dbError) {
        logger.warn("Failed to log activity to database:", dbError);
      }

      res.json({ success: true, message: "Activity logged" });
    } catch (error: any) {
      logger.error("Error logging activity:", error);
      res.status(500).json({ error: "Failed to log activity" });
    }
  }
);

export default router;
