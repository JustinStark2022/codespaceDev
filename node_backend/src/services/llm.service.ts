import logger from "../utils/logger";
import { RunpodClient } from "./llm/runpod-client";
import { saveGeneratedContent } from "./llm/persistence";
import { 
  extractFirstJSON, 
  normalizeRunpodOutput, 
  sanitizeText 
} from "./llm/response-normalizer";
import { 
  isProbablyJSON, 
  safeMinifyJSON, 
  tokenBudgetFromPrompt, 
  isComplexQuestion 
} from "./llm/utils";
import { PARENT_DASHBOARD_SYSTEM } from "./llm/prompt-builder";
import { 
  LLMRequest, 
  LLMResponse, 
  RunpodPayload 
} from "./llm/types";

class LlmService {
  private client: RunpodClient;

  constructor() {
    this.client = new RunpodClient();
  }

  private async post(input: RunpodPayload, tries = 2): Promise<string> {
    return this.client.post(input, tries);
  }

  private async reformatToStrictJSON(schemaHint: string, messy: string): Promise<string> {
    const prompt = [
      "You are a JSON reformatter. You take arbitrary text and output ONLY minified JSON matching the given schema.",
      "",
      "---",
      "SCHEMA:",
      schemaHint.trim(),
      "",
      "TASK:",
      "Convert the following content to STRICT, MINIFIED JSON that matches the SCHEMA. Output JSON ONLY, no prose, no code fences. Content:",
      messy,
    ].join("\n");

    const out = await this.post({
      prompt,
      temperature: 0,
      top_p: 1,
      max_tokens: 700,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
      messages: [
        { role: "system", content: "You are a JSON reformatter. Output only strict, minified JSON." },
        { role: "user", content: prompt },
      ],
    });

    return out;
  }

  public async generateResponse(req: LLMRequest): Promise<LLMResponse> {
    const systemContent = req.systemPrompt ? req.systemPrompt : undefined;
    const budget = req.maxTokens ?? tokenBudgetFromPrompt(req.prompt, 480);

    const text = await this.post({
      messages: [
        ...(systemContent ? [{ role: "system" as const, content: systemContent }] : []),
        { role: "user", content: req.prompt },
      ],
      max_tokens: budget,
      max_new_tokens: budget,
      temperature: req.temperature ?? 0.35,
      top_p: 0.9,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
    });

    return { text: text || "No response generated." };
  }

  public async generateStrictJSON<T = any>(
    schemaHint: string,
    userPrompt: string,
    opts?: { maxTokens?: number; temperature?: number }
  ): Promise<T> {
    const system = `You are a helpful assistant. ALWAYS reply with STRICT JSON only. No markdown, no code fences, no commentary.\n${schemaHint}`;
    const first = await this.generateResponse({
      prompt: userPrompt,
      systemPrompt: system,
      maxTokens: opts?.maxTokens ?? 800,
      temperature: opts?.temperature ?? 0.7,
    });

    let raw = first.text ?? "";

    if (isProbablyJSON(raw)) {
      try {
        return JSON.parse(safeMinifyJSON(raw));
      } catch {
        // continue
      }
    }

    const extracted = extractFirstJSON(raw);
    if (extracted && isProbablyJSON(extracted)) {
      try {
        return JSON.parse(safeMinifyJSON(extracted));
      } catch {
        // continue
      }
    }

    logger.warn("[LLM] Returned non-JSON (first pass). Attempting JSON reformat…", {
      preview: raw.slice(0, 120),
    });

    try {
      const reformatted = await this.reformatToStrictJSON(schemaHint, raw);
      const extracted2 = extractFirstJSON(reformatted) || reformatted;
      if (isProbablyJSON(extracted2)) {
        return JSON.parse(safeMinifyJSON(extracted2));
      }
      logger.warn("[LLM] Second pass still not JSON; using empty object fallback", {
        preview: reformatted.slice(0, 120),
      });
    } catch (e) {
      logger.warn("[LLM] JSON reformat failed; using empty object fallback", (e as Error)?.message);
    }

    return {} as T;
  }

  public async generateChatResponse(
    prompt: string,
    context?: string,
    _userId?: number
  ): Promise<string> {
    const system = [PARENT_DASHBOARD_SYSTEM, context].filter(Boolean).join(" ");
    const started = Date.now();
    try {
      const firstBudget = tokenBudgetFromPrompt(prompt, 512);
      const { text } = await this.generateResponse({
        prompt,
        systemPrompt: system,
        maxTokens: firstBudget,
        temperature: 0.33,
      });

      const cleaned = sanitizeText(text);
      const words = (cleaned || "").trim().split(/\s+/).length;
      const promptComplex = isComplexQuestion(prompt);

      let finalOut = cleaned;
      if ((words < 60 && promptComplex) || words < 25) {
        const contBudget = Math.max(600, Math.floor(firstBudget * 0.75));
        const cont = await this.post({
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content:
                "Expand the previous answer into a complete, well-structured response. " +
                "Use short paragraphs and bullet points where helpful. Do not repeat prior sentences; continue and enrich.",
            },
          ],
          temperature: 0.33,
          top_p: 0.9,
          max_tokens: contBudget,
        });
        finalOut = sanitizeText(`${cleaned}\n\n${cont}`.trim());
      }

