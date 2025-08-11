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

const requireEnv = (key: string) => {
  const v = process.env[key];
  if (!v) {
    throw new Error(`${key} is missing from environment variables`);
  }
  return v;
};

class LLMService {
  private apiKey: string;
  private endpointId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = requireEnv("RUNPOD_API_KEY");
    this.endpointId = requireEnv("RUNPOD_ENDPOINT_ID");
    this.baseUrl = `https://api.runpod.ai/v2/${this.endpointId}`;
  }

  /** Low-level call to Runpod endpoint */
  private async post(input: any): Promise<string> {
    const url = `${this.baseUrl}/runsync`; // synchronous call
    try {
      const { data } = await axios.post(
        url,
        { input },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60_000,
        }
      );

      // Accept common response shapes
      const text =
        (typeof data?.output === "string" && data.output) ||
        (data?.output?.text && data.output.text) ||
        (typeof data === "string" ? data : "");

      return String(text || "");
    } catch (err: any) {
      logger.error("Runpod error", err?.response?.data || err?.message);
      throw new Error("LLM request failed");
    }
  }

  /** Generic prompt builder */
  public async generateResponse(req: LLMRequest): Promise<LLMResponse> {
    const prompt = req.systemPrompt
      ? `${req.systemPrompt}\n\n---\n${req.prompt}`
      : req.prompt;

    const text = await this.post({
      prompt,
      max_new_tokens: req.maxTokens ?? 600,
      temperature: req.temperature ?? 0.7,
      top_p: 0.9,
    });

    return { text: text || "No response generated." };
  }

  /** Force strict JSON from the model */
  public async generateStrictJSON<T = any>(
    schemaHint: string,
    userPrompt: string,
    opts?: { maxTokens?: number; temperature?: number }
  ): Promise<T> {
    const system = `You are a helpful assistant. ALWAYS reply with STRICT JSON only. No markdown, no code fences, no commentary. ${schemaHint}`;
    const { text } = await this.generateResponse({
      prompt: userPrompt,
      systemPrompt: system,
      maxTokens: opts?.maxTokens ?? 800,
      temperature: opts?.temperature ?? 0.7,
    });
    try {
      return JSON.parse(text) as T;
    } catch {
      logger.warn("LLM returned non-JSON; falling back", { text: text?.slice(0, 200) });
      return {} as T;
    }
  }

  // ---------- Methods your app already calls ----------

  public async generateChatResponse(
    prompt: string,
    context?: string,
    _userId?: number
  ): Promise<string> {
    const system = context || "You are a helpful Christian AI assistant.";
    try {
      const { text } = await this.generateResponse({
        prompt,
        systemPrompt: system,
        maxTokens: 400,
        temperature: 0.7,
      });
      return text;
    } catch (e: any) {
      logger.error("generateChatResponse error", e?.message || e);
      return "I'm having trouble connecting right now. Please try again later.";
    }
  }

  public async generateVerseOfTheDay(): Promise<{
    verse: string;
    reference: string;
    reflection: string;
  }> {
    const schema = `Return JSON with keys: verse (string), reference (string), reflection (string).`;
    const out = await this.generateStrictJSON<{
      verse?: string;
      reference?: string;
      reflection?: string;
    }>(
      schema,
      `Provide a family-friendly Bible Verse of the Day (ESV or NIV), with a short reflection (2-3 sentences).`
    );

    return {
      verse:
        out.verse ||
        "Trust in the Lord with all your heart and lean not on your own understanding.",
      reference: out.reference || "Proverbs 3:5",
      reflection:
        out.reflection ||
        "God's wisdom guides us even when the path isn't clear.",
    };
  }

  public async generateDevotional(
    topic?: string
  ): Promise<{ title: string; content: string; prayer: string }> {
    const system = `You are a Christian devotional writer creating daily devotionals for families with children.
Respond ONLY with JSON.
Schema: { "title": string, "content": string, "prayer": string }`;

    const prompt = topic
      ? `Create a family devotional about ${topic}.`
      : `Create a daily devotional for a Christian family focusing on growing closer to Jesus.`;

    const out = await this.generateStrictJSON<{
      title?: string;
      content?: string;
      prayer?: string;
    }>(`Return JSON with keys: title, content, prayer.`, prompt, {
      maxTokens: 600,
      temperature: 0.7,
    });

    return {
      title: out.title || "Walking in Faith",
      content:
        out.content ||
        "Today, let's remember that God has a wonderful plan for our lives...",
      prayer:
        out.prayer || "Dear Lord, thank you for your love and guidance. Amen.",
    };
  }

  public async fetchChildContext(childId: number): Promise<string> {
    // Placeholder: replace with actual context fetch if you store it
    return `Child ID: ${childId}. Context includes preferences, age, and past activities.`;
  }

  public async generateLesson(
    topic: string,
    ageGroup?: string,
    duration?: number,
    difficulty?: string,
    _userId?: number,
    _childId?: number,
    childContext?: string
  ): Promise<any> {
    const system = `You are a Christian lesson planner creating engaging and age-appropriate Bible lessons.
Respond ONLY with JSON. The lesson should include: title, objectives[], scripture[], activities[], discussion[], memoryVerse.`;

    const prompt = `Create a lesson on the topic "${topic}" for ${
      ageGroup || "all ages"
    } children.
Duration: ${duration || 30} minutes. Difficulty: ${difficulty || "beginner"}.
Context: ${childContext || "No additional context provided."}`;

    return await this.generateStrictJSON<any>(
      `Return JSON with keys: title (string), objectives (string[]), scripture (string[]), activities (string[]), discussion (string[]), memoryVerse (string).`,
      prompt,
      { maxTokens: 800, temperature: 0.7 }
    );
  }

  public async generateWeeklySummary({
    familyId,
  }: {
    familyId: number;
  }): Promise<any> {
    const system = `You are a Christian family counselor. Respond ONLY with JSON.`;
    const prompt = `Generate a weekly family summary for family ID ${familyId}.
Include JSON keys: summary (string), parentalAdvice (string[]), spiritualGuidance (string), highlights (string[]).`;

    return await this.generateStrictJSON<any>(
      `Return JSON with keys: summary, parentalAdvice[], spiritualGuidance, highlights[].`,
      prompt,
      { maxTokens: 1200, temperature: 0.6 }
    );
  }

  public async generateContentScan(
    prompt: string,
    systemPrompt: string,
    _userId?: number,
    _childId?: number,
    _context?: string
  ): Promise<string> {
    const { text } = await this.generateResponse({
      prompt,
      systemPrompt,
      maxTokens: 500,
      temperature: 0.7,
    });
    return text;
  }
}

export const llmService = new LLMService();