/* Tolerant JSON extraction for LLM outputs that send:
   - <JSON>{...  (missing </JSON> or last brace)
   - smart quotes / FFFD chars
*/
export const previewLLMText = (s: string, n = 500) =>
  (s || "").replace(/\s+/g, " ").slice(0, n);

const sanitizeForJson = (s: string) =>
  s
    // remove BOM/FFFD and stray control chars
    .replace(/\uFEFF|\uFFFD/g, "")
    // normalize smart quotes to ASCII
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    // normalize dashes
    .replace(/[\u2013\u2014]/g, "-");

const stripJsonWrappers = (s: string) => {
  const i = s.indexOf("<JSON");
  if (i >= 0) {
    // drop everything up to and including the first '>' after <JSON
    const gt = s.indexOf(">", i);
    if (gt >= 0) return s.slice(gt + 1);
    // broken tag without '>' — drop up to the end of "<JSON"
    return s.slice(i + 5);
  }
  return s;
};

const firstBalancedObject = (s: string): string | null => {
  let start = s.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inStr = false;
  let quote: '"' | "'" | null = null;
  for (let i = start; i < s.length; i++) {
    const c = s[i];

    if (inStr) {
      if (c === "\\" && i + 1 < s.length) {
        i++; // skip escaped char
        continue;
      }
      if (c === quote) {
        inStr = false;
        quote = null;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      inStr = true;
      quote = c as '"' | "'";
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }

  // If we got here, try widest fallback between first { and last }
  const last = s.lastIndexOf("}");
  if (last > start) return s.slice(start, last + 1);
  // As a final fallback, return the fragment from first { (will be repaired later)
  return s.slice(start);
};

const addMissingClosers = (s: string): string => {
  const opens = (s.match(/{/g) || []).length;
  const closes = (s.match(/}/g) || []).length;
  if (closes < opens) s += "}".repeat(opens - closes);
  return s;
};

const closeUnfinishedString = (s: string): string => {
  // Count unescaped double quotes; if odd, append one more to close.
  const unescapedDq = (s.match(/(?<!\\)"/g) || []).length;
  if (unescapedDq % 2 === 1) s += '"';
  return s;
};

const stripTrailingCommasBeforeBrace = (s: string): string =>
  s.replace(/,\s*([}\]])/g, "$1");

const lastCommaOutsideString = (s: string): number => {
  let inStr = false;
  let quote: '"' | "'" | null = null;
  let last = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\" && i + 1 < s.length) {
        i++;
        continue;
      }
      if (c === quote) {
        inStr = false;
        quote = null;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      quote = c as '"' | "'";
      continue;
    }
    if (c === ",") last = i;
  }
  return last;
};

const tryRepairJsonFragment = (src: string): string => {
  let s = src.trim();
  if (!s.startsWith("{")) {
    const i = s.indexOf("{");
    if (i >= 0) s = s.slice(i);
  }
  s = closeUnfinishedString(s);
  s = addMissingClosers(s);
  s = stripTrailingCommasBeforeBrace(s);

  // If still not parseable, progressively trim to the last comma (drop dangling prop) and re-close braces.
  for (let attempts = 0; attempts < 3; attempts++) {
    try {
      JSON.parse(s);
      return s; // already valid
    } catch {
      const idx = lastCommaOutsideString(s);
      if (idx === -1) break;
      // Cut at last comma, then close the braces again and strip trailing commas
      s = s.slice(0, idx).trim();
      // Ensure object ends properly
      s = addMissingClosers(s);
      s = stripTrailingCommasBeforeBrace(s);
      s = closeUnfinishedString(s);
    }
  }
  return s;
};

export function safeParseLLMJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  let txt = sanitizeForJson(stripJsonWrappers(raw.trim()));

  // If the model wrapped JSON inside backticks, strip them.
  if (txt.startsWith("```")) {
    const first = txt.indexOf("\n");
    const last = txt.lastIndexOf("```");
    if (first >= 0 && last > first) txt = txt.slice(first + 1, last);
  }

  let candidate = firstBalancedObject(txt);
  if (!candidate) return null;

  // First pass: vanilla parse if it's already valid.
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // continue to repair path
  }

  // Repair path for partial/incomplete JSON
  const repaired = tryRepairJsonFragment(candidate);
  try {
    return JSON.parse(repaired) as T;
  } catch {
    // One more minimal cleanup: remove any trailing comma before final brace after repairs
    const finalFix = stripTrailingCommasBeforeBrace(repaired);
    try {
      return JSON.parse(finalFix) as T;
    } catch {
      return null;
    }
  }
}
