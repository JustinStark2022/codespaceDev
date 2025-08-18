// src/services/llm.service.ts
import axios, { AxiosError } from "axios";
import logger from "../utils/logger";
// Add DB + drizzle tag
import { db } from "@/db/db";
import { sql as dsql } from "drizzle-orm";

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
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

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
  messages?: Array<ChatMessage>;

  // Allow extra worker-specific fields without compiler complaints
  [key: string]: any;
};

/** ---------- Small utils ---------- */
function isProbablyJSON(s: string) {
  const t = (s || "").trim();
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

  // OpenAI-like
  const choiceMsg =
    output?.choices?.[0]?.message?.content ??
    raw?.choices?.[0]?.message?.content ??
    output?.choices?.[0]?.delta?.content ??
    output?.choices?.[0]?.text ??
    raw?.choices?.[0]?.text;

  // Common fields seen across workers
  const generatedText =
    output?.generated_text ??
    output?.generatedText ??
    output?.result ??
    output?.output ??
    output?.output_text ??
    output?.response ??
    output?.answer ??
    output?.data?.[0]?.text ??
    output?.data?.text ??
    output?.data?.output ??
    (Array.isArray(output) && (output[0]?.generated_text || output[0]?.text || output[0]?.result));

  let text: unknown =
    choiceMsg ??
    generatedText ??
    (Array.isArray(output?.text)
      ? output.text.join("\n")
      : typeof output?.text === "string"
      ? output.text
      : typeof output === "string"
      ? output
      : typeof raw === "string"
      ? raw
      : "");

  let s = String(text ?? "").replace(/\u0000/g, "").trim();

  // Extract first JSON block if present in blob output
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

/** Extract the first balanced JSON object/array from a string, if present */
function extractFirstJSON(s: string): string | null {
  const text = s || "";
  const openers = ["{", "["] as const;
  const closers: Record<string, string> = { "{": "}", "[": "]" };
  const startIdx = [...text].findIndex((ch) => (openers as readonly string[]).includes(ch as any));
  if (startIdx < 0) return null;

  const startChar = text[startIdx] as "{" | "[";
  const endChar = closers[startChar];
  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];

    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === "\\") {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    } else {
      if (ch === '"') {
        inStr = true;
        continue;
      }
      if (ch === startChar) depth++;
      if (ch === endChar) {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(startIdx, i + 1);
          return candidate;
        }
      }
    }
  }
  return null;
}

