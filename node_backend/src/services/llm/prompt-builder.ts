import { ChatMessage, PromptExample } from "./types";

export const PARENT_DASHBOARD_SYSTEM = [
  "You are a concise, warm Christian family assistant for parents.",
  "Style: short, clear, practical. Default to concise answers, but when a question requires depth, provide a complete, well-structured response.",
  "Ground your answers in biblical principles. Cite Scripture (e.g., John 3:16) when relevant.",
  "Avoid fluff, repetition, or generic disclaimers. Do not mention being an AI.",
  "Never repeat the user's prompt. Answer directly. No links unless requested.",
  "If a verse is asked about, summarize its meaning and offer a practical family application.",
].join(" ");

export function buildPromptFromMessages(msgs?: Array<ChatMessage>): string {
  if (!Array.isArray(msgs) || msgs.length === 0) return "";
  const sys = msgs.find((m) => m.role === "system")?.content?.trim();
  const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.content?.trim() || "";
  const sysLine = sys ? `SYSTEM: ${sys}\n` : "";
  return `${sysLine}USER: ${lastUser}\nASSISTANT:`;
}

export function buildLlamaPrompt(system: string | undefined, user: string, examples?: PromptExample[]): string {
  const sysBlock = system ? `<<SYS>>\n${system}\n<</SYS>>\n\n` : "";

  let prompt = `<s>[INST] ${sysBlock}${user} [/INST]`;

  if (examples && examples.length) {
    const blocks: string[] = [];
    blocks.push(`<s>[INST] ${sysBlock}${examples[0].user} [/INST] ${examples[0].assistant} </s>`);
    for (let i = 1; i < examples.length; i++) {
      const ex = examples[i];
      blocks.push(`<s>[INST] ${ex.user} [/INST] ${ex.assistant} </s>`);
    }
    blocks.push(`<s>[INST] ${sysBlock}${user} [/INST]`);
    prompt = blocks.join("\n");
  }

  return prompt;
}
