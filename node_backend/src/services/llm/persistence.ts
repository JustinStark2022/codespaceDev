import { db } from "@/db/db";
import { sql as dsql } from "drizzle-orm";
import logger from "../../utils/logger";

export interface GeneratedContentParams {
  contentType: string;
  prompt: string;
  systemPrompt?: string | null;
  generatedContent: string;
  userId?: number | null;
  childId?: number | null;
  context?: string | null;
  tokensUsed?: number | null;
  generationTimeMs?: number | null;
}

export async function saveGeneratedContent(params: GeneratedContentParams): Promise<void> {
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
    logger.warn("[LLM] Failed to persist llm_generated_content", (e as Error)?.message);
  }
}
