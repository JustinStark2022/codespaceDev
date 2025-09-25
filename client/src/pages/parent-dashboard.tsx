// client/src/components/pages/parent-dashboard.tsx
import React, { useEffect, useRef, useState } from "react";
import ParentLayout from "@/components/layout/parent-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, BookOpen, RefreshCcw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { ChatMessage } from "@/types/chat";
import { initialMessages } from "@/data/messages";
import {
  getAIDashboard,
  sendChatMessage,
  getVerseOfTheDay,
  getDailyDevotional,
} from "@/api/llm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---- Types ----
type VerseOfDay = {
  verse?: string;
  verseText?: string;
  reference?: string;
  reflection?: string;
  prayer?: string;
};

type Devotional = {
  title: string;
  content: string; // HTML or plaintext from LLM
  prayer: string;
};

type DashboardChild = {
  id: number;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  role?: string | null;
  createdAt?: string | null;
  // New optional fields (rendered if backend provides them)
  totalScreenTimeUsedMinutes?: number | null;   // minutes used today
  screenTimeLimitMinutes?: number | null;       // minutes allowed today
  lessonsAssignedCount?: number | null;         // number of active lessons
  online?: boolean | null;                      // presence
};

type RecentAlert = {
  id?: number;
  content_name?: string;
  flag_reason?: string | null;
  guidance_notes?: string | null;
  ai_analysis?: string | null;
  created_at?: string | null;
  title?: string;
  reason?: string;
};

type FamilySummary =
  | {
      bullets?: string[];
      message?: string;
      summary_content?: string;
      parental_advice?: string;
      discussion_topics?: string;
      spiritual_guidance?: string;
      generated_at?: string;
    }
  | null;

type AIDashboardResponse = {
  verseOfDay?: VerseOfDay | null;
  devotional?: Devotional | null;
  familySummary?: FamilySummary;
  children?: DashboardChild[];
  recentAlerts?: RecentAlert[];
};

// ---- Constants ----
const fallbackChildImages = [
  "/images/profile-girl.png",
  "/images/profile-boy-2.png",
  "/images/profile-boy-1.png",
];

// Daily cache helpers for LLM content (per user per day)
const todayStr = () => new Date().toISOString().slice(0, 10);
const llmCacheKey = (userId?: string | number) => `aiDailyLLM:${userId ?? "anon"}:${todayStr()}`;
type LlmDailyCache = {
  verseOfDay?: VerseOfDay | null;
  devotional?: Devotional | null;
  familySummary?: FamilySummary | null;
  savedAt: string;
};
const loadLlmDaily = (userId?: string | number): LlmDailyCache | null => {
  try {
    const raw = localStorage.getItem(llmCacheKey(userId));
    return raw ? (JSON.parse(raw) as LlmDailyCache) : null;
  } catch {
    return null;
  }
};
const saveLlmDaily = (
  userId: string | number | undefined,
  patch: Partial<Omit<LlmDailyCache, "savedAt">>
) => {
  const key = llmCacheKey(userId);
  const curr = loadLlmDaily(userId) ?? { savedAt: new Date().toISOString() };
  const next: LlmDailyCache = { ...curr, ...patch, savedAt: curr.savedAt || new Date().toISOString() };
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
};

