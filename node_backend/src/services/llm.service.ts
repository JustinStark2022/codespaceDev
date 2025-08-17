import axios, { AxiosError } from "axios";
import logger from "@/utils/logger";
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ---------- Runpod payload model (fixes TS 'prompt' access) ---------- */
type RunpodPayload = {
  prompt?: string;
  inputs?: string;
  instruction?: string;
  text?: string;
  max_tokens?: number;
  max_new_tokens?: number;
  n?: number;
  best_of?: number;
  stream?: boolean;
  stop?: string[];
  use_beam_search?: boolean;
  temperature?: number;
  top_p?: number;
  messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  [key: string]: any;
};

/** ---------- Small utils (kept minimal & reusable) ---------- */
const isProbablyJSON = (s: string) => {
  const t = s.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
};

const minifyJson = (s: string) => {
  try {
    return JSON.stringify(JSON.parse(s));
  } catch {
    return s;
  }
};

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
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
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
      if (!stack.length) {
        start = -1;
        continue;
      }
      const open = stack.pop()!;
      if ((open === "{" && ch !== "}") || (open === "[" && ch !== "]")) {
        start = -1;
        stack.length = 0;
        continue;
      }
      if (!stack.length && start !== -1) {
        const candidate = s.slice(start, i + 1).trim();
        if (isProbablyJSON(candidate)) return candidate;
        start = -1;
      }
    }
  }
  return undefined;
}

/** Try to normalize the Runpod /runsync output into a single string. */
function normalizeRunpodOutput(raw: any): string {
  const output = raw?.output ?? raw;

  let text: unknown =
    Array.isArray(output?.text) ? output.text.join("\n") :
    typeof output?.text === "string" ? output.text :
    typeof output === "string" ? output :
    typeof raw === "string" ? raw :
    "";

  let s = String(text ?? "")
    .replace(/\u0000/g, "")
    .replace(/\uFFFD/g, "")
    .trim();

  // Remove code-fence wrappers if present
  if (s.startsWith("```")) {
    const first = s.indexOf("\n");
    const lastFence = s.lastIndexOf("```");
    if (first >= 0 && lastFence > first) s = s.slice(first + 1, lastFence).trim();
  }

  // If non-JSON with chatter, try from first brace/bracket
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

const extractBetweenMarkers = (s: string, start: string, end: string) => {
  if (!s) return undefined;
  const i = s.indexOf(start);
  if (i === -1) return undefined;
  const j = s.indexOf(end, i + start.length);
  if (j === -1) return undefined;
  return s.slice(i + start.length, j).trim();
};

function normalizeJsonish(str: string): string {
  let s = String(str ?? "");
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  s = s.replace(/,(\s*[}\]])/g, "$1");
  if (s.startsWith("```")) {
    const first = s.indexOf("\n");
    const last = s.lastIndexOf("```");
    if (first >= 0 && last > first) s = s.slice(first + 1, last).trim();
  }
  return s.trim();
}

/** Loose extraction when only a start marker exists and the end is missing */
function extractLooseJSONFromMarkers(raw: string): string | undefined {
  const s = String(raw ?? "");
  const startIdx = s.indexOf("<JSON");
  if (startIdx === -1) return undefined;
  const firstBrace = s.indexOf("{", startIdx);
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return undefined;
  return s.slice(firstBrace, lastBrace + 1).trim();
}

/** Parse labeled output for VOTD (defensive) */
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

