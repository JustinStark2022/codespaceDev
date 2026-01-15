import axios, { AxiosError } from "axios";
import logger from "../utils/logger";
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

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type RunpodWorkerInput = {
  prompt: string;
  max_new_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
};

function sanitizeText(out: string): string {
  if (!out) return out;
  let s = out.replace(/\u0000/g, "").trim();
  s = s.replace(/^[`'"]+|[`'"]+$/g, "").trim();
  return s;
}

function tokenBudgetFromPrompt(prompt: string, fallback: number = 512): number {
  const s = (prompt || "").trim();
  if (!s) return fallback;
  const approxTokens = Math.ceil(s.length / 4);
  return Math.max(fallback, Math.min(1200, approxTokens * 2));
}

function isComplexQuestion(s: string): boolean {
  const t = (s || "").toLowerCase();
  const long = t.length > 220 || t.split(/\s+/).length > 40;
  const qmarks = (t.match(/\?/g) || []).length >= 1;
  const keywords = /\b(how|why|steps|plan|strategy|guide|explain|compare|pros|cons|outline|implement|best practices|examples?)\b/;
  const listSignals = /(\n-|\n\d+\.|•)/;
  return long || (qmarks && t.length > 120) || keywords.test(t) || listSignals.test(s);
}

/** Parent dashboard guidance */
const PARENT_DASHBOARD_SYSTEM = [
  "You are a concise, warm Christian family assistant for parents.",
  "Style: short, clear, practical. Default to concise answers, but when a question requires depth, provide a complete, well-structured response.",
  "Ground your answers in biblical principles. Cite Scripture (e.g., John 3:16) when relevant.",
  "Avoid fluff, repetition, or generic disclaimers. Do not mention being an AI.",
  "Never repeat the user's prompt. Answer directly. No links unless requested.",
  "If a verse is asked about, summarize its meaning and offer a practical family application.",
].join(" ");

/**
 * ✅ Robust parser for RunPod outputs.
 * Your endpoint returns: output[0].choices[0].tokens: string[]
 */
function parseRunpodText(data: any): string {
  const out = data?.output ?? data;

  const joinTokens = (tokens: any): string => {
    if (Array.isArray(tokens)) return tokens.map((t) => (typeof t === "string" ? t : "")).join("");
    if (typeof tokens === "string") return tokens;
    return "";
  };

  const parseChoice = (choice: any): string => {
    if (!choice) return "";

    const t1 =
      choice.text ??
      choice.message?.content ??
      choice.delta?.content ??
      choice.content;

    if (typeof t1 === "string" && t1.trim()) return t1.trim();

    const tok = joinTokens(choice.tokens);
    if (tok.trim()) return tok.trim();

    if (Array.isArray(choice.tokens) && choice.tokens.length && typeof choice.tokens[0] === "object") {
      const maybeText = choice.tokens.map((x: any) => x?.text ?? x?.token ?? "").join("");
      if (maybeText.trim()) return maybeText.trim();
    }

    return "";
  };

  const parseOutputItem = (item: any): string => {
    if (!item) return "";

    const choices = item?.choices ?? item?.result?.choices ?? item?.data?.choices;
    if (Array.isArray(choices) && choices.length) {
      const t = parseChoice(choices[0]);
      if (t) return t;
    }

    if (typeof item === "string" && item.trim()) return item.trim();

    const direct =
      item?.text ??
      item?.generated_text ??
      item?.generation ??
      item?.result ??
      item?.response ??
      item?.content;

    if (typeof direct === "string" && direct.trim()) return direct.trim();

    return "";
  };

  if (Array.isArray(out)) {
    for (const item of out) {
      const t = parseOutputItem(item);
      if (t) return t;
    }
  }

  if (out && typeof out === "object") {
    if ((out as any)["0"] != null) {
      const t = parseOutputItem((out as any)["0"]);
      if (t) return t;
    }

    const t2 = parseOutputItem(out);
    if (t2) return t2;
  }

  return "";
}

/**
 * 🚫 Strip the garbage “template / injection” patterns we’re seeing in your logs:
 * - @checks:
 * - <INST...>, <SYS>...</SYS>, [AUD], etc.
 */
function cleanWeirdTemplateArtifacts(text: string): string {
  if (!text) return text;
  let t = text;

  // remove leading junk blocks that look like system templates
  t = t.replace(/^\s*@checks:.*$/gms, "").trim();
  t = t.replace(/^\s*\[AUD\][\s\S]*$/gm, "").trim();

  // remove angle-bracket tags
  t = t.replace(/<\s*SYS\s*>[\s\S]*?<\s*\/\s*SYS\s*>/gi, "").trim();
  t = t.replace(/<\s*INST[^>]*>/gi, "").trim();
  t = t.replace(/<\s*\/\s*INST[^>]*>/gi, "").trim();

  // remove other known tag-like prefixes
  t = t.replace(/^\s*%Info.*$/gmi, "").trim();
  t = t.replace(/^\s*%Scripture.*$/gmi, "").trim();
  t = t.replace(/^\s*<STONE><DEV>\s*/gmi, "").trim();
  t = t.replace(/^\s*<INSTUIB>.*$/gmi, "").trim();

  // strip stray code markers that appear in your outputs
  t = t.replace(/\\begin\{code\}[\s\S]*?\\end\{code\}/gmi, "").trim();

  return t.trim();
}

/** Detect if the model responded with junk instead of an answer */
function looksLikeJunk(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return true;
  if (t.includes("@checks:")) return true;
  if (t.includes("<sys>")) return true;
  if (t.includes("<inst")) return true;
  if (t.includes("[aud]")) return true;
  if (t.includes("\\begin{code}")) return true;
  // If it’s mostly punctuation / tags and very short
  const letters = (t.match(/[a-z]/g) || []).length;
  if (letters < 20) return true;
  return false;
}

/**
 * ✅ IMPORTANT CHANGE:
 * We are NOT using Llama2 [INST] chat formatting for this endpoint.
 * We send a plain prompt that base/instruct models handle consistently.
 */
function buildPlainPrompt(system: string | undefined, user: string): string {
  const sys = system?.trim() ? system.trim() : "";
  return [
    "System:",
    sys || "You are a helpful assistant.",
    "",
    "User:",
    user.trim(),
    "",
    "Assistant:",
  ].join("\n");
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

    try {
      await db.execute(dsql`
        INSERT INTO llm_generated_content
          (content_type, prompt, system_prompt, generated_content, user_id, child_id, context, tokens_used, generation_time_ms)
        VALUES
          (${String(contentType || "unknown").slice(0, 50)},
           ${String(prompt ?? "")},
           ${systemPrompt == null ? null : String(systemPrompt)},
           ${String(generatedContent ?? "")},
           ${userId ?? null},
           ${childId ?? null},
           ${context == null ? null : String(context).slice(0, 100)},
           ${Number.isFinite(tokensUsed as any) ? Number(tokensUsed) : null},
           ${Number.isFinite(generationTimeMs as any) ? Number(generationTimeMs) : null})
      `);
      logger.debug("[LLM] Persisted llm_generated_content", { contentType });
    } catch (e) {
      logger.warn("[LLM] Failed to persist llm_generated_content", (e as Error)?.message);
    }
  }

  private async post(
    input: {
      prompt?: string;
      maxTokens?: number;
      temperature?: number;
      top_p?: number;
      stop?: string[];
      messages?: Array<ChatMessage>;
    },
    tries = 2
  ): Promise<string> {
    const urlSync = `${this.baseUrl}/runsync`;
    const urlRun = `${this.baseUrl}/run`;

    const lastUserMsg =
      Array.isArray(input.messages) && input.messages.length
        ? [...input.messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? ""
        : (input.prompt || "").trim();

    const systemMsg =
      Array.isArray(input.messages) && input.messages.length
        ? input.messages.find((m) => m.role === "system")?.content?.trim()
        : undefined;

    // ✅ Plain prompt for this model/endpoint
    const composedPrompt = buildPlainPrompt(systemMsg, lastUserMsg);

    const maxNew = input.maxTokens ?? tokenBudgetFromPrompt(composedPrompt, 480);

    const workerInput: RunpodWorkerInput = {
      prompt: composedPrompt,
      max_new_tokens: maxNew,
      temperature: input.temperature ?? 0.33,
      top_p: input.top_p ?? 0.9,
      // ✅ DO NOT force stop tokens for this endpoint (it was trained differently)
      stop: [],
    };

    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        logger.debug("[LLM] POST /runsync (plain prompt):", {
          endpointId: this.endpointId,
          promptLen: workerInput.prompt.length,
          max_new_tokens: workerInput.max_new_tokens,
          temperature: workerInput.temperature,
          top_p: workerInput.top_p,
        });

        const { data } = await axios.post(
          urlSync,
          { input: workerInput },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 120_000,
          }
        );

        logger.warn("RUNSYNC RAW:", JSON.stringify(data, null, 2));

        let text = sanitizeText(parseRunpodText(data));
        text = cleanWeirdTemplateArtifacts(text);

        if (text) return text;

        logger.warn("[LLM] /runsync returned no parsed text. Falling back to /run + /status polling.");
        return await this.runAndPoll(urlRun, workerInput);
      } catch (err: unknown) {
        const axErr = err as AxiosError;
        const respData = axErr?.response?.data as any;
        const msg = respData?.error ?? respData ?? axErr?.message ?? "Unknown RunPod error";

        logger.error(`RunPod /runsync error (attempt ${attempt}/${tries}):`, msg);

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
        return await this.runAndPoll(urlRun, workerInput);
      }
    }

    throw new Error("LLM request failed");
  }

  private async runAndPoll(urlRun: string, workerInput: RunpodWorkerInput): Promise<string> {
    const { data: runData } = await axios.post(
      urlRun,
      { input: workerInput },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 60_000,
      }
    );

    const jobId: string | undefined = runData?.id;
    if (!jobId) {
      logger.error("[LLM] /run did not return a job id.", { runData });
      throw new Error("RunPod /run failed to return job id");
    }

    const statusUrl = `${this.baseUrl}/status/${jobId}`;
    logger.debug("[LLM] Polling status:", { jobId });

    const started = Date.now();
    const timeoutMs = 180_000;

    while (Date.now() - started < timeoutMs) {
      const { data: st } = await axios.get(statusUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        timeout: 40_000,
      });

      const status = String(st?.status || "").toUpperCase();

      if (status === "COMPLETED") {
        let text = sanitizeText(parseRunpodText(st));
        text = cleanWeirdTemplateArtifacts(text);

        if (text) return text;

        logger.warn("[LLM] /status COMPLETED but missing text (RAW):", JSON.stringify(st, null, 2));
        return "";
      }

      if (status === "FAILED" || status === "CANCELED") {
        logger.error("[LLM] Job failed/canceled payload:", { jobId, status, st });

        const errMsg =
          st?.error?.message ||
          st?.output?.error ||
          st?.output?.message ||
          st?.message ||
          `RunPod job ${status.toLowerCase()}`;

        throw new Error(errMsg);
      }

      await sleep(1200);
    }

    logger.error("[LLM] /status polling timed out", { jobId });
    throw new Error("RunPod polling timeout");
  }

  public async generateResponse(req: LLMRequest): Promise<LLMResponse> {
    const systemContent = req.systemPrompt ? req.systemPrompt : undefined;
    const budget = req.maxTokens ?? tokenBudgetFromPrompt(req.prompt, 480);

    // First attempt
    let text = await this.post({
      messages: [
        ...(systemContent ? [{ role: "system" as const, content: systemContent }] : []),
        { role: "user", content: req.prompt },
      ],
      maxTokens: budget,
      temperature: req.temperature ?? 0.35,
      top_p: 0.9,
      stop: [],
    });

    text = cleanWeirdTemplateArtifacts(sanitizeText(text));

    // ✅ If junk, retry once with stricter instruction
    if (looksLikeJunk(text)) {
      logger.warn("[LLM] Output looked like junk; retrying once with stricter instruction.");
      const strictSystem = [
        (systemContent || PARENT_DASHBOARD_SYSTEM),
        "IMPORTANT: Answer ONLY the user's question in plain English. Do not output instructions, tags, templates, checks, code, or metadata.",
        "If you don't know, say: I don't know.",
      ].join(" ");

      text = await this.post({
        messages: [
          { role: "system", content: strictSystem },
          { role: "user", content: req.prompt },
        ],
        maxTokens: budget,
        temperature: 0.2,
        top_p: 0.9,
        stop: [],
      });

      text = cleanWeirdTemplateArtifacts(sanitizeText(text));
    }

    return { text: text || "No response generated." };
  }

  public async generateChatResponse(prompt: string, context?: string, _userId?: number): Promise<string> {
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

      const cleaned = cleanWeirdTemplateArtifacts(sanitizeText(text));

      const words = (cleaned || "").trim().split(/\s+/).filter(Boolean).length;
      const promptComplex = isComplexQuestion(prompt);

      let finalOut = cleaned;

      // If short but question is complex, ask for expansion
      if ((words < 60 && promptComplex) || words < 25) {
        const contBudget = Math.max(600, Math.floor(firstBudget * 0.75));
        const cont = await this.post({
          messages: [
            { role: "system", content: system + " IMPORTANT: Continue with a clear, practical answer. No tags, no templates." },
            { role: "user", content: "Continue and expand your answer with helpful detail." },
          ],
          temperature: 0.25,
          top_p: 0.9,
          maxTokens: contBudget,
          stop: [],
        });

        finalOut = cleanWeirdTemplateArtifacts(sanitizeText(`${cleaned}\n\n${cont}`.trim()));
      }

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

      return finalOut || "I'm having trouble connecting right now. Please try again later.";
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
    // Keep it simple for this model: plain text with labels (no JSON)
    const system = PARENT_DASHBOARD_SYSTEM + " Return plain text with exactly these labels:\nReference:\nVerse:\nReflection:\nPrayer:\nNo extra headers.";

    const { text } = await this.generateResponse({
      prompt: "Provide today's Bible Verse of the Day for a Christian family.",
      systemPrompt: system,
      maxTokens: 500,
      temperature: 0.2,
    });

    const cleaned = cleanWeirdTemplateArtifacts(sanitizeText(text));

    // Lightweight parsing:
    const ref = /Reference:\s*(.*)/i.exec(cleaned)?.[1]?.trim();
    const verse = /Verse:\s*([\s\S]*?)\nReflection:/i.exec(cleaned)?.[1]?.trim();
    const reflection = /Reflection:\s*([\s\S]*?)\nPrayer:/i.exec(cleaned)?.[1]?.trim();
    const prayer = /Prayer:\s*([\s\S]*)$/i.exec(cleaned)?.[1]?.trim();

    const result = {
      verse: verse || "Trust in the Lord with all your heart and lean not on your own understanding.",
      reference: ref || "Proverbs 3:5–6",
      reflection: reflection || "Trusting God means relying on His wisdom even when we don’t see the whole picture.",
      prayer: prayer || "Lord, help our family trust You today and follow Your guidance. Amen.",
    };

    await this.saveGenerated({
      contentType: "verse_of_the_day",
      prompt: "VOTD request",
      systemPrompt: system,
      generatedContent: JSON.stringify(result),
      userId: null,
      childId: null,
      context: "votd",
    });

    return result;
  }

  public async generateDevotional(topic?: string): Promise<{ title: string; content: string; prayer: string }> {
    const system =
      PARENT_DASHBOARD_SYSTEM +
      " Return plain text with exactly these labels:\nTitle:\nContent:\nPrayer:\nNo extra headers.";

    const prompt = topic
      ? `Write a short family devotional for today about: ${topic}. Hopeful, Scripture-centered tone (120–180 words).`
      : "Write a short family devotional for today with a hopeful, Scripture-centered tone (120–180 words).";

    const { text } = await this.generateResponse({
      prompt,
      systemPrompt: system,
      maxTokens: 700,
      temperature: 0.3,
    });

    const cleaned = cleanWeirdTemplateArtifacts(sanitizeText(text));

    const title = /Title:\s*(.*)/i.exec(cleaned)?.[1]?.trim();
    const content = /Content:\s*([\s\S]*?)\nPrayer:/i.exec(cleaned)?.[1]?.trim();
    const prayer = /Prayer:\s*([\s\S]*)$/i.exec(cleaned)?.[1]?.trim();

    const result = {
      title: title || "Walking in Faith",
      content: content || cleaned || "Today, let’s remember that God is near and faithful.",
      prayer: prayer || "Lord, lead our home in love and unity. Amen.",
    };

    await this.saveGenerated({
      contentType: "devotional",
      prompt,
      systemPrompt: system,
      generatedContent: JSON.stringify(result),
      userId: null,
      childId: null,
      context: topic || "devotional",
    });

    return result;
  }

  public async generateWeeklySummary({ familyId }: { familyId: number }): Promise<any> {
    const system =
      PARENT_DASHBOARD_SYSTEM +
      " Return plain text with sections labeled exactly:\nSummary:\nParentalAdvice:\nSpiritualGuidance:\nHighlights:\n(Advice/Highlights as short lines).";

    const { text } = await this.generateResponse({
      prompt: `Generate a weekly family summary for family ID ${familyId}.`,
      systemPrompt: system,
      maxTokens: 900,
      temperature: 0.35,
    });

    const cleaned = cleanWeirdTemplateArtifacts(sanitizeText(text));

    await this.saveGenerated({
      contentType: "weekly_summary",
      prompt: `Generate weekly summary family:${familyId}`,
      systemPrompt: system,
      generatedContent: cleaned,
      userId: null,
      childId: null,
      context: `family:${familyId}`,
    });

    return { raw: cleaned };
  }
}

export const llmService = new LlmService();