// ---- Helpers (safe formatting for plaintext -> HTML) ----
const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const toSafeHtml = (s: string) => {
  const text = (s || "").trim();
  if (!text) return "";
  // Normalize newlines into paragraphs, preserve single newlines as <br/>
  const blocks = text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`);
  return blocks.join("");
};

// New: pick the scripture inside quotes if the LLM added extra narration
const extractQuotedVerse = (s: string) => {
  const t = (s || "").trim();
  if (!t) return "";
  // Prefer the longest quoted segment
  const quotes = Array.from(t.matchAll(/"([^"]{10,})"/g)).map((m) => m[1].trim());
  if (quotes.length) {
    // pick the longest quoted block to avoid partials
    return quotes.sort((a, b) => b.length - a.length)[0];
  }
  // Remove leading narrations like “Today’s Bible Verse … is …, which states,”
  return t.replace(/^\s*Today'?s\s+Bible\s+Verse.*?(?:states,?\s*)?/i, "").trim();
};

// New: build the single-line/top headline to display when collapsed
const buildVotdHeadline = (v?: { verse?: string; verseText?: string; reference?: string }) => {
  if (!v) return "";
  const verseRaw = v.verse ?? v.verseText ?? "";
  const verseOnly = extractQuotedVerse(verseRaw) || verseRaw;
  // If we have both, prefer “Reference: Verse”
  if (v.reference && verseOnly) return `${v.reference}: ${verseOnly}`;
  return verseOnly || v.reference || "";
};

// New: format minutes as "1h 20m"
const fmtMinutes = (m?: number | null): string => {
  if (m == null || isNaN(m)) return "—";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h && mm) return `${h}h ${mm}m`;
  if (h) return `${h}h`;
  return `${mm}m`;
};

// ---- Component ----
export default function ParentDashboard() {
  const { user } = useAuth();

  // dashboard state
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [votdExpanded, setVotdExpanded] = useState(false); // NEW: collapse Verse details
  const [refreshingDevo, setRefreshingDevo] = useState(false);
  const [familySummary, setFamilySummary] = useState<FamilySummary>(null);
  const [children, setChildren] = useState<DashboardChild[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);

  // normalize verse text key
  const verseText = (v: VerseOfDay | null) => (v?.verse ?? v?.verseText ?? "");

  // StrictMode fetch gate and "already have LLM cache" flag
  const effectRanRef = useRef(false);
  const hadLlmCacheRef = useRef(false);

  useEffect(() => {
    if (effectRanRef.current) return; // avoid duplicate runs in React 18 StrictMode (dev)
    effectRanRef.current = true;

    const uid = (user as any)?.id;
    // 1) Load today's LLM cache immediately (freeze LLM parts)
    const cached = loadLlmDaily(uid);
    if (cached) {
      hadLlmCacheRef.current = true;
      setVerseOfDay(cached.verseOfDay ?? null);
      setDevotional(cached.devotional ?? null);
      setFamilySummary(cached.familySummary ?? null);
    }

    // 2) Fetch dashboard once to populate live, non-LLM parts (children, alerts).
    //    If no LLM cache exists yet today, also set LLM state and persist it.
    (async () => {
      try {
        const data = (await getAIDashboard()) as AIDashboardResponse;
        // Always update live parts
        setChildren(Array.isArray(data.children) ? data.children : []);
        setRecentAlerts(Array.isArray(data.recentAlerts) ? data.recentAlerts : []);

        // Only set LLM fields if we did NOT have a cache for today
        if (!hadLlmCacheRef.current) {
          const v = data.verseOfDay ?? null;
          const d = data.devotional ?? null;
          const f = data.familySummary ?? null;
          setVerseOfDay(v);
          setDevotional(d);
          setFamilySummary(f);
          saveLlmDaily(uid, { verseOfDay: v, devotional: d, familySummary: f });
          hadLlmCacheRef.current = true;
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoadingDashboard(false);
      }
    })();
  }, [user]); // user dependency for per-user cache

  // Limit items so the dashboard fits the viewport without page scroll
  const childrenVisible = children; // show all children (no slicing)
  const alertsVisible = recentAlerts.slice(0, 4);
  const summaryBulletsVisible = Array.isArray(familySummary?.bullets)
    ? familySummary!.bullets
    : null;

  // ---- Actions ----
  const renderChildName = (c: DashboardChild) =>
    c.displayName ||
    c.name ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    "Child";

  const refreshVerse = async () => {
    try {
      const v = (await getVerseOfTheDay()) as VerseOfDay;
      setVerseOfDay(v);
      // Persist new verse for today so it stays fixed the rest of the day
      const uid = (user as any)?.id;
      saveLlmDaily(uid, { verseOfDay: v });
    } catch (e) {
      console.error("Failed to refresh verse", e);
    }
  };

  const refreshDevotional = async () => {
    try {
      setRefreshingDevo(true);
      const d = (await getDailyDevotional()) as Devotional;
      setDevotional(d);
      // setDevoExpanded(true); // removed: no expand/collapse, card is scrollable
      const uid = (user as any)?.id;
      saveLlmDaily(uid, { devotional: d });
    } catch (e) {
      console.error("Failed to refresh devotional", e);
    } finally {
      setRefreshingDevo(false);
    }
  };

  // ---- UI ----
  return (
    <ParentLayout title="Dashboard">
      {loadingDashboard ? (
        <div className="p-6 text-sm text-muted-foreground">Loading dashboard…</div>
      ) : (
        // Single-column, scrollable layout
        <div className="space-y-8 p-4 md:p-6 lg:p-8">
          {/* Children Section */}
          <Card>
            <CardContent className="p-5">
              <h2 id="children-heading" className="text-lg font-bold mb-4">Your Children</h2>
              {childrenVisible.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {childrenVisible.map((child, i) => {
                    const used = child.totalScreenTimeUsedMinutes ?? 0;
                    const limit = child.screenTimeLimitMinutes ?? 1;
                    const screenTimePercent = Math.min(100, (used / limit) * 100);
                    const lessons =
                      child.lessonsAssignedCount == null ? "—" : String(child.lessonsAssignedCount);
                    const isOnline = !!child.online;
                    return (
                      <Card key={child.id} className="transform hover:scale-105 transition-transform duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={fallbackChildImages[i % fallbackChildImages.length]}
                              className="w-16 h-16 rounded-full border-2 border-white shadow-md"
                              alt={`${renderChildName(child)} avatar`}
                            />
                            <div className="flex-1">
                              <div className="font-bold text-base">{renderChildName(child)}</div>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs mt-1 ${
                                  isOnline
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                                aria-label={isOnline ? "Online" : "Offline"}
                              >
                                <span
                                  className={`inline-block w-2 h-2 rounded-full ${
                                    isOnline ? "bg-green-500" : "bg-gray-400"
                                  }`}
                                />
                                {isOnline ? "Online" : "Offline"}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 space-y-3 text-sm">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-muted-foreground">Screen Time</span>
                                <span className="font-medium">{fmtMinutes(used)} / {fmtMinutes(limit)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full" style={{ width: `${screenTimePercent}%` }} />
                              </div>
                            </div>
                            <div className="flex justify-between items-center border-t pt-2">
                              <span className="text-muted-foreground">Lessons Assigned</span>
                              <span className="font-bold text-base">{lessons}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No children have been linked to your account yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Inspiration */}
          <Card aria-labelledby="inspiration-heading">
            <CardContent className="p-5">
              <h2 id="inspiration-heading" className="text-lg font-bold mb-4">Today&apos;s Inspiration</h2>
              <div className="border rounded-lg">
                <Tabs defaultValue="verse">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="verse">Verse of the Day</TabsTrigger>
                    <TabsTrigger value="devotional">Daily Devotional</TabsTrigger>
                  </TabsList>
                  <TabsContent value="verse" className="p-4">
                    <blockquote className="text-lg font-semibold text-blue-800 border-l-4 border-blue-300 pl-4">
                      {buildVotdHeadline(verseOfDay ?? undefined) || "No verse available."}
                    </blockquote>
                    {!!verseOfDay?.reflection && (
                      <div className="text-sm text-muted-foreground mt-3 italic">
                        {verseOfDay.reflection}
                      </div>
                    )}
                    {!!verseOfDay?.prayer && (
                      <div className="text-sm mt-3">
                        <p className="font-medium">Prayer:</p>
                        <p className="text-muted-foreground">{verseOfDay.prayer}</p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="devotional" className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base font-bold flex items-center">
                        <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                        Today&apos;s Devotional
                      </h3>
                      <Button size="sm" variant="outline" onClick={refreshDevotional} disabled={refreshingDevo}>
                        <RefreshCcw className={`h-4 w-4 ${refreshingDevo ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                    {devotional ? (
                      <div className="space-y-3">
                        {!!devotional.title && <h4 className="font-semibold">{devotional.title}</h4>}
                        <div
                          className="text-sm leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: /<\/?[a-z][\s\S]*>/i.test(devotional.content)
                              ? devotional.content
                              : toSafeHtml(devotional.content),
                          }}
                        />
                        {!!devotional.prayer && (
                          <div className="text-sm mt-3 border-t pt-3">
                            <p className="font-medium">Prayer:</p>
                            <p className="text-muted-foreground">{devotional.prayer}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        Click refresh to generate today&apos;s family devotional.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Family Summary */}
          <Card aria-labelledby="summary-heading" className="bg-gray-50">
            <CardContent className="p-5">
              <h2 id="summary-heading" className="text-lg font-bold mb-3">
                Family Content Summary &amp; Recommendations
              </h2>
              {summaryBulletsVisible && summaryBulletsVisible.length > 0 ? (
                <div className="prose prose-sm max-w-none text-gray-800">
                  <ul className="space-y-2">
                    {summaryBulletsVisible.map((b, idx) => (
                      <li key={idx} dangerouslySetInnerHTML={{ __html: b }} />
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {familySummary && "message" in (familySummary as any) && (familySummary as any)?.message
                    ? (familySummary as any).message
                    : "No summary available yet. Weekly reports appear after at least one week of family activity."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardContent className="p-5">
              <h2 id="alerts-heading" className="text-lg font-bold mb-4">Recent Alerts</h2>
              {alertsVisible.length > 0 ? (
                <div className="space-y-3">
                  {alertsVisible.map((a, idx) => (
                    <Card key={idx} className="border-l-4 border-red-500 bg-red-50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="font-bold text-red-800">{a.content_name ?? a.title ?? "Content"}</div>
                        <p className="text-sm text-red-700 mt-1">
                          {a.flag_reason || a.guidance_notes || a.reason || "Needs review"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Check className="mx-auto h-10 w-10 text-green-500 mb-2" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">No flagged content to review.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </ParentLayout>
  );
}