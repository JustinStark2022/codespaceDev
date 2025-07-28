// src/services/LLMService.ts

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

  public async generateResponse(request: LLMRequest): Promise<LLMResponse> {
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

  async generateChatResponse(prompt: string, context?: string, userId?: number): Promise<string> {
    const systemPrompt = context || `You are a helpful Christian AI assistant.`;
    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 400,
        temperature: 0.7,
      });
      return response.text;
    } catch (error) {
      logger.error(
        "Error generating chat response:",
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message
          : String(error)
      );
      return "I'm having trouble connecting right now. Please try again later.";
    }
  }

  async generateVerseOfTheDay(): Promise<{ verse: string; reference: string; reflection: string }> {
    const systemPrompt = `Generate a verse of the day with a reflection.`;
    try {
      const response = await this.generateResponse({
        prompt: "Generate a verse of the day with a reflection.",
        systemPrompt,
        maxTokens: 300,
        temperature: 0.8,
      });
      const parsed = JSON.parse(response.text);
      return {
        verse: parsed.verse || "Trust in the Lord with all your heart and lean not on your own understanding.",
        reference: parsed.reference || "Proverbs 3:5",
        reflection: parsed.reflection || "God's wisdom is always available to guide us through each day.",
      };
    } catch (error) {
      logger.warn("Failed to parse verse JSON, using fallback extraction.");
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
      });
      const parsed = JSON.parse(response.text);
      return {
        title: parsed.title || "Walking in Faith",
        content: parsed.content || "Today, let's remember that God has a wonderful plan for our lives...",
        prayer: parsed.prayer || "Dear Lord, thank you for your love and guidance. Amen.",
      };
    } catch (error) {
      logger.error(
        "Error generating devotional:",
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message
          : String(error)
      );
      return {
        title: "Walking in Faith",
        content: "Today, let's remember that God has a wonderful plan for our lives.",
        prayer: "Dear Lord, thank you for your love and guidance. Amen.",
      };
    }
  }

  async generateLesson(
    topic: string,
    ageGroup?: string,
    duration?: number,
    difficulty?: string,
    userId?: number,
    childId?: number,
    childContext?: string
  ): Promise<any> {
    const systemPrompt = `You are a Christian lesson planner creating engaging and age-appropriate Bible lessons.`;
    const prompt = `Create a lesson on the topic "${topic}" for ${ageGroup || "all ages"} children. 
    Duration: ${duration || 30} minutes. Difficulty: ${difficulty || "beginner"}.
    Context: ${childContext || "No additional context provided."}`;

    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 800,
        temperature: 0.7,
      });
      return JSON.parse(response.text);
    } catch (error) {
      logger.error(
        "Error generating lesson:",
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message
          : String(error)
      );
      throw new Error("Failed to generate lesson.");
    }
  }

  async generateWeeklySummary({ familyId }: { familyId: number }): Promise<any> {
    const systemPrompt = `You are a Christian family counselor creating a weekly summary for parents.`;
    const prompt = `Generate a weekly summary for family ID ${familyId}. Include spiritual guidance, parental advice, and highlights.`;

    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 1200,
        temperature: 0.6,
      });
      return JSON.parse(response.text);
    } catch (error) {
      logger.error(
        "Error generating weekly summary:",
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message
          : String(error)
      );
      throw new Error("Failed to generate weekly summary.");
    }
  }

  async generateContentScan(
    prompt: string,
    systemPrompt: string,
    userId?: number,
    childId?: number,
    context?: string
  ): Promise<string> {
    try {
      const response = await this.generateResponse({
        prompt,
        systemPrompt,
        maxTokens: 500,
        temperature: 0.7,
      });
      return response.text;
    } catch (error) {
      logger.error(
        "Error generating content scan:",
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message
          : String(error)
      );
      throw new Error("Failed to generate content scan.");
    }
  }

  async fetchChildContext(childId: number): Promise<string> {
    // Mock implementation for fetching child context
    return `Child ID: ${childId}. Context includes preferences, age, and past activities.`;
  }
}

export const llmService = new LLMService();