/** Parse labeled output for Devotional (defensive) */
function parseLabeledDevotional(text: string): Partial<{ title: string; content: string; prayer: string }> {
  const s = (text || "").replace(/\u0000/g, "").replace(/\uFFFD/g, "");
  const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const take = (labels: string[]) => {
    const alt = labels.map(esc).join("|");
    const m = new RegExp(`(?:${alt})\\s*[:\\-]\\s*([\\s\\S]*?)(?:\\n\\s*(?:TITLE|CONTENT|PRAYER)\\s*[:\\-]|$)`, "i").exec(s);
    const v = m && m[1] ? m[1].trim().replace(/^["'`]+|["'`]+$/g, "") : undefined;
    return v;
  };
  return {
    title: take(["title"]),
    content: take(["content", "devotional", "message", "body", "text"]),
    prayer: take(["prayer"]),
  };
}

/** Build a single-string prompt that embeds the schema + explicit JSON template */
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

export class LlmService {
  private readonly apiKey = requireEnv("RUNPOD_API_KEY");
  private readonly endpointId = requireEnv("RUNPOD_ENDPOINT_ID");
  private readonly baseUrl = `https://api.runpod.ai/v2/${this.endpointId}`;

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

    const ct = String(contentType || "unknown").slice(0, 50);
    const ctx = context == null ? null : String(context).slice(0, 100);
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
   */
  private async post(input: RunpodPayload, tries = 2): Promise<string> {
    const url = `${this.baseUrl}/runsync`;

    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const max = input.max_tokens ?? input.max_new_tokens ?? 600;
        const payload: RunpodPayload = {
          ...input,
          max_tokens: max,
          max_new_tokens: max,
          inputs: input.inputs ?? input.prompt ?? "",
          instruction: input.instruction ?? input.prompt ?? "",
          text: input.text ?? input.prompt ?? "",
        };

        logger.debug("[LLM] POST /runsync payload (sizes only)", {
          prompt: String(payload.prompt ?? "").length,
          inputs: String(payload.inputs ?? "").length,
          instruction: String(payload.instruction ?? "").length,
          text: String(payload.text ?? "").length,
          hasMessages: Array.isArray(payload.messages),
        });

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

        logger.debug("[LLM] /runsync response shape", {
          status: typeof data?.status,
          outputType: typeof data?.output,
          textType: typeof data?.output?.text,
        });

        const normalized = normalizeRunpodOutput(data);
        return normalized;
      } catch (err: unknown) {
        const axErr = err as AxiosError;
        const msg = (axErr?.response?.data as any)?.error ?? axErr?.message ?? "Unknown Runpod error";
        logger.error(`Runpod error (attempt ${attempt}/${tries}):`, msg);

        const retryable =
          axErr.code === "ECONNRESET" ||
          axErr.code === "ECONNABORTED" ||
          axErr.message?.toLowerCase().includes("timeout") ||
          axErr.message?.toLowerCase().includes("network");

        if (attempt < tries && retryable) {
          await sleep(1000 * attempt);
          continue;
        }
        throw new Error("LLM request failed");
      }
    }
    throw new Error("LLM request failed");
  }

  /** Ask the model to reformat messy text into strict JSON. */
  private async reformatToStrictJSON(schemaHint: string, messy: string, template?: string): Promise<string> {
    const strictPrompt = buildStrictJSONPrompt(
      schemaHint,
      `Convert the following content to strict, MINIFIED JSON that matches the SCHEMA. Output JSON ONLY.\nContent:\n${messy}`,
      template
    );
    return this.post({
      prompt: strictPrompt,
      inputs: strictPrompt,
      instruction: strictPrompt,
      text: strictPrompt,
      max_tokens: 700,
      max_new_tokens: 700,
      temperature: 0,
      top_p: 1,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
      messages: undefined,
    });
  }

  /** Heuristic to decide if the model should continue generating more text */
  private needsContinuation(text: string, opts?: { expectBullets?: boolean; minWords?: number }): boolean {
    const s = String(text || "").trim();
    if (!s) return true;

    const words = s.split(/\s+/).filter(Boolean).length;
    if (opts?.minWords && words < opts.minWords) return true;

    if (opts?.expectBullets) {
      const bulletRe = /^\s*(?:[-*•]|[0-9]+\.)\s+/;
      const bullets = s.split(/\r?\n/).filter((l) => bulletRe.test(l)).length;
      if (bullets < 3) return true;
    }

    // End on sentence-like boundary
    return !/[.!?]"?\)?\s*$/.test(s);
  }

  /** Strip filler, UI chatter, and accidental role echoes from model text */
  private cleanLLMText(raw: string): string {
    return String(raw || "")
      .replace(/^\s*(SYSTEM|USER|ASSISTANT|ASSISTANT_SO_FAR|ASSISTANT_CONTINUE)\s*:.*$/gim, "")
      .replace(/^(Sure( thing)?|Certainly|Of course|Great|Hey there|Hello|Hi)[!,.]?\s*/gim, "")
      .split(/\r?\n/)
      .filter((ln) => !/(parent\s+dashboard|main\s+menu|click\s+on\s+the\s+"?Parent|access\s+the\s+parent\s+dashboard|navigation|menu\s+under)/i.test(ln))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\u0000|\uFFFD/g, "")
      .trim();
  }

  /** Ask the model to continue the previous response without repeating content */
  private async continueOnce(system: string, soFar: string, instruction: string, maxTokens = 400): Promise<string> {
    const user =
      `Continue only with new content to complete the response. ${instruction}.` +
      ` Do not repeat earlier text. No greetings, no apologies, no prefaces.` +
      ` Do not mention dashboards, menus, navigation, UI, login, or settings.`;
    const flat = `SYSTEM: ${system}\nASSISTANT_SO_FAR:\n${soFar}\nUSER: ${user}\nASSISTANT_CONTINUE:`;

    const out = await this.post({
      prompt: flat,
      inputs: flat,
      instruction: flat,
      text: flat,
      max_tokens: Math.max(200, maxTokens),
      max_new_tokens: Math.max(200, maxTokens),
      temperature: 0.5,
      top_p: 0.9,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
      messages: [
        { role: "system", content: system },
        { role: "assistant", content: soFar },
        { role: "user", content: user },
      ],
    });

    return this.cleanLLMText(String(out || "").trim());
  }

  /** Generic prompt builder that prefers chat messages over raw prompt */
  public async generateResponse(req: LLMRequest): Promise<LLMResponse> {
    const system = PARENT_DASHBOARD_SYSTEM;

    const constraints = req.systemPrompt
      ? `\n\nConstraints:\n${req.systemPrompt}\nDo not mention dashboards, menus, navigation, UI, login, or settings. No greetings or apologies.`
      : "";

    const userPrompt = `${req.prompt}${constraints}`.trim();
    const flat = `${system}\n\n---\n${userPrompt}`;

    const firstRaw = await this.post({
      prompt: flat,
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
        { role: "user", content: userPrompt },
      ],
    });

    let finalText = this.cleanLLMText(firstRaw || "No response generated.");

    // Auto-continue until complete
    const seen = new Set<string>();
    const expectBullets = /bullet|bullets|list/i.test(userPrompt) || /three/i.test(userPrompt);

    for (let i = 0; i < 8 && this.needsContinuation(finalText, { expectBullets, minWords: 60 }); i++) {
      const more = await this.continueOnce(system, finalText, "Keep format; add only missing content", req.maxTokens ?? 400);
      if (!more) break;

      const key = more.slice(0, 140);
      if (seen.has(key) || more.length < 20) break;
      seen.add(key);

      finalText = `${finalText}\n${more}`.trim();
    }

    finalText = this.cleanLLMText(finalText);
    return { text: finalText };
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

    const firstRaw = await this.post({
      prompt: strictPrompt,
      inputs: strictPrompt,
      instruction: strictPrompt,
      text: strictPrompt,
      max_tokens: opts?.maxTokens ?? 900,
      max_new_tokens: opts?.maxTokens ?? 900,
      temperature: opts?.temperature ?? 0,
      top_p: 0.9,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
      messages: undefined,
    });

    // Loose extraction first (handles missing </JSON>)
    const loose = extractLooseJSONFromMarkers(firstRaw);
    if (loose) {
      const cand = normalizeJsonish(loose);
      if (isProbablyJSON(cand)) {
        try { return JSON.parse(minifyJson(cand)); } catch {}
      }
    }

    // Then strict markers
    const marked = extractBetweenMarkers(firstRaw, JSON_START, JSON_END);
    if (marked) {
      const cand = normalizeJsonish(marked);
      if (isProbablyJSON(cand)) {
        try { return JSON.parse(minifyJson(cand)); } catch {}
      }
    }

    // Direct parse
    if (isProbablyJSON(firstRaw)) {
      try { return JSON.parse(minifyJson(firstRaw)); } catch {}
    }

    // Extract substring
    const extracted = extractFirstJSON(firstRaw);
    if (extracted) {
      const cand = normalizeJsonish(extracted);
      if (isProbablyJSON(cand)) {
        try { return JSON.parse(minifyJson(cand)); } catch {}
      }
    }

    // Labeled fallbacks
    const votd = parseLabeledVOTD(firstRaw);
    if (votd.verse || votd.reference || votd.reflection || votd.prayer) return votd as T;

    const devo = parseLabeledDevotional(firstRaw);
    if (devo.title || devo.content || devo.prayer) return devo as T;

    // Second-pass reformatter
    try {
      const reformatted = await this.reformatToStrictJSON(schemaHint, firstRaw, template);
      const marked2 = extractBetweenMarkers(reformatted, JSON_START, JSON_END);
      if (marked2 && isProbablyJSON(marked2)) {
        try { return JSON.parse(minifyJson(marked2)); } catch {}
      }
      const extracted2 = extractFirstJSON(reformatted) || reformatted;
      if (isProbablyJSON(extracted2)) return JSON.parse(minifyJson(extracted2));
      logger.warn("[LLM] Second pass still not JSON; using empty object fallback", {
        preview: String(reformatted).slice(0, 120),
      });
    } catch (e) {
      logger.warn("[LLM] JSON reformat failed; using empty object fallback", (e as Error)?.message);
    }

    return {} as T;
  }

  async generateVerseOfTheDay(): Promise<{
    reference: string;
    verse: string;
    reflection: string;
    [k: string]: unknown;
  }> {
    const system = [
      "You are a concise, warm Christian family assistant.",
      "Output exactly these labeled sections in this order, no preface, no extra text, no markdown:",
      "Reference: <Book Chapter:Verse(s)>",
      'Verse: "<full verse text>"',
      "Reflection: <2 short sentences, practical for families>",
      "Prayer: <1 short sentence prayer>",
      "Choose a widely used translation (ESV preferred, NIV acceptable). Do not ask any questions."
    ].join(" ");
    const user = "Provide today's Bible Verse of the Day for a Christian family.";

    const seed = await this.post({
      prompt: `${system}\n\n${user}`,
      inputs: `${system}\n\n${user}`,
      instruction: `${system}\n\n${user}`,
      text: `${system}\n\n${user}`,
      max_tokens: 600,
      max_new_tokens: 600,
      temperature: 0.2,
      top_p: 0.9,
      n: 1,
      best_of: 1,
      stream: false,
      stop: [],
      use_beam_search: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
    });

    let combined = (seed || "").trim();
    const hasAll = () => {
      const got = parseLabeledVOTD(combined);
      return !!(got.reference && got.verse && got.reflection && got.prayer);
    };

    for (let i = 0; i < 8 && !hasAll(); i++) {
      const more = (await this.continueOnce(system, combined, "keep the exact label format", 400)).trim();
      if (!more) break;
      combined = `${combined}\n${more}`.trim();
    }

    const parsed = parseLabeledVOTD(combined);

    if (!parsed.reference || !parsed.verse || !parsed.reflection || !parsed.prayer) {
      const schema = `Return JSON with keys: verse (string), reference (string), reflection (string), prayer (string).`;
      const template = `{"verse":"","reference":"","reflection":"","prayer":""}`;
      const out = await this.generateStrictJSON<{
        verse?: string; reference?: string; reflection?: string; prayer?: string;
      }>(
        schema,
        `Provide a family-friendly Bible Verse of the Day (ESV or NIV) with a two-sentence reflection and a one-sentence prayer. Return MINIFIED JSON only.`,
        { maxTokens: 900, temperature: 0 },
        template
      );

      try {
        await this.saveGenerated({
          contentType: "verse_of_the_day",
          prompt: "VOTD request (fallback JSON pipeline)",
          systemPrompt: "Strict JSON schema: verse, reference, reflection, prayer",
          generatedContent: JSON.stringify(out),
          userId: null,
          childId: null,
          context: "votd",
        });
      } catch {}

      return {
        verse: out.verse || "Trust in the Lord with all your heart and lean not on your own understanding.",
        reference: out.reference || "Proverbs 3:5",
        reflection: out.reflection || "God's wisdom guides us even when the way forward seems unclear.",
        prayer: out.prayer || "Lord, help us trust You fully today. Amen.",
      };
    }

    try {
      await this.saveGenerated({
        contentType: "verse_of_the_day",
        prompt: "VOTD request (labeled free-form with auto-continue)",
        systemPrompt: "Labels: Reference, Verse, Reflection, Prayer",
        generatedContent: JSON.stringify(parsed),
        userId: null,
        childId: null,
        context: "votd",
      });
    } catch {}

    return {
      verse: parsed.verse!,
      reference: parsed.reference!,
      reflection: parsed.reflection!,
      prayer: parsed.prayer!,
    };
  }

  // ------------- App-facing helpers -------------

  public async generateChatResponse(
    prompt: string,
    context?: string,
    _userId?: number
  ): Promise<string> {
    const systemConstraints = context || "";
    try {
      const started = Date.now();
      const { text } = await this.generateResponse({
        prompt,
        systemPrompt: systemConstraints,
        maxTokens: 600,
        temperature: 0.7,
      });
      const finalText = this.cleanLLMText(text || "");

      try {
        await this.saveGenerated({
          contentType: "chat",
          prompt,
          systemPrompt: systemConstraints || PARENT_DASHBOARD_SYSTEM,
          generatedContent: finalText,
          userId: _userId ?? null,
          childId: null,
          context: systemConstraints || "parent dashboard",
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

  public async generateWeeklySummary({ familyId }: { familyId: number }): Promise<any> {
    const schema = `Return JSON with keys: summary (string), parentalAdvice (string[]), spiritualGuidance (string), highlights (string[]).`;
    const prompt = `Generate a weekly family summary for family ID ${familyId}.
Include JSON keys exactly as in the schema. Keep items concise.`;

    const result = await this.generateStrictJSON<any>(schema, prompt, {
      maxTokens: 1200,
      temperature: 0.6,
    });

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

export const llmService = new LlmService();
