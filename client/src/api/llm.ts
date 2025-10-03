/// <reference types="vite/client" />
// client/src/api/llm.ts
import { apiRequest } from "@/lib/queryClient";

const API_BASE = import.meta.env.VITE_API_BASE || ""; // keep relative by default

async function fetchJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------
 * DASHBOARD (LLM aggregate)
 * GET /api/ai/dashboard   (primary)
 * ------------------------------------------------------------------ */
export const getAIDashboard = async () => {
  try {
    return await fetchJson(`${API_BASE}/api/ai/dashboard`);
  } catch {
    // graceful minimal fallback
    const [verseOfDay, devotional] = await Promise.all([
      fetchJson(`${API_BASE}/api/ai/verse-of-the-day`).catch(() => null),
      fetchJson(`${API_BASE}/api/ai/devotional`).catch(() => null),
    ]);
    return { verseOfDay, devotional, familySummary: null, children: [], recentAlerts: [] };
  }
};

/* ------------------------------------------------------------------
 * VERSE OF THE DAY
 * GET /api/ai/verse-of-the-day (primary)
 * ------------------------------------------------------------------ */
export const getVerseOfTheDay = () => fetchJson(`${API_BASE}/api/ai/verse-of-the-day`);

/* ------------------------------------------------------------------
 * DEVOTIONAL
 * GET /api/ai/devotional?topic=... (primary)
 * ------------------------------------------------------------------ */
export const getDailyDevotional = (topic?: string) =>
  fetchJson(
    `${API_BASE}/api/ai/devotional${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`
  );

/* ------------------------------------------------------------------
 * CHAT
 * POST /api/ai/chat
 * ------------------------------------------------------------------ */
export const sendChatMessage = (message: string, context?: string) =>
  fetchJson(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    body: JSON.stringify({ message, context }),
  });

/* ------------------------------------------------------------------
 * CONTENT SCAN (unified)
 * POST /api/ai/content-scan (primary LLM analyzer)
 * (keeps your existing monitor endpoints below untouched)
 * ------------------------------------------------------------------ */
export const scanContent = (data: {
  content: string;
  type?: string;          // renamed from contentType in LLM route
  contentName?: string;
  platform?: string;
  childId?: number;
}) =>
  fetchJson(`${API_BASE}/api/ai/content-scan`, {
    method: "POST",
    body: JSON.stringify(data),
  });

/* ------------------------------------------------------------------
 * LESSON GENERATION
 * POST /api/ai/generate-lesson (primary)
 * (your previous generateCustomLesson stays for compatibility)
 * ------------------------------------------------------------------ */
export const generateLesson = (data: {
  topic: string;
  ageGroup?: string;
  duration?: number;
  difficulty?: string;
  childId?: number;
}) =>
  fetchJson(`${API_BASE}/api/ai/generate-lesson`, {
    method: "POST",
    body: JSON.stringify(data),
  });

/* =========================
 * KEEPING YOUR EXISTING API
 * ========================= */

// Content monitoring (existing)
export const analyzeContent = async (data: {
  content: string;
  contentType?: string;
  childId?: number;
  source?: string;
}) => {
  const res = await apiRequest("POST", "/api/monitor/analyze", data);
  return res.json();
};

export const getWeeklySummary = async (data: {
  childId?: number;
  weekStart?: string;
  weekEnd?: string;
}) => {
  const res = await apiRequest("POST", "/api/monitor/weekly-summary", data);
  return res.json();
};

// Lessons (existing)
export const generateCustomLesson = async (data: {
  age: number;
  topic: string;
  difficulty?: string;
}) => {
  const res = await apiRequest("POST", "/api/lessons/generate", data);
  return res.json();
};

/* ------------------------------------------------------------------
 * BLOG (existing)
 * ------------------------------------------------------------------ */
export const generateParentBlog = async (data: {
  topic?: string;
  category?: string;
}) => {
  const res = await apiRequest("POST", "/api/blog/parent", data);
  return res.json();
};

export const generateKidsBlog = async (data: {
  topic?: string;
  age?: number;
  category?: string;
}) => {
  const res = await apiRequest("POST", "/api/blog/kids", data);
  return res.json();
};
