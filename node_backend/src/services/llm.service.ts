// src/services/LLMService.ts
import axios, { AxiosError } from "axios";
import logger from "../utils/logger";

/** ---------- Request/Response models your app uses ---------- */
interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface LLMResponse {
  text: string;
}

/** ---------- Environment helpers ---------- */
const requireEnv = (key: string) => {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is missing from environment variables`);
  return v;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** ---------- Runpod payload model (fixes TS 'prompt' access) ---------- */
type RunpodPayload = {
  prompt?: string;
  inputs?: string;
  instruction?: string;
  text?: string;

  // vLLM-ish controls (some workers accept both max_tokens & max_new_tokens)
  max_tokens?: number;
  max_new_tokens?: number;
  n?: number;
  best_of?: number;
  stream?: boolean;
  stop?: string[];
  use_beam_search?: boolean;
  temperature?: number;
  top_p?: number;

  // Chat-style
  messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;

  // Allow extra worker-specific fields without compiler complaints
  [key: string]: any;
};

/** ---------- Small utils ---------- */
function isProbablyJSON(s: string) {
  const t = s.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
}

function safeMinifyJSON(s: string) {
  try {
    return JSON.stringify(JSON.parse(s));
  } catch {
    return s;
  }
}

/** Try to normalize the Runpod /runsync output into a single string. */
function normalizeRunpodOutput(raw: any): string {
  // popular shapes:
  // { output: { text: ["..."] } }
  // { output: { text: "..."} }
  // { output: "..." }
  // { text: "..."} (rare)
  // or the whole thing is already a string

  const output = raw?.output ?? raw;

  let text: unknown =
    Array.isArray(output?.text) ? output.text.join("\n") :
    typeof output?.text === "string" ? output.text :
    typeof output === "string" ? output :
    typeof raw === "string" ? raw :
    "";

  // Coerce to string & strip null bytes / weird leading characters
  let s = String(text ?? "");
  s = s.replace(/\u0000/g, "").trim();

  // Some workers prepend chatter; try to locate first JSON block if present
  if (!isProbablyJSON(s)) {
    const firstBrace = s.indexOf("{");
    const firstBracket = s.indexOf("[");
    const cutAt = [firstBrace, firstBracket].filter((n) => n >= 0).sort((a, b) => a - b)[0];
    if (cutAt !== undefined) {
      const candidate = s.slice(cutAt).trim();
      if (isProbablyJSON(candidate)) s = candidate;
    }
  }

  return s;
}

/** ---------- The Service ---------- */
class LLMService {
  private apiKey: string;
  private endpointId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = requireEnv("RUNPOD_API_KEY");
    this.endpointId = requireEnv("RUNPOD_ENDPOINT_ID");
    this.baseUrl = `https://api.runpod.ai/v2/${this.endpointId}`;
  }

  /**
   * Low-level call to the Runpod endpoint (synchronous run).
   * Retries a couple times on transient network errors.
   *
   * NOTE: This accepts a rich RunpodPayload that includes an optional `prompt`.
   * We mirror that prompt into `inputs` / `instruction` / `text` to satisfy
   * different serverless handler expectations.
   */
  private async post(input: RunpodPayload, tries = 2): Promise<string> {
    const url = `${this.baseUrl}/runsync`;

    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const max = input.max_tokens ?? input.max_new_tokens ?? 600;

        // Mirror prompt into other fields the worker may look at
        const payload: RunpodPayload = {
          ...input,
          max_tokens: max,
          max_new_tokens: max,
          inputs: input.inputs ?? input.prompt ?? "",
          instruction: input.instruction ?? input.prompt ?? "",
          text: input.text ?? input.prompt ?? "",
        };

        const safeLog = {
          ...payload,
          prompt: `[len=${(payload.prompt ?? "").length}]`,
          inputs: `[len=${(payload.inputs ?? "").length}]`,
          instruction: `[len=${(payload.instruction ?? "").length}]`,
          text: `[len=${(payload.text ?? "").length}]`,
          messages: payload.messages ? payload.messages.map(m => ({ ...m, content: `[len=${m.content.length}]` })) : undefined,
        };
        logger.debug("[LLM] POST /runsync payload (safe):", safeLog);

        const { data } = await axios.post(
          url,
          { input: payload },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 60_000,
          }
        );

        // Log basic shape to help diagnose handler differences
        logger.debug("[LLM] /runsync response shape (top-level):", {
          delayTime: typeof data?.delayTime,
          executionTime: typeof data?.executionTime,
          id: typeof data?.id,
          output: typeof data?.output,
          status: typeof data?.status,
          workerId: typeof data?.workerId,
        });

        logger.debug("[LLM] /runsync output shape:", {
          input_tokens: typeof data?.output?.input_tokens,
          output_tokens: typeof data?.output?.output_tokens,
          text: Array.isArray(data?.output?.text)
            ? `array(len=${data.output.text.length})`
            : typeof data?.output?.text,
        });

        const normalized = normalizeRunpodOutput(data);
        logger.debug("[LLM] /runsync output.text[0] preview:", String(data?.output?.text?.[0] ?? "").slice(0, 60));
        logger.debug("[LLM] /runsync normalized output preview:", normalized.slice(0, 60));

        return normalized;
      } catch (err: unknown) {
        const axErr = err as AxiosError;
        const msg = (axErr?.response?.data as any)?.error ?? axErr?.message ?? "Unknown Runpod error";
        logger.error(`Runpod error (attempt ${attempt}/${tries}):`, msg);

        // Retry only on network-ish issues/timeouts
        if (
          attempt < tries &&
          (axErr.code === "ECONNRESET" ||
            axErr.code === "ECONNABORTED" ||
            axErr.message?.toLowerCase().includes("timeout") ||
            axErr.message?.toLowerCase().includes("network"))
        ) {
          await sleep(1000 * attempt);
          continue;
        }
        throw new Error("LLM request failed");
      }
    }
    throw new Error("LLM request failed");
  }

  /** Second-pass: ask the model to *reformat* messy text into strict JSON. */
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

  /** Generic prompt builder */
  public async generateResponse(req: LLMRequest): Promise<LLMResponse> {
    const prompt = req.systemPrompt
      ? `${req.systemPrompt}\n\n---\n${req.prompt}`
      : req.prompt;

    const text = await this.post({
      prompt,
      max_tokens: req.maxTokens ?? 600,
      max_new_tokens: req.maxTokens ?? 600,
      temperature: req.temperature ?? 0.7,
      top_p: 0.9,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
      messages: req.systemPrompt
        ? [
            { role: "system", content: req.systemPrompt },
            { role: "user", content: prompt },
          ]
        : [
            { role: "user", content: prompt },
          ],
    });

    return { text: text || "No response generated." };
  }

  /**
   * Ask the model to return STRICT JSON only; if it doesn’t, we try a
   * second pass via the JSON reformatter and finally fall back to {}
   */
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

    // First attempt
    let raw = first.text ?? "";
    if (isProbablyJSON(raw)) {
      try {
        return JSON.parse(safeMinifyJSON(raw));
      } catch {
        // continue to second pass
      }
    }

    logger.warn("[LLM] Returned non-JSON (first pass). Attempting JSON reformat…", {
      preview: raw.slice(0, 60),
    });

    // Second pass
    try {
      const reformatted = await this.reformatToStrictJSON(schemaHint, raw);
      if (isProbablyJSON(reformatted)) {
        return JSON.parse(safeMinifyJSON(reformatted));
      }
      logger.warn("[LLM] Second pass still not JSON; using empty object fallback", {
        preview: reformatted.slice(0, 60),
      });
    } catch (e) {
      logger.warn("[LLM] JSON reformat failed; using empty object fallback", (e as Error)?.message);
    }

    return {} as T;
  }

  // ------------- App-facing helpers -------------

  public async generateChatResponse(
    prompt: string,
    context?: string,
    _userId?: number
  ): Promise<string> {
    const system = context || "parent dashboard";
    try {
      const { text } = await this.generateResponse({
        prompt,
        systemPrompt: system,
        maxTokens: 400,
        temperature: 0.7,
      });

      // Some handlers produce partial answers; if suspiciously short, ask for continuation once.
      if (text && text.trim().split(/\s+/).length < 12) {
        const cont = await this.post({
          prompt: `${system}\n\n---\nContinue the previous answer. Do not repeat text. Keep the same style and finish the thought.`,
          temperature: 0.6,
          top_p: 0.95,
          max_tokens: 512,
          messages: [
            { role: "system", content: system },
            { role: "user", content: `${system}\n\n---\nContinue the previous answer. Do not repeat text. Keep the same style and finish the thought.` },
          ],
        });
        return `${text}\n${cont}`.trim();
      }

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
      `Provide a family-friendly Bible Verse of the Day (ESV or NIV) with a two-sentence reflection and a one-sentence prayer. Format as MINIFIED JSON.`,
      { maxTokens: 900, temperature: 0.2 }
    );

    // Safe defaults if the model misbehaves
    return {
      verse:
        out.verse ||
        "Trust in the Lord with all your heart and lean not on your own understanding.",
      reference: out.reference || "Proverbs 3:5",
      reflection:
        out.reflection ||
        "God's wisdom guides us even when the way forward seems unclear.",
      prayer:
        out.prayer ||
        "Lord, help us trust You fully today. Amen.",
    };
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
    // Placeholder: replace when you store per-child context
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
    const schema = `Return JSON with keys: title (string), objectives (string[]), scripture (string[]), activities (string[]), discussion (string[]), memoryVerse (string).`;

    const prompt = `Create a lesson on the topic "${topic}" for ${ageGroup || "all ages"} children.
Duration: ${duration || 30} minutes. Difficulty: ${difficulty || "beginner"}.
Context: ${childContext || "No additional context provided."}`;

    return await this.generateStrictJSON<any>(schema, prompt, {
      maxTokens: 800,
      temperature: 0.7,
    });
  }

  public async generateWeeklySummary({
    familyId,
  }: {
    familyId: number;
  }): Promise<any> {
    const schema = `Return JSON with keys: summary (string), parentalAdvice (string[]), spiritualGuidance (string), highlights (string[]).`;
    const prompt = `Generate a weekly family summary for family ID ${familyId}.
Include JSON keys exactly as in the schema. Keep items concise.`;

    return await this.generateStrictJSON<any>(schema, prompt, {
      maxTokens: 1200,
      temperature: 0.6,
    });
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