/** Simple cleanup to reduce duplicated/rambling outputs */
function sanitizeText(out: string): string {
  if (!out) return out;
  let s = out.replace(/\u0000/g, "").trim();

  // Remove repeated consecutive sentences
  const sentences = s.split(/(?<=[.!?])\s+/);
  const dedup: string[] = [];
  const seen = new Set<string>();
  for (const sent of sentences) {
    const key = sent.toLowerCase().trim();
    if (!seen.has(key)) {
      dedup.push(sent);
      seen.add(key);
    }
  }
  s = dedup.join(" ");

  // Fix unmatched trailing quotes/backticks
  s = s.replace(/^[`'"]+|[`'"]+$/g, "");

  // Trim generic filler
  s = s.replace(/\b(sure thing|as an ai|if you're looking|i can help you)\b.*$/i, "").trim();

  return s;
}

/** Estimate a safe token budget for the reply based on prompt size, bounded for safety */
function tokenBudgetFromPrompt(prompt: string, fallback: number = 512): number {
  const s = (prompt || "").trim();
  if (!s) return fallback;
  const approxTokens = Math.ceil(s.length / 4); // rough char->token heuristic
  const budget = Math.max(fallback, Math.min(1200, approxTokens * 2));
  return budget;
}

/** Heuristic to detect if a prompt likely needs a more in-depth response */
function isComplexQuestion(s: string): boolean {
  const t = (s || "").toLowerCase();
  const long = t.length > 220 || t.split(/\s+/).length > 40;
  const qmarks = (t.match(/\?/g) || []).length >= 1;
  const keywords = /\b(how|why|steps|plan|strategy|guide|explain|compare|pros|cons|outline|implement|best practices|examples?)\b/;
  const listSignals = /(\n-|\n\d+\.|•)/;
  return long || (qmarks && t.length > 120) || keywords.test(t) || listSignals.test(s);
}

/** Guidance the chat model follows on the Parent Dashboard */
const PARENT_DASHBOARD_SYSTEM = [
  "You are a concise, warm Christian family assistant for parents.",
  "Style: short, clear, practical. Default to concise answers, but when a question requires depth, provide a complete, well-structured response.",
  "Ground your answers in biblical principles. Cite Scripture (e.g., John 3:16) when relevant.",
  "Avoid fluff, repetition, or generic disclaimers. Do not mention being an AI.",
  "Never repeat the user's prompt. Answer directly. No links unless requested.",
  "If a verse is asked about, summarize its meaning and offer a practical family application.",
].join(" ");

/** Few-shot example shape (optional) */
interface PromptExample {
  user: string;
  assistant: string;
}

/** Compose a plain prompt string for generic vLLM workers */
function buildPromptFromMessages(msgs?: Array<ChatMessage>): string {
  if (!Array.isArray(msgs) || msgs.length === 0) return "";
  const sys = msgs.find((m) => m.role === "system")?.content?.trim();
  const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.content?.trim() || "";
  const sysLine = sys ? `SYSTEM: ${sys}\n` : "";
  return `${sysLine}USER: ${lastUser}\nASSISTANT:`;
}

/** LLaMA-2 style prompt builder with optional few-shot examples */
function buildLlamaPrompt(system: string | undefined, user: string, examples?: PromptExample[]): string {
  // LLaMA-2 chat pattern:
  // <s>[INST] <<SYS>>
  // ...system...
  // <</SYS>>
  // user content [/INST]
  const sysBlock = system ? `<<SYS>>\n${system}\n<</SYS>>\n\n` : "";

  let prompt = `<s>[INST] ${sysBlock}${user} [/INST]`;

  if (examples && examples.length) {
    // Put examples BEFORE the target, as demonstrated dialogue pairs
    // We rebuild with examples then finish with the actual user turn
    const blocks: string[] = [];
    blocks.push(`<s>[INST] ${sysBlock}${examples[0].user} [/INST] ${examples[0].assistant} </s>`);
    for (let i = 1; i < examples.length; i++) {
      const ex = examples[i];
      blocks.push(`<s>[INST] ${ex.user} [/INST] ${ex.assistant} </s>`);
    }
    // Final actual query as last INST block
    blocks.push(`<s>[INST] ${sysBlock}${user} [/INST]`);
    prompt = blocks.join("\n");
  }

  return prompt;
}

class LlmService {
  private apiKey: string;
  private endpointId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = requireEnv("RUNPOD_API_KEY");
    this.endpointId = requireEnv("RUNPOD_ENDPOINT_ID");
    this.baseUrl = `https://api.runpod.ai/v2/${this.endpointId}`;
  }

  // Add: safe persistence helper (never throws; trims to column sizes)
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
    const prmpt = String(prompt ?? "");
    const sys = systemPrompt == null ? null : String(systemPrompt);
    const gen = String(generatedContent ?? "");
    const uid = userId ?? null;
    const cid = childId ?? null;
    const ctx = context == null ? null : String(context).slice(0, 100);
    const tok = Number.isFinite(tokensUsed as any) ? Number(tokensUsed) : null;
    const genMs = Number.isFinite(generationTimeMs as any) ? Number(generationTimeMs) : null;

    try {
      await db.execute(dsql`
        INSERT INTO llm_generated_content
          (content_type, prompt, system_prompt, generated_content, user_id, child_id, context, tokens_used, generation_time_ms)
        VALUES
          (${ct}, ${prmpt}, ${sys}, ${gen}, ${uid}, ${cid}, ${ctx}, ${tok}, ${genMs})
      `);
      logger.debug("[LLM] Persisted llm_generated_content", { contentType: ct });
    } catch (e) {
      // Never throw; just log
      logger.warn("[LLM] Failed to persist llm_generated_content", (e as Error)?.message);
    }
  }

  /**
   * Low-level call to RunPod with robust fallback
   */
  private async post(input: RunpodPayload, tries = 2): Promise<string> {
    const urlSync = `${this.baseUrl}/runsync`;
    const urlRun = `${this.baseUrl}/run`;

    // Prefer LLaMA-style composition if messages exist; otherwise generic
    const lastUserMsg =
      Array.isArray(input.messages) && input.messages.length
        ? [...input.messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? ""
        : "";

    const systemMsg =
      Array.isArray(input.messages) && input.messages.length
        ? input.messages.find((m) => m.role === "system")?.content?.trim()
        : undefined;

    const llamaComposed =
      lastUserMsg
        ? buildLlamaPrompt(systemMsg, lastUserMsg)
        : undefined;

    // Always include a plain prompt mirror for max compatibility (vLLM-friendly)
    const composedPrompt =
      input.prompt ??
      input.text ??
      input.inputs ??
      llamaComposed ??
      buildPromptFromMessages(input.messages);

    // Build sampling params object expected by some vLLM workers
    const sampling_params = {
      n: input.n ?? 1,
      best_of: input.best_of ?? 1,
      temperature: input.temperature ?? 0.35,
      top_p: input.top_p ?? 0.9,
      use_beam_search: input.use_beam_search ?? false,
      stop: input.stop ?? [],
      ignore_eos: false,
      max_tokens: (input.max_new_tokens ?? input.max_tokens ?? 600) as number,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
    };

    // Mirror only prompt/inputs to avoid bloated echoes; attach stop tokens
    const payload: RunpodPayload = {
      ...input,
      prompt: input.prompt ?? composedPrompt ?? "",
      inputs: input.inputs ?? input.prompt ?? composedPrompt ?? "",
      // drop extra mirrors that cause echo-chatter:
      // instruction, text, input, input_text, query, question
      max_tokens: input.max_tokens ?? input.max_new_tokens ?? 400,
      max_new_tokens: input.max_new_tokens ?? input.max_tokens ?? 400,
      sampling_params,
      stop: input.stop ?? ["</s>", "[/INST]"],
    };

    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const safeLog = {
          ...payload,
          prompt: `[len=${(payload.prompt ?? "").length}]`,
          inputs: `[len=${(payload.inputs ?? "").length}]`,
          instruction: `[len=${(payload.instruction ?? "").length}]`,
          text: `[len=${(payload.text ?? "").length}]`,
          input: `[len=${String((payload as any).input ?? "").length}]`,
          input_text: `[len=${String((payload as any).input_text ?? "").length}]`,
          query: `[len=${String((payload as any).query ?? "").length}]`,
          question: `[len=${String((payload as any).question ?? "").length}]`,
          messages: payload.messages
            ? payload.messages.map((m) => ({ ...m, content: `[len=${m.content.length}]` }))
            : undefined,
        };
        logger.debug("[LLM] POST /runsync payload (safe):", safeLog);

        const { data } = await axios.post(
          urlSync,
          { input: payload },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 120_000, // was 60_000
          }
        );

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
          result: typeof data?.output?.result,
          generated_text: typeof data?.output?.generated_text,
        });

        // Prefer worker-provided text array if present/non-empty
        const arr = data?.output?.text;
        if (Array.isArray(arr) && arr.length && typeof arr[0] === "string" && arr[0].trim() !== "") {
          return arr.join("\n");
        }

        const normalized = normalizeRunpodOutput(data);
        logger.debug("[LLM] /runsync normalized output preview:", String(normalized).slice(0, 60));

        const isEmpty =
          normalized === "" ||
          normalized === "false" ||
          normalized === "null" ||
          typeof data?.output === "undefined" ||
          data?.output === false;

        if (isEmpty) {
          logger.warn("[LLM] /runsync empty-ish output; falling back to /run + /status polling");
          const polled = await this.runAndPoll(urlRun, payload);
          return polled;
        }

        return normalized;
      } catch (err: unknown) {
        const axErr = err as AxiosError;
        const msg = (axErr?.response?.data as any)?.error ?? axErr?.message ?? "Unknown Runpod error";
        logger.error(`Runpod /runsync error (attempt ${attempt}/${tries}):`, msg);

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
        logger.warn("[LLM] Falling back to /run + /status after /runsync error");
        return await this.runAndPoll(urlRun, payload);
      }
    }
    throw new Error("LLM request failed");
  }

  /** Submit /run job and poll /status/{id} until completed or timeout, normalize output */
  private async runAndPoll(urlRun: string, payload: RunpodPayload): Promise<string> {
    const { data: runData } = await axios.post(
      urlRun,
      { input: payload },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 60_000, // was 30_000
      }
    );

    const jobId: string | undefined = runData?.id;
    if (!jobId) {
      logger.error("[LLM] /run did not return a job id.");
      throw new Error("Runpod /run failed to return job id");
    }

    const statusUrl = `${this.baseUrl}/status/${jobId}`;
    logger.debug("[LLM] Polling status:", { jobId });

    const started = Date.now();
    const timeoutMs = 180_000; // was 60_000
    while (Date.now() - started < timeoutMs) {
      const { data: st } = await axios.get(statusUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        timeout: 40_000, // was 20_000
      });

      const status = String(st?.status || "").toUpperCase();
      if (status === "COMPLETED") {
        const out = st?.output ?? {};

        // Prefer explicit text array if present
        if (Array.isArray(out?.text) && out.text.length) {
          const joined = out.text.filter((t: any) => typeof t === "string").join("\n").trim();
          if (joined) return joined;
        }

        // ...existing direct extraction...
        const direct =
          out?.result ??
          out?.generated_text ??
          out?.output_text ??
          out?.response ??
          out?.answer ??
          (Array.isArray(out?.text) ? out.text.join("\n") : out?.text);
        const directStr = typeof direct === "string" ? direct : "";
        const normalized = normalizeRunpodOutput(directStr || st);
        logger.debug("[LLM] /status normalized output preview:", String(normalized).slice(0, 60));

        if (!normalized || normalized === "false" || normalized === "null") {
          logger.warn("[LLM] /status returned falsy output despite COMPLETED");
        }
        return normalized;
      }
      if (status === "FAILED" || status === "CANCELED") {
        logger.error("[LLM] Job failed/canceled", { status, jobId });
        throw new Error(`Runpod job ${status.toLowerCase()}`);
      }

      await sleep(1200);
    }

    logger.error("[LLM] /status polling timed out");
    throw new Error("Runpod polling timeout");
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

  /** Generic prompt builder that prefers chat messages over raw prompt */
  public async generateResponse(req: LLMRequest): Promise<LLMResponse> {
    const systemContent = req.systemPrompt ? req.systemPrompt : undefined;

    // Adaptive token budget unless caller specified one
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

    let raw = first.text ?? "";

    // 1) Direct parse if already JSON (with minify)
    if (isProbablyJSON(raw)) {
      try {
        return JSON.parse(safeMinifyJSON(raw));
      } catch {
        // continue
      }
    }

    // 2) Try to extract JSON substring from messy output before a second LLM call
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

    // 3) Second pass: reformat to strict JSON
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
    const started = Date.now(); // measure for persistence
    try {
      // Adaptive budget for first reply
      const firstBudget = tokenBudgetFromPrompt(prompt, 512);
      const { text } = await this.generateResponse({
        prompt,
        systemPrompt: system,
        maxTokens: firstBudget,
        temperature: 0.33,
      });

      const cleaned = sanitizeText(text);

      // If the first reply is very short relative to prompt complexity, request a fuller expansion
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

      // Persist
      await this.saveGenerated({
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

    // Persist
    await this.saveGenerated({
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

    // Persist
    await this.saveGenerated({
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

    // Persist
    await this.saveGenerated({
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

    // Persist
    await this.saveGenerated({
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

    // Persist
    await this.saveGenerated({
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
