import axios from "axios";
import logger from "../utils/logger";

interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface LLMResponse {
  text: string;
}

class LLMService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.RUNPOD_API_KEY || "";
    this.baseUrl = "https://api.runpod.ai/v2";
    if (!this.apiKey) {
      logger.error("RUNPOD_API_KEY is missing in environment variables.");
    }
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/runsync`,
        {
          input: {
            prompt: request.systemPrompt
              ? `System: ${request.systemPrompt}\n\nHuman: ${request.prompt}\n\nAssistant:`
              : request.prompt,
            max_new_tokens: request.maxTokens || 500,
            temperature: request.temperature || 0.7,
          },
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );
      return { text: response.data.output || "No response generated." };
    } catch (error: any) {
      logger.error("Error generating response:", error.message);
      throw new Error("Failed to generate response.");
    }
  }

  async generateChatResponse(userMessage: string, context?: string, userId?: number): Promise<string> {
    const systemPrompt = `You are a helpful Christian AI assistant for the Faith Fortress family app.
    You provide biblical guidance, parenting advice, and spiritual encouragement.
    Keep responses family-friendly, encouraging, and rooted in Christian values.`;

    try {
      const response = await this.generateResponse({
        prompt: userMessage,
        systemPrompt,
        maxTokens: 400,
        temperature: 0.7,
      }, userId, undefined, context);

      return response.text;
    } catch (error) {
      logger.error('Error generating chat response:', error);
      return "I'm having trouble connecting right now, but I'm here to help! Please try again in a moment.";
    }
  }

  async generateVerseOfTheDay(): Promise<{ verse: string; reference: string; reflection: string }> {
    const systemPrompt = `You are a Christian AI that provides daily Bible verses with reflections for families.
    Generate a meaningful Bible verse with an encouraging reflection suitable for all ages.
    
    Respond in JSON format with exactly these fields:
    {
      "verse": "the actual Bible verse text",
      "reference": "Book Chapter:Verse format",
      "reflection": "a brief, encouraging reflection about the verse"
    }`;

    const prompt = `Generate today's verse of the day with an uplifting reflection for a Christian family.`;

    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 300,
        temperature: 0.8,
      }, undefined, undefined, 'verse');

      try {
        const parsed = JSON.parse(response.text);
        return {
          verse: parsed.verse || "Trust in the Lord with all your heart and lean not on your own understanding.",
          reference: parsed.reference || "Proverbs 3:5",
          reflection: parsed.reflection || "God's wisdom is always available to guide us through each day.",
        };
      } catch (parseError) {
        logger.warn('Failed to parse verse JSON, using fallback extraction');
        return {
          verse: "Trust in the Lord with all your heart and lean not on your own understanding.",
          reference: "Proverbs 3:5",
          reflection: response.text.substring(0, 200) + "...",
        };
      }
    } catch (error) {
      logger.error('Error generating verse of the day:', error);
      return {
        verse: "Trust in the Lord with all your heart and lean not on your own understanding.",
        reference: "Proverbs 3:5",
        reflection: "God's wisdom is always available to guide us through each day.",
      };
    }
  }

  async generateDevotional(topic?: string): Promise<{ title: string; content: string; prayer: string }> {
    const systemPrompt = `You are a Christian devotional writer creating daily devotionals for families with children.
    Create age-appropriate, biblically sound devotionals that encourage spiritual growth.
    
    Respond in JSON format with exactly these fields:
    {
      "title": "devotional title",
      "content": "main devotional content with practical application",
      "prayer": "closing prayer for the family"
    }`;

    const prompt = topic 
      ? `Create a family devotional about ${topic}.`
      : `Create a daily devotional for a Christian family focusing on growing closer to Jesus.`;

    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 600,
        temperature: 0.7,
      }, undefined, undefined, 'devotional');

      try {
        const parsed = JSON.parse(response.text);
        return {
          title: parsed.title || "Walking in Faith",
          content: parsed.content || "Today, let's remember that God has a wonderful plan for our lives...",
          prayer: parsed.prayer || "Dear Lord, thank you for your love and guidance. Amen.",
        };
      } catch (parseError) {
        return {
          title: "Walking in Faith",
          content: response.text.substring(0, 400) + "...",
          prayer: "Dear Lord, thank you for your love and guidance. Amen.",
        };
      }
    } catch (error) {
      logger.error('Error generating devotional:', error);
      return {
        title: "Walking in Faith",
        content: "Today, let's remember that God has a wonderful plan for our lives.",
        prayer: "Dear Lord, thank you for your love and guidance. Amen.",
      };
    }
  }

  async generateWeeklySummary(familyId: number): Promise<any> {
    // Placeholder implementation - returns mock data for now
    return {
      summary_content: "Weekly summary generated for your family's digital activities.",
      parental_advice: "Continue monitoring and guiding your child's digital activities with love and wisdom.",
      spiritual_guidance: "Use technology as opportunities to discuss God's truth and values with your children.",
    };
  }
}

