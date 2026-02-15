import { isProbablyJSON } from "./utils";

export function normalizeRunpodOutput(raw: any): string {
  const output = raw?.output ?? raw;

  const choiceMsg =
    output?.choices?.[0]?.message?.content ??
    raw?.choices?.[0]?.message?.content ??
    output?.choices?.[0]?.delta?.content ??
    output?.choices?.[0]?.text ??
    raw?.choices?.[0]?.text;

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

export function extractFirstJSON(s: string): string | null {
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

export function sanitizeText(out: string): string {
  if (!out) return out;
  let s = out.replace(/\u0000/g, "").trim();

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

  s = s.replace(/^[`'"]+|[`'"]+$/g, "");
  s = s.replace(/\b(sure thing|as an ai|if you're looking|i can help you)\b.*$/i, "").trim();

  return s;
}