      await saveGeneratedContent({
        contentType: "chat",
        prompt,
        systemPrompt: system,
        generatedContent: finalOut,
        userId: _userId ?? null,
        childId: null,
        context: context || "parent dashboard",
        tokensUsed: null,
        generationTimeMs: Date.now() - started,
      });

      return finalOut;
    } catch (e: any) {
      logger.error("generateChatResponse error", e?.message || e);
      return "I'm having trouble connecting right now. Please try again later.";
    }
  }

  public async generateVerseOfTheDay(): Promise<{
    verse: string;
    reference: string;
    reflection: string;
    prayer: string;
  }> {
    const schema = `Return JSON with keys: verse (string), reference (string), reflection (string), prayer (string).`;

    const out = await this.generateStrictJSON<{
      verse?: string;
      reference?: string;
      reflection?: string;
      prayer?: string;
    }>(
      schema,
      `Provide a family-friendly Bible Verse of the Day (ESV or NIV) with a two-sentence reflection and a one-sentence prayer. Return MINIFIED JSON only.`,
      { maxTokens: 900, temperature: 0.15 }
    );

    const result = {
      verse:
        out.verse ||
        "Trust in the Lord with all your heart and lean not on your own understanding.",
      reference: out.reference || "Proverbs 3:5",
      reflection:
        out.reflection ||
        "God's wisdom guides us even when the way forward seems unclear.",
      prayer: out.prayer || "Lord, help us trust You fully today. Amen.",
    };

    await saveGeneratedContent({
      contentType: "verse_of_the_day",
      prompt: "VOTD request",
      systemPrompt: "Strict JSON schema: verse, reference, reflection, prayer",
      generatedContent: JSON.stringify(result),
      userId: null,
      childId: null,
      context: "votd",
    });

    return result;
  }

  public async generateDevotional(
    topic?: string
  ): Promise<{ title: string; content: string; prayer: string }> {
    const schema = `Return JSON with keys: title (string), content (string), prayer (string).`;

    const prompt = topic
      ? `Create a short family devotional about "${topic}". Keep it warm, Scripture-centered, and practical. Return MINIFIED JSON only.`
      : `Create a short family devotional focused on growing closer to Jesus. Keep it warm, Scripture-centered, and practical. Return MINIFIED JSON only.`;

    const out = await this.generateStrictJSON<{
      title?: string;
      content?: string;
      prayer?: string;
    }>(schema, prompt, { maxTokens: 900, temperature: 0.3 });

    const result = {
      title: out.title || "Walking in Faith",
      content: out.content || "Today, let's remember that God has a wonderful plan for our lives...",
      prayer: out.prayer || "Dear Lord, thank you for your love and guidance. Amen.",
    };

    await saveGeneratedContent({
      contentType: "devotional",
      prompt,
      systemPrompt: "Strict JSON schema: title, content, prayer",
      generatedContent: JSON.stringify(result),
      userId: null,
      childId: null,
      context: topic || "devotional",
    });

    return result;
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
    const schema = `Return JSON with keys: title (string), objectives (string[]), scripture (string[]), activities (string[]), discussion (string[]), memoryVerse (string).`;

    const prompt = `Create a lesson on the topic "${topic}" for ${ageGroup || "all ages"} children.
Duration: ${duration || 30} minutes. Difficulty: ${difficulty || "beginner"}.
Context: ${childContext || "No additional context provided."}`;

    const result = await this.generateStrictJSON<any>(schema, prompt, {
      maxTokens: 800,
      temperature: 0.7,
    });

    await saveGeneratedContent({
      contentType: "lesson",
      prompt,
      systemPrompt:
        "Strict JSON schema: title, objectives[], scripture[], activities[], discussion[], memoryVerse",
      generatedContent: JSON.stringify(result),
      userId: _userId ?? null,
      childId: _childId ?? null,
      context: childContext || null,
    });

    return result;
  }

  public async generateWeeklySummary({
    familyId,
  }: {
    familyId: number;
  }): Promise<any> {
    const schema = `Return JSON with keys: summary (string), parentalAdvice (string[]), spiritualGuidance (string), highlights (string[]).`;
    const prompt = `Generate a weekly family summary for family ID ${familyId}.
Include JSON keys exactly as in the schema. Keep items concise.`;

    const result = await this.generateStrictJSON<any>(schema, prompt, {
      maxTokens: 1200,
      temperature: 0.6,
    });

    await saveGeneratedContent({
      contentType: "weekly_summary",
      prompt,
      systemPrompt:
        "Strict JSON schema: summary, parentalAdvice[], spiritualGuidance, highlights[]",
      generatedContent: JSON.stringify(result),
      userId: null,
      childId: null,
      context: `family:${familyId}`,
    });

    return result;
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

    await saveGeneratedContent({
      contentType: "content_scan",
      prompt,
      systemPrompt,
      generatedContent: text,
      userId: _userId ?? null,
      childId: _childId ?? null,
      context: _context ?? null,
    });

    return text;
  }
}

export const llmService = new LlmService();