export const llmService = new LLMService();
      }
    } catch (error) {
      logger.error('Error generating verse of the day:', error);
      return {
        verse: "Trust in the Lord with all your heart and lean not on your own understanding.",
        reference: "Proverbs 3:5",
        reflection: "God's wisdom is always available to guide us through each day.",
      };
    }
  }

  async generateDevotional(topic?: string): Promise<{ title: string; content: string; prayer: string }> {
    const systemPrompt = `You are a Christian devotional writer creating daily devotionals for families with children.
    Create age-appropriate, biblically sound devotionals that encourage spiritual growth.
    
    Respond in JSON format with exactly these fields:
    {
      "title": "devotional title",
      "content": "main devotional content with practical application",
      "prayer": "closing prayer for the family"
    }`;

    const prompt = topic 
      ? `Create a family devotional about ${topic}.`
      : `Create a daily devotional for a Christian family focusing on growing closer to Jesus.`;

    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 600,
        temperature: 0.7,
      }, undefined, undefined, 'devotional');

      try {
        const parsed = JSON.parse(response.text);
        return {
          title: parsed.title || "Walking in Faith",
          content: parsed.content || "Today, let's remember that God has a wonderful plan for our lives...",
          prayer: parsed.prayer || "Dear Lord, thank you for your love and guidance. Amen.",
        };
      } catch (parseError) {
        return {
          title: "Walking in Faith",
          content: response.text.substring(0, 400) + "...",
          prayer: "Dear Lord, thank you for your love and guidance. Amen.",
        };
      }
    } catch (error) {
      logger.error('Error generating devotional:', error);
      return {
        title: "Walking in Faith",
        content: "Today, let's remember that God has a wonderful plan for our lives.",
        prayer: "Dear Lord, thank you for your love and guidance. Amen.",
      };
    }
  }

  async generateChatResponse(userMessage: string, context?: string, userId?: number): Promise<string> {
    const systemPrompt = `You are a helpful Christian AI assistant for the Faith Fortress family app.
    You provide biblical guidance, parenting advice, and spiritual encouragement.
    Keep responses family-friendly, encouraging, and rooted in Christian values.`;

    try {
      const response = await this.generateResponse({
        prompt: userMessage,
        systemPrompt,
        maxTokens: 400,
        temperature: 0.7,
      }, userId, undefined, context);

      return response.text;
    } catch (error) {
      logger.error('Error generating chat response:', error);
      return "I'm having trouble connecting right now, but I'm here to help! Please try asking your question again.";
    }
  }

  async generateWeeklySummary(familyId: number): Promise<any> {
    // Placeholder implementation - returns mock data for now
    return {
      summary_content: "Weekly summary generated for your family's digital activities.",
      parental_advice: "Continue monitoring and guiding your child's digital activities with love and wisdom.",
      spiritual_guidance: "Use technology as opportunities to discuss God's truth and values with your children.",
    };
  }
}

