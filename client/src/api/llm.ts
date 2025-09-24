/// <reference types="vite/client" />
// client/src/api/llm.ts
import { apiRequest } from "@/lib/queryClient";

/**
 * Helper that tries a primary endpoint and (optionally) a legacy fallback.
 * Keeps your current code working even if some routes are still on the old paths.
 */
async function tryJson<T>(
  primary: () => Promise<Response>,
  fallback?: () => Promise<Response>
): Promise<T> {
  try {
    const res = await primary();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    if (!fallback) throw err;
    const res = await fallback();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

const API_BASE = import.meta.env.VITE_API_BASE || ""; // keep relative by default

async function fetchJson(path: string, init?: RequestInit) {
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
  return fetchJson(`${API_BASE}/api/ai/dashboard`);
};

/* ------------------------------------------------------------------
 * VERSE OF THE DAY
 * GET /api/ai/verse-of-the-day (primary)
 * ------------------------------------------------------------------ */
export const getVerseOfTheDay = async () => {
  return fetchJson(`${API_BASE}/api/ai/verse-of-day`);
};

/* ------------------------------------------------------------------
 * DEVOTIONAL
 * GET /api/ai/devotional?topic=... (primary)
 * ------------------------------------------------------------------ */
export const getDailyDevotional = async (topic?: string) =>
  tryJson(
    () =>
      apiRequest(
        "GET",
        `/api/ai/devotional${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`
      ),
    () => apiRequest("GET", "/api/devotional/daily")
  );

/* ------------------------------------------------------------------
 * CHAT
 * POST /api/ai/chat
 * ------------------------------------------------------------------ */
export const sendChatMessage = async (message: string, context?: string) => {
  const res = await apiRequest("POST", "/api/ai/chat", { message, context });
  return res.json();
};

/* ------------------------------------------------------------------
 * CONTENT SCAN (unified)
 * POST /api/ai/content-scan (primary LLM analyzer)
 * (keeps your existing monitor endpoints below untouched)
 * ------------------------------------------------------------------ */
export const scanContent = async (data: {
  content: string;
  type?: string;          // renamed from contentType in LLM route
  contentName?: string;
  platform?: string;
  childId?: number;
}) => {
  const res = await apiRequest("POST", "/api/ai/content-scan", data);
  return res.json();
};

/* ------------------------------------------------------------------
 * LESSON GENERATION
 * POST /api/ai/generate-lesson (primary)
 * (your previous generateCustomLesson stays for compatibility)
 * ------------------------------------------------------------------ */
export const generateLesson = async (data: {
  topic: string;
  ageGroup?: string;
  duration?: number;
  difficulty?: string;
  childId?: number;
}) => {
  const res = await apiRequest("POST", "/api/ai/generate-lesson", data);
  return res.json();
};

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

// Blog (existing)
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
