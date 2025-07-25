import axios from 'axios';
import { db } from '../db/db';
import { 
  llm_generated_content, 
  child_activity_logs, 
  content_analysis, 
  weekly_content_summaries,
  conversation_contexts 
} from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import logger from '../utils/logger';

interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class LLMService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.RUNPOD_API_KEY || '';
    this.baseUrl = 'https://api.runpod.ai/v2'; // Adjust based on RunPod's actual endpoint
    
    if (!this.apiKey) {
      logger.error('RUNPOD_API_KEY not found in environment variables');
    }
  }

  private async saveGeneratedContent(
    contentType: string,
    prompt: string,
    systemPrompt: string | undefined,
    generatedContent: string,
    userId?: number,
    childId?: number,
    context?: string,
    tokensUsed?: number,
    generationTime?: number
  ) {
    try {
      await db.insert(llm_generated_content).values({
        content_type: contentType,
        prompt,
        system_prompt: systemPrompt || null,
        generated_content: generatedContent,
        user_id: userId || null,
        child_id: childId || null,
        context: context || null,
        tokens_used: tokensUsed || null,
        generation_time_ms: generationTime || null,
      });
    } catch (error) {
      logger.error('Failed to save generated content:', error);
    }
  }

  async generateResponse(request: LLMRequest, userId?: number, childId?: number, context?: string): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      const payload = {
        input: {
          prompt: request.systemPrompt 
            ? `${request.systemPrompt}\n\nUser: ${request.prompt}\n\nAssistant:`
            : request.prompt,
          max_tokens: request.maxTokens || 500,
          temperature: request.temperature || 0.7,
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/your-endpoint-id/runsync`, // Replace with your actual endpoint
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const generatedText = response.data.output?.text || response.data.output || 'No response generated';
      const generationTime = Date.now() - startTime;

      // Save to database for review and fine-tuning
      await this.saveGeneratedContent(
        context || 'general',
        request.prompt,
        request.systemPrompt,
        generatedText,
        userId,
        childId,
        context,
        response.data.usage?.total_tokens,
        generationTime
      );

      return {
        text: generatedText,
        usage: response.data.usage,
      };
    } catch (error: any) {
      logger.error('LLM Service Error:', error.response?.data || error.message);
      throw new Error(`LLM request failed: ${error.message}`);
    }
  }

  async generateVerseOfTheDay(): Promise<{ verse: string; reference: string; reflection: string }> {
    const systemPrompt = `You are a Christian AI assistant that provides daily Bible verses with reflections. 
    Generate a verse of the day with a brief, encouraging reflection suitable for families with children.
    Format your response as JSON with: verse, reference, reflection fields.`;

    const prompt = `Generate today's verse of the day with an uplifting reflection for a Christian family.`;

    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 300,
        temperature: 0.8,
      });

      try {
        const parsed = JSON.parse(response.text);
        return {
          verse: parsed.verse || "Trust in the Lord with all your heart and lean not on your own understanding.",
          reference: parsed.reference || "Proverbs 3:5",
          reflection: parsed.reflection || "God's wisdom is always available to guide us through each day.",
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          verse: "Trust in the Lord with all your heart and lean not on your own understanding.",
          reference: "Proverbs 3:5",
          reflection: response.text.substring(0, 200) + "...",
        };
      }
    } catch (error) {
      logger.error('Error generating verse of the day:', error);
      // Return fallback verse
      return {
        verse: "Trust in the Lord with all your heart and lean not on your own understanding.",
        reference: "Proverbs 3:5",
        reflection: "God's wisdom is always available to guide us through each day.",
      };
    }
  }

  async generateDevotional(topic?: string): Promise<{ title: string; content: string; prayer: string }> {
    const systemPrompt = `You are a Christian AI assistant that creates daily devotionals for families.
    Create age-appropriate, biblically sound devotionals that encourage spiritual growth.
    Format your response as JSON with: title, content, prayer fields.`;

    const prompt = topic 
      ? `Create a family devotional about ${topic}.`
      : `Create a daily devotional for a Christian family with encouraging biblical truths.`;

    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 600,
        temperature: 0.7,
      });

      try {
        const parsed = JSON.parse(response.text);
        return {
          title: parsed.title || "Walking in Faith",
          content: parsed.content || "Today, let's remember that God has a wonderful plan for our lives...",
          prayer: parsed.prayer || "Dear Lord, thank you for your love and guidance. Help us to trust in you always. Amen.",
        };
      } catch {
        return {
          title: "Walking in Faith",
          content: response.text.substring(0, 400) + "...",
          prayer: "Dear Lord, thank you for your love and guidance. Help us to trust in you always. Amen.",
        };
      }
    } catch (error) {
      logger.error('Error generating devotional:', error);
      return {
        title: "Walking in Faith",
        content: "Today, let's remember that God has a wonderful plan for our lives. Through prayer and faith, we can face any challenge.",
        prayer: "Dear Lord, thank you for your love and guidance. Help us to trust in you always. Amen.",
      };
    }
  }

  async generateChatResponse(userMessage: string, context?: string, userId?: number): Promise<string> {
    // Get conversation history for better context
    let conversationHistory = '';
    if (userId && context) {
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
