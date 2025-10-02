// client/src/components/pages/parent-dashboard.tsx
import React, { useEffect, useRef, useState } from "react";
import ParentLayout from "@/components/layout/parent-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { ChatMessage } from "@/types/chat";
import { initialMessages } from "@/data/messages";
import {
  getAIDashboard,
  sendChatMessage,
} from "@/api/llm";

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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // chat state
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // dashboard state
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [votdExpanded, setVotdExpanded] = useState(false); // NEW: collapse Verse details
  const [familySummary, setFamilySummary] = useState<FamilySummary>(null);
  const [children, setChildren] = useState<DashboardChild[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);

  const hadLlmCacheRef = useRef(false);

  useEffect(() => {
    const uid = (user as any)?.id;
    if (!uid) return;

    const cached = loadLlmDaily(uid);
    if (cached) {
      hadLlmCacheRef.current = true;
      setVerseOfDay(cached.verseOfDay ?? null);
      setDevotional(cached.devotional ?? null);
      setFamilySummary(cached.familySummary ?? null);
      setLoadingDashboard(false);
    }

    (async () => {
      try {
        const data = (await getAIDashboard()) as AIDashboardResponse;
        setChildren(Array.isArray(data.children) ? data.children : []);
        setRecentAlerts(Array.isArray(data.recentAlerts) ? data.recentAlerts : []);
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
      } catch (e) {
        console.error("Failed to load dashboard:", e);
      } finally {
        setLoadingDashboard(false);
      }
    })();
  }, [user?.id]);

  // Limit items so the dashboard fits the viewport without page scroll
  const childrenVisible = children; // show all children (no slicing)
  const alertsVisible = recentAlerts.slice(0, 4);
  const summaryBulletsVisible = Array.isArray(familySummary?.bullets)
    ? familySummary!.bullets!.slice(0, 3)
    : null;
  const messagesVisible = messages.slice(-6);

  // ---- Actions ----
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const prompt = input;
    setMessages((msgs) => [...msgs, { sender: "user", text: prompt }]);
    setInput("");
    setSending(true);
    try {
      const r = await sendChatMessage(
        prompt,
        // Stronger parent-focused guidance; keeps adult-facing tone while avoiding UI chatter
        "Parent dashboard: provide adult, parenting-focused guidance with Scripture-based, practical steps. No UI instructions, no greetings."
      );
      const reply = typeof r?.response === "string" ? r.response : r;
      setMessages((msgs) => [...msgs, { sender: "bot", text: String(reply ?? "…") }]);
    } catch {
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "I'm having trouble connecting… please try again." },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const renderChildName = (c: DashboardChild) =>
    c.displayName ||
    c.name ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    "Child";

  // ---- UI ----
  return (
    <ParentLayout title="My Faith Fortress Parent Dashboard">
      {loadingDashboard ? (
        <div className="p-6 text-sm text-muted-foreground">Loading dashboard…</div>
      ) : (
        // Two columns that fill the viewport height; each column manages its own vertical layout.
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4 h-full min-h-0">
            {/* Children card: taller and no internal scroll */}
            <Card aria-labelledby="children-heading" className="flex-[2] overflow-hidden">
              <CardContent className="p-4 h-full flex flex-col min-h-0">
                <h2 id="children-heading" className="font-bold mb-3">Children</h2>
                {childrenVisible.length > 0 ? (
                  <div className="flex-1 overflow-visible">
                    <table className="w-full text-sm" role="table" aria-label="Children overview">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="text-left py-2 pr-2">Child</th>
                          <th className="text-left py-2 pr-2">Screen Time</th>
                          <th className="text-left py-2 pr-2">Lessons</th>
                          <th className="text-left py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childrenVisible.map((child, i) => {
                          const used = fmtMinutes(child.totalScreenTimeUsedMinutes);
                          const limit = fmtMinutes(child.screenTimeLimitMinutes);
                          const lessons =
                            child.lessonsAssignedCount == null
                              ? "—"
                              : String(child.lessonsAssignedCount);
                          const isOnline = !!child.online;
                          return (
                            <tr key={child.id} className="align-top border-t">
                              {/* Child avatar/name/role */}
                              <td className="py-2 pr-2">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={fallbackChildImages[i % fallbackChildImages.length]}
                                    className="w-8 h-8 rounded-full"
                                    alt={`${renderChildName(child)} avatar`}
                                  />
                                  <div className="flex flex-col">
                                    <div className="font-medium">{renderChildName(child)}</div>
                                    {child.role ? (
                                      <span className="text-xs text-muted-foreground capitalize">{child.role}</span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              {/* Screen time */}
                              <td className="py-2 pr-2">
                                <span className="whitespace-nowrap">{fmtMinutes(child.totalScreenTimeUsedMinutes)}</span>
                                <span className="text-muted-foreground"> / {fmtMinutes(child.screenTimeLimitMinutes)}</span>
                              </td>
                              {/* Lessons */}
                              <td className="py-2 pr-2">
                                {child.lessonsAssignedCount == null ? "—" : String(child.lessonsAssignedCount)}
                              </td>
                              {/* Status */}
                              <td className="py-2">
                                <span
                                  className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs ${
                                    isOnline
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-600"
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
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No children linked.</p>
                )}
              </CardContent>
            </Card>

            {/* Verse of the Day */}
            <Card aria-labelledby="votd-heading" className="flex-[1.2] overflow-hidden">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h2 id="votd-heading" className="text-lg font-bold">Verse of the Day</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setVotdExpanded(v => !v)} aria-expanded={votdExpanded}>
                      {votdExpanded ? "Hide Details" : "Read More"}
                    </Button>
                  </div>
                </div>
                <div className="font-semibold text-blue-700 mt-1 leading-relaxed">
                  {buildVotdHeadline(verseOfDay ?? undefined) || "No verse available."}
                </div>
                {votdExpanded && (
                  <>
                    {!!verseOfDay?.reflection && (
                      <div className="text-sm text-muted-foreground mt-3 italic line-clamp-3">
                        {verseOfDay.reflection}
                      </div>
                    )}
                    {!!verseOfDay?.prayer && (
                      <div className="text-sm mt-3">
                        <span className="font-medium">Prayer:</span>{" "}
                        <span className="text-muted-foreground">{verseOfDay.prayer}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
{/* Family Summary: make taller */}
            <Card aria-labelledby="summary-heading" className="flex-[1.7] overflow-hidden">
              <CardContent className="p-4 h-full flex flex-col">
                <h2 id="summary-heading" className="font-bold mb-3">
                  Family Content Summary &amp; Recommendations
                </h2>
                {summaryBulletsVisible && summaryBulletsVisible.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2 text-sm">
                    {summaryBulletsVisible.map((b, idx) => (
                      <li key={idx} className="line-clamp-2" dangerouslySetInnerHTML={{ __html: b }} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {familySummary && "message" in (familySummary as any) && (familySummary as any)?.message
                      ? (familySummary as any).message
                      : "No summary available yet. Weekly reports appear after at least one week of family activity."}
                  </p>
                )}
              </CardContent>
            </Card>
            
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4 h-full min-h-0">
            {/* Recent Alerts */}
            <Card aria-labelledby="alerts-heading" className="flex-1 overflow-hidden">
              <CardContent className="p-4 h-full flex flex-col">
                <h2 id="alerts-heading" className="font-bold mb-3">Recent Alerts</h2>
                {alertsVisible.length > 0 ? (
                  <div className="space-y-2 text-sm overflow-auto">
                    {alertsVisible.map((a, idx) => (
                      <div key={idx} className="border rounded p-2">
                        <div className="font-medium">{a.content_name ?? a.title ?? "Content"}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.flag_reason || a.guidance_notes || a.reason || "Needs review"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Check className="mx-auto h-8 w-8 text-green-500 mb-2" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">No flagged content.</p>
                  </div>
                )}
              </CardContent>
            </Card>

           {/* Devotional: make taller */}
            <Card aria-labelledby="devo-heading" className="flex-[2] overflow-hidden">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <h2 id="devo-heading" className="text-lg font-bold flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                    Today&apos;s Devotional
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge aria-label="AI generated content" variant="secondary" className="text-xs">AI Generated</Badge>
                  </div>
                </div>
                <div className="flex-1 overflow-auto pr-1 overscroll-contain">
                  {devotional ? (
                    <>
                      {!!devotional.title && <div className="font-semibold mb-2">{devotional.title}</div>}
                      <div
                        className="text-sm leading-relaxed text-foreground"
                        dangerouslySetInnerHTML={{
                          __html: /<\/?[a-z][\s\S]*>/i.test(devotional.content)
                            ? devotional.content
                            : toSafeHtml(devotional.content),
                        }}
                      />
                      {!!devotional.prayer && (
                        <div className="text-sm mt-3">
                          <span className="font-medium">Prayer:</span>{" "}
                          <span className="text-muted-foreground">{devotional.prayer}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Click Refresh to generate today&apos;s family devotional…
                    </div>
                  )}
                </div>
                {/* Removed expand/collapse button */}
              </CardContent>
            </Card>

            {/* Assistant: taller to fill space */}
            <Card aria-labelledby="chat-heading" className="flex-[3] overflow-hidden">
              <CardContent className="p-4 h-full flex flex-col min-h-0">
                <h2 id="chat-heading" className="text-lg font-bold mb-2">Assistant</h2>
                <div
                  className="flex-1 border rounded-sm p-2 bg-white overflow-auto overscroll-contain"
                  role="log"
                  aria-live="polite"
                >
                  {/* Show only the last few messages to avoid overflow */}
                  {messagesVisible.map((m, i) => (
                    <div
                      key={i}
                      className={`mb-2 text-sm ${m.sender === "bot" ? "text-blue-700" : "text-foreground"}`}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex">
                  <input
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message…"
                    aria-label="Type your message"
                    disabled={sending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                  />
                  <Button size="sm" onClick={handleSend} className="ml-2" disabled={sending}>
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </ParentLayout>
  );
}