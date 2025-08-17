// src/services/LLMService.ts
import axios, { AxiosError } from "axios";
import logger from "../utils/logger";
import { db } from "@/db/db";
import { sql } from "drizzle-orm";

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

/** Extract the first balanced JSON object/array substring from free-form text. */
function extractFirstJSON(input: string): string | undefined {
  const s = String(input ?? "");
  const len = s.length;
  let inString = false;
  let escape = false;
  let start = -1;
  const stack: string[] = [];

  for (let i = 0; i < len; i++) {
    const ch = s[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{" || ch === "[") {
      if (start === -1) start = i;
      stack.push(ch);
      continue;
    }

    if (ch === "}" || ch === "]") {
      if (stack.length === 0) {
        start = -1;
        continue;
      }
      const open = stack.pop()!;
      if ((open === "{" && ch !== "}") || (open === "[" && ch !== "]")) {
        start = -1;
        stack.length = 0;
        continue;
      }
      if (stack.length === 0 && start !== -1) {
        const candidate = s.slice(start, i + 1).trim();
        if (isProbablyJSON(candidate)) {
          return candidate;
        }
        start = -1;
      }
    }
  }

  return undefined;
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
  // Remove null bytes and Unicode replacement chars (often show as ���)
  s = s.replace(/\u0000/g, "").replace(/\uFFFD/g, "").trim();

  // Remove common code-fence wrappers if present
  if (s.startsWith("```")) {
    const first = s.indexOf("\n");
    const lastFence = s.lastIndexOf("```");
    if (first >= 0 && lastFence > first) {
      s = s.slice(first + 1, lastFence).trim();
    }
  }

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

/** Markers to force the model to wrap JSON so we can extract it reliably */
const JSON_START = "<JSON>";
const JSON_END = "</JSON>";

/** Extract content between start/end markers (strict) */
function extractBetweenMarkers(s: string, start: string, end: string): string | undefined {
  if (!s) return undefined;
  const i = s.indexOf(start);
  if (i === -1) return undefined;
  const j = s.indexOf(end, i + start.length);
  if (j === -1) return undefined;
  return s.slice(i + start.length, j).trim();
}

/** Normalize slightly-invalid JSON produced by LLMs */
function normalizeJsonish(str: string): string {
  let s = String(str ?? "");
  // Normalize smart quotes
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, "$1");
  // Remove code fences if wrapped
  if (s.startsWith("```")) {
    const first = s.indexOf("\n");
    const last = s.lastIndexOf("```");
    if (first >= 0 && last > first) s = s.slice(first + 1, last).trim();
  }
  return s.trim();
}

/**
 * Loose extractor: if output contains <JSON, take the substring from the first "{"
 * after the marker up to the last "}" in the whole string. Handles missing </JSON>.
 */
function extractLooseJSONFromMarkers(raw: string): string | undefined {
  const s = String(raw ?? "");
  const startIdx = s.indexOf("<JSON");
  if (startIdx === -1) return undefined;
  const firstBrace = s.indexOf("{", startIdx);
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return undefined;
  return s.slice(firstBrace, lastBrace + 1).trim();
}

/** Extract Verse/Reference/Reflection/Prayer from labeled prose if model ignores JSON */
function parseLabeledVOTD(text: string): Partial<{ verse: string; reference: string; reflection: string; prayer: string }> {
  const s = (text || "").replace(/\u0000/g, "").replace(/\uFFFD/g, "");
  const take = (label: string) => {
    const m = new RegExp(`${label}\\s*[:\\-]\\s*([\\s\\S]*?)(?:\\n\\s*\\w+\\s*[:\\-]|$)`, "i").exec(s);
    return m && m[1] ? m[1].trim().replace(/^["'`]+|["'`]+$/g, "") : undefined;
  };
  return {
    verse: take("verse"),
    reference: take("reference"),
    reflection: take("reflection"),
    prayer: take("prayer"),
  };
}

/** Extract Title/Content/Prayer from labeled devotional prose (defensive) */
function parseLabeledDevotional(text: string): Partial<{ title: string; content: string; prayer: string }> {
  const s = (text || "").replace(/\u0000/g, "").replace(/\uFFFD/g, "");
  const buildAlt = (labels: string[]) =>
    labels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

  const take = (labels: string[]) => {
    const alt = buildAlt(labels);
    const pattern = `(?:${alt})\\s*[:\\-]\\s*([\\s\\S]*?)(?:\\n\\s*(?:TITLE|CONTENT|PRAYER)\\s*[:\\-]|$)`;
    const m = new RegExp(pattern, "i").exec(s);
    const v = m && m[1] ? m[1].trim().replace(/^["'`]+|["'`]+$/g, "") : undefined;
    return v;
  };

  return {
    title: take(["title"]),
    content: take(["content", "devotional", "message", "body", "text"]),
    prayer: take(["prayer"]),
  };
}

/** Build a single-string vLLM-style prompt that embeds the schema + explicit JSON template (when provided) */
function buildStrictJSONPrompt(schemaHint: string, userPrompt: string, template?: string): string {
  const schemaLine = `Schema: ${schemaHint.trim()}`;
  const templateLine = template ? `Use EXACTLY this minified shape: ${template.trim()}` : "";
  const wrapLine = `Wrap the JSON ONLY between ${JSON_START} and ${JSON_END}. Do not add any other text.`;
  const sys = `You output ONLY strict, MINIFIED JSON. No markdown, no prose, no code fences. ${schemaLine} ${templateLine} ${wrapLine}`.trim();
  return `SYSTEM: ${sys}\nUSER: ${userPrompt.trim()}\nASSISTANT:`;
}

/** Guidance the chat model follows on the Parent Dashboard */
const PARENT_DASHBOARD_SYSTEM = [
  "You are a concise, warm Christian family assistant for parents.",
  "Style: short, clear, practical. Avoid fluff and generic disclaimers.",
  "Ground answers in Scripture when relevant, with short references (e.g., Proverbs 3:5).",
  "Do not repeat the user's question; answer directly. Use bullets for lists."
].join(" ");

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

  /** Persist a generated content row; errors are logged but do not throw */
  private async saveGenerated(params: {
    contentType: string;
    prompt: string;
    systemPrompt?: string | null;
    generatedContent: string;
    userId?: number | null;
    childId?: number | null;
    context?: string | null;
    tokensUsed?: number | null;
    generationTimeMs?: number | null;
  }) {
    const {
      contentType,
      prompt,
      systemPrompt,
      generatedContent,
      userId,
      childId,
      context,
      tokensUsed,
      generationTimeMs,
    } = params;

    // Enforce table constraints
    const ct = String(contentType || "unknown").slice(0, 50); // VARCHAR(50)
    const ctx = context == null ? null : String(context).slice(0, 100); // VARCHAR(100)
    const tok = Number.isFinite(tokensUsed as any) ? Number(tokensUsed) : null;
    const genMs = Number.isFinite(generationTimeMs as any) ? Number(generationTimeMs) : null;

    try {
      await db.execute(sql`
        INSERT INTO llm_generated_content
          (content_type, prompt, system_prompt, generated_content, user_id, child_id, context, tokens_used, generation_time_ms)
        VALUES
          (${ct}, ${String(prompt ?? "")}, ${systemPrompt ?? null}, ${String(generatedContent ?? "")},
           ${userId ?? null}, ${childId ?? null}, ${ctx}, ${tok}, ${genMs})
      `);
      logger.debug("[LLM] Persisted llm_generated_content", { contentType: ct });
    } catch (e) {
      logger.warn("[LLM] Failed to persist llm_generated_content", (e as Error)?.message);
    }
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
  private async reformatToStrictJSON(schemaHint: string, messy: string, template?: string): Promise<string> {
    const strictPrompt = buildStrictJSONPrompt(
      schemaHint,
      `Convert the following content to strict, MINIFIED JSON that matches the SCHEMA. Output JSON ONLY.\nContent:\n${messy}`,
      template
    );
    const out = await this.post({
      // flat fields only; many RunPod handlers ignore messages
      prompt: strictPrompt,
      inputs: strictPrompt,
      instruction: strictPrompt,
      text: strictPrompt,
      max_tokens: 700,
      max_new_tokens: 700,
      temperature: 0, // force deterministic formatting
      top_p: 1,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
      messages: undefined,
    });
    return out;
  }

  /** Generic prompt builder that prefers chat messages over raw prompt */
  public async generateResponse(req: LLMRequest): Promise<LLMResponse> {
    const system = req.systemPrompt || PARENT_DASHBOARD_SYSTEM;
    const prompt = `${system}\n\n---\n${req.prompt}`;
    const text = await this.post({
      prompt,
      max_tokens: req.maxTokens ?? 600,
      max_new_tokens: req.maxTokens ?? 600,
      temperature: req.temperature ?? 0.5,
      top_p: 0.9,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: req.prompt },
      ],
    });
    return { text: text || "No response generated." };
  }

  /**
   * Strict JSON generation path with optional explicit JSON template.
   */
  public async generateStrictJSON<T = any>(
    schemaHint: string,
    userPrompt: string,
    opts?: { maxTokens?: number; temperature?: number },
    template?: string
  ): Promise<T> {
    const strictPrompt = buildStrictJSONPrompt(schemaHint, userPrompt, template);

    // First attempt: flat prompt only (no messages)
    const firstRaw = await this.post({
      prompt: strictPrompt,
      inputs: strictPrompt,
      instruction: strictPrompt,
      text: strictPrompt,
      max_tokens: opts?.maxTokens ?? 900,
      max_new_tokens: opts?.maxTokens ?? 900,
      temperature: opts?.temperature ?? 0, // lower temp for strict JSON
      top_p: 0.9,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
      messages: undefined,
    });

    // 0a) Loose JSON extraction when markers are present but malformed
    const loose = extractLooseJSONFromMarkers(firstRaw);
    if (loose) {
      const cand = normalizeJsonish(loose);
      if (isProbablyJSON(cand)) {
        try { return JSON.parse(safeMinifyJSON(cand)); } catch { /* continue */ }
      }
    }

    // 0b) Strict markers first
    const marked = extractBetweenMarkers(firstRaw, JSON_START, JSON_END);
    if (marked) {
      const cand = normalizeJsonish(marked);
      if (isProbablyJSON(cand)) {
        try { return JSON.parse(safeMinifyJSON(cand)); } catch { /* continue */ }
      }
    }

    // 1) Direct JSON parse
    if (isProbablyJSON(firstRaw)) {
      try { return JSON.parse(safeMinifyJSON(firstRaw)); } catch {}
    }

    // 2) Extract JSON substring from messy output
    const extracted = extractFirstJSON(firstRaw);
    if (extracted) {
      const cand = normalizeJsonish(extracted);
      if (isProbablyJSON(cand)) {
        try { return JSON.parse(safeMinifyJSON(cand)); } catch {}
      }
    }

    // 3) Try labeled parsers (VOTD/Devotional)
    const votd = parseLabeledVOTD(firstRaw);
    if (votd.verse || votd.reference || votd.reflection || votd.prayer) {
      // @ts-ignore accept partial
      return votd as T;
    }
    const devo = parseLabeledDevotional(firstRaw);
    if (devo.title || devo.content || devo.prayer) {
      // @ts-ignore accept partial
      return devo as T;
    }

    // 4) Second pass with reformatter (then try markers again)
    try {
      const reformatted = await this.reformatToStrictJSON(schemaHint, firstRaw, template);

      // Try markers again
      const marked2 = extractBetweenMarkers(reformatted, JSON_START, JSON_END);
      if (marked2 && isProbablyJSON(marked2)) {
        try { return JSON.parse(safeMinifyJSON(marked2)); } catch {}
      }

      const extracted2 = extractFirstJSON(reformatted) || reformatted;
      if (isProbablyJSON(extracted2)) {
        return JSON.parse(safeMinifyJSON(extracted2));
      }
      logger.warn("[LLM] Second pass still not JSON; using empty object fallback", {
        preview: String(reformatted).slice(0, 120),
      });
    } catch (e) {
      logger.warn("[LLM] JSON reformat failed; using empty object fallback", (e as Error)?.message);
    }

    return {} as T;
  }

  public async generateVerseOfTheDay(): Promise<{
    verse: string;
    reference: string;
    reflection: string;
    prayer: string;
  }> {
    const schema = `Return JSON with keys: verse (string), reference (string), reflection (string), prayer (string).`;
    const template = `{"verse":"","reference":"","reflection":"","prayer":""}`;

    const out = await this.generateStrictJSON<{
      verse?: string;
      reference?: string;
      reflection?: string;
      prayer?: string;
    }>(
      schema,
      `Provide a family-friendly Bible Verse of the Day (ESV or NIV) with a two-sentence reflection and a one-sentence prayer. Return MINIFIED JSON only.`,
      { maxTokens: 900, temperature: 0 }, // deterministic
      template
    );

    const usedFallback = !out.verse || !out.reference || !out.reflection || !out.prayer;
    // Persist what we got (JSON or fallback) so you can audit later
    try {
      await this.saveGenerated({
        contentType: "verse_of_the_day",
        prompt: "VOTD request",
        systemPrompt: "Strict JSON schema: verse, reference, reflection, prayer",
        generatedContent: JSON.stringify(out),
        userId: null,
        childId: null,
        context: "votd",
      });
    } catch { /* already handled in helper */ }

    if (usedFallback) {
      logger.warn("[VOTD] Using fallback values because LLM JSON was invalid or incomplete.");
    } else {
      logger.debug("[VOTD] LLM JSON parsed successfully.", { reference: out.reference?.slice(0, 40) });
    }

    return {
      verse: out.verse || "Trust in the Lord with all your heart and lean not on your own understanding.",
      reference: out.reference || "Proverbs 3:5",
      reflection: out.reflection || "God's wisdom guides us even when the way forward seems unclear.",
      prayer: out.prayer || "Lord, help us trust You fully today. Amen.",
    };
  }

  public async generateDevotional(
    topic?: string
  ): Promise<{ title: string; content: string; prayer: string }> {
    const schema = `Return JSON with keys: title (string), content (string), prayer (string).`;
    const template = `{"title":"","content":"","prayer":""}`;

    const prompt = topic
      ? `Create a short family devotional about "${topic}". Keep it warm, Scripture-centered, and practical. Return MINIFIED JSON only.`
      : `Create a short family devotional focused on growing closer to Jesus. Keep it warm, Scripture-centered, and practical. Return MINIFIED JSON only.`;

    const out = await this.generateStrictJSON<{
      title?: string;
      content?: string;
      prayer?: string;
    }>(schema, prompt, { maxTokens: 900, temperature: 0.05 }, template);

    // Persist response (even if fallback)
    try {
      await this.saveGenerated({
        contentType: "devotional",
        prompt,
        systemPrompt: "Strict JSON schema: title, content, prayer",
        generatedContent: JSON.stringify(out),
        userId: null,
        childId: null,
        context: topic || "devotional",
      });
    } catch {}

    return {
      title: out.title || "Walking in Faith",
      content: out.content || "Today, let's remember that God has a wonderful plan for our lives...",
      prayer: out.prayer || "Dear Lord, thank you for your love and guidance. Amen.",
    };
  }

  // ------------- App-facing helpers -------------

  public async generateChatResponse(
    prompt: string,
    context?: string,
    _userId?: number
  ): Promise<string> {
    const system = context || "parent dashboard";
    try {
      const started = Date.now();
      const { text } = await this.generateResponse({
        prompt,
        systemPrompt: system,
        maxTokens: 400,
        temperature: 0.7,
      });
      const first = text || "";

      let finalText = first;
      if (first && first.trim().split(/\s+/).length < 12) {
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
        finalText = `${first}\n${cont}`.trim();
      }

      // Persist chat exchange
      try {
        await this.saveGenerated({
          contentType: "chat",
          prompt,
          systemPrompt: system,
          generatedContent: finalText,
          userId: _userId ?? null,
          childId: null,
          context: context || "parent dashboard",
          tokensUsed: null,
          generationTimeMs: Date.now() - started,
        });
      } catch {}

      return finalText;
    } catch (e: any) {
      logger.error("generateChatResponse error", e?.message || e);
      return "I'm having trouble connecting right now. Please try again later.";
    }
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

    // Persist
    try {
      await this.saveGenerated({
        contentType: "lesson",
        prompt,
        systemPrompt: "Strict JSON schema: title, objectives[], scripture[], activities[], discussion[], memoryVerse",
        generatedContent: JSON.stringify(result),
        userId: _userId ?? null,
        childId: _childId ?? null,
        context: childContext || null,
      });
    } catch {}

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

    // Persist
    try {
      await this.saveGenerated({
        contentType: "weekly_summary",
        prompt,
        systemPrompt: "Strict JSON schema: summary, parentalAdvice[], spiritualGuidance, highlights[]",
        generatedContent: JSON.stringify(result),
        userId: null,
        childId: null,
        context: `family:${familyId}`,
      });
    } catch {}

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

    // Persist
    try {
      await this.saveGenerated({
        contentType: "content_scan",
        prompt,
        systemPrompt,
        generatedContent: text,
        userId: _userId ?? null,
        childId: _childId ?? null,
        context: _context ?? null,
      });
    } catch {}

    return text;
  }
}

export const llmService = new LLMService();
