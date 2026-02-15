export function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is missing from environment variables`);
  return v;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isProbablyJSON(s: string): boolean {
  const t = (s || "").trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
}

export function safeMinifyJSON(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s));
  } catch {
    return s;
  }
}

export function tokenBudgetFromPrompt(prompt: string, fallback: number = 512): number {
  const s = (prompt || "").trim();
  if (!s) return fallback;
  const approxTokens = Math.ceil(s.length / 4);
  const budget = Math.max(fallback, Math.min(1200, approxTokens * 2));
  return budget;
}

export function isComplexQuestion(s: string): boolean {
  const t = (s || "").toLowerCase();
  const long = t.length > 220 || t.split(/\s+/).length > 40;
  const qmarks = (t.match(/\?/g) || []).length >= 1;
  const keywords = /\b(how|why|steps|plan|strategy|guide|explain|compare|pros|cons|outline|implement|best practices|examples?)\b/;
  const listSignals = /(\n-|\n\d+\.|•)/;
  return long || (qmarks && t.length > 120) || keywords.test(t) || listSignals.test(s);
}