export const llmService = new LLMService();
      } catch (parseError) {
        return {
          title: "Walking in Faith",
          content: response.text.substring(0, 400) + "...",
          prayer: "Dear Lord, thank you for your love and guidance. Amen.",
        };
      }
    } catch (error) {
      logger.error('Error generating devotional:', error);
      return {
        title: "Walking in Faith",
        content: "Today, let's remember that God has a wonderful plan for our lives.",
        prayer: "Dear Lord, thank you for your love and guidance. Amen.",
      };
    }
  }

  async generateChatResponse(userMessage: string, context?: string, userId?: number): Promise<string> {
    const systemPrompt = `You are a helpful Christian AI assistant for the Faith Fortress family app.
    You provide biblical guidance, parenting advice, and spiritual encouragement.
    Keep responses family-friendly, encouraging, and rooted in Christian values.`;

    try {
      const response = await this.generateResponse({
        prompt: userMessage,
        systemPrompt,
        maxTokens: 400,
        temperature: 0.7,
      }, userId, undefined, context);

      return response.text;
    } catch (error) {
      logger.error('Error generating chat response:', error);
      return "I'm having trouble connecting right now, but I'm here to help! Please try again in a moment.";
    }
  }

  async generateWeeklySummary(familyId: number): Promise<any> {
    // Placeholder implementation
    return {
      summary_content: "Weekly summary generated",
      parental_advice: "Continue monitoring and guiding your child's digital activities.",
      spiritual_guidance: "Use technology as opportunities to discuss God's truth.",
    };
  }
}

export const llmService = new LLMService();
        const existingContext = await db
          .select()
          .from(conversation_contexts)
          .where(
            and(
              eq(conversation_contexts.user_id, userId),
              eq(conversation_contexts.session_id, sessionId)
            )
          )
          .limit(1);

        if (existingContext.length > 0) {
          const history = JSON.parse(existingContext[0].conversation_history);
          conversationHistory = history.slice(-10).map((msg: any) => 
            `${msg.role}: ${msg.content}`
          ).join('\n');
        }
      } catch (error) {
        logger.error('Failed to retrieve conversation history:', error);
      }
    }

    const systemPrompt = `You are a helpful Christian AI assistant for the Faith Fortress family app.
    You provide biblical guidance, parenting advice, and spiritual encouragement.
    Keep responses family-friendly, encouraging, and rooted in Christian values.
    Be concise but caring in your responses.
    
    Previous conversation context:
    ${conversationHistory}`;

    try {
      const response = await this.generateResponse({
        prompt: userMessage,
        systemPrompt,
        maxTokens: 400,
        temperature: 0.7,
      }, userId, undefined, context);

      // Update conversation history
      if (userId && context) {
        await this.updateConversationHistory(userId, context, userMessage, response.text);
      }

      return response.text;
    } catch (error) {
      logger.error('Error generating chat response:', error);
      return "I'm having trouble connecting right now, but I'm here to help! Please try again in a moment.";
    }
  }

  private async updateConversationHistory(userId: number, context: string, userMessage: string, botResponse: string) {
    try {
      const sessionId = `${userId}_${context}_${new Date().toDateString()}`;
      
      const existingContext = await db
        .select()
        .from(conversation_contexts)
        .where(
          and(
            eq(conversation_contexts.user_id, userId),
            eq(conversation_contexts.session_id, sessionId)
          )
        )
        .limit(1);

      const newMessages = [
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: botResponse, timestamp: new Date().toISOString() }
      ];

      if (existingContext.length > 0) {
        const history = JSON.parse(existingContext[0].conversation_history);
        history.push(...newMessages);
        
        // Keep only last 20 messages to avoid token limits
        const trimmedHistory = history.slice(-20);
        
        await db
          .update(conversation_contexts)
          .set({
            conversation_history: JSON.stringify(trimmedHistory),
            last_activity: new Date()
          })
          .where(eq(conversation_contexts.id, existingContext[0].id));
      } else {
        await db.insert(conversation_contexts).values({
          user_id: userId,
          session_id: sessionId,
          context_type: context,
          conversation_history: JSON.stringify(newMessages),
        });
      }
    } catch (error) {
      logger.error('Failed to update conversation history:', error);
    }
  }

  async generateWeeklySummary(familyId: number): Promise<any> {
    try {
      // Get date range for the past week
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      // Get all children for this family
      const children = await db
        .select()
        .from(users)
        .where(eq(users.parent_id, familyId));

      // Collect activity data for all children
      const activityPromises = children.map(child =>
        db.select()
          .from(child_activity_logs)
          .where(
            and(
              eq(child_activity_logs.child_id, child.id),
              gte(child_activity_logs.timestamp, startDate),
              lte(child_activity_logs.timestamp, endDate)
            )
          )
      );

      const allActivities = (await Promise.all(activityPromises)).flat();

      // Get content analysis data
      const contentAnalyses = await db
        .select()
        .from(content_analysis)
        .where(
          and(
            gte(content_analysis.created_at, startDate),
            lte(content_analysis.created_at, endDate)
          )
        );

      // Prepare data summary for AI
      const dataContext = {
        weekPeriod: `${startDate.toDateString()} to ${endDate.toDateString()}`,
        children: children.map(c => ({ name: c.first_name, age: c.age })),
        totalActivities: allActivities.length,
        flaggedContent: allActivities.filter(a => a.flagged).length,
        topActivities: this.getTopActivities(allActivities),
        concerningContent: contentAnalyses.filter(c => c.parent_guidance_needed),
        safetyScores: contentAnalyses.map(c => c.safety_score).filter(Boolean),
      };

      const systemPrompt = `You are a Christian family counselor and digital safety expert creating a weekly summary for parents.
      Provide practical, biblical guidance on how to discuss digital content with children and guide them closer to Jesus.
      Format your response as JSON with these fields:
      - summary_content: Overview of the week's digital activity
      - parental_advice: Specific advice for parents
      - discussion_topics: Array of conversation starters
      - spiritual_guidance: How to use this week's activities to teach about Jesus
      - concerning_content: Issues that need attention
      - positive_highlights: Good things to praise children for
      - recommended_actions: Specific next steps for parents
      - prayer_suggestions: Topics for family prayer`;

      const prompt = `Generate a weekly content summary for a Christian family based on this data:
      ${JSON.stringify(dataContext, null, 2)}
      
      Focus on:
      1. How parents can use media consumption as discipleship opportunities
      2. Age-appropriate ways to discuss content choices
      3. Biblical principles related to the content consumed
      4. Practical steps to encourage godly media habits`;

      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 1200,
        temperature: 0.6,
      }, familyId, undefined, 'weekly_summary');

      let summaryData;
      try {
        summaryData = JSON.parse(response.text);
      } catch {
        // Fallback structure if JSON parsing fails
        summaryData = {
          summary_content: response.text,
          parental_advice: "Review your children's digital activities regularly and discuss them in a loving, biblical context.",
          discussion_topics: ["What did you learn online this week?", "How can we use technology to honor God?"],
          spiritual_guidance: "Use media consumption as opportunities to discuss God's truth and values.",
          concerning_content: "Monitor any flagged content and address it with grace and wisdom.",
          positive_highlights: "Praise children for making good content choices.",
          recommended_actions: ["Set up regular family tech discussions", "Review parental controls"],
          prayer_suggestions: ["Pray for wisdom in technology use", "Thank God for protection online"]
        };
      }

      // Save to database
      const savedSummary = await db.insert(weekly_content_summaries).values({
        family_id: familyId,
        week_start_date: startDate.toISOString().split('T')[0],
        week_end_date: endDate.toISOString().split('T')[0],
        summary_content: summaryData.summary_content,
        parental_advice: summaryData.parental_advice,
        discussion_topics: JSON.stringify(summaryData.discussion_topics || []),
        spiritual_guidance: summaryData.spiritual_guidance,
        concerning_content: summaryData.concerning_content || null,
        positive_highlights: summaryData.positive_highlights || null,
        recommended_actions: JSON.stringify(summaryData.recommended_actions || []),
        prayer_suggestions: summaryData.prayer_suggestions || null,
      }).returning();

      return savedSummary[0];
    } catch (error) {
      logger.error('Error generating weekly summary:', error);
      throw error;
    }
  }

  private getTopActivities(activities: any[]): any[] {
    const activityCount: { [key: string]: number } = {};
    
    activities.forEach(activity => {
      const key = activity.activity_name;
      activityCount[key] = (activityCount[key] || 0) + 1;
    });

    return Object.entries(activityCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  // ...existing methods...
}

export const llmService = new LLMService();
