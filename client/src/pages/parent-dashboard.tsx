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
  const [devoExpanded, setDevoExpanded] = useState(false);
  const [votdExpanded, setVotdExpanded] = useState(false); // NEW: collapse Verse details
  const [refreshingDevo, setRefreshingDevo] = useState(false);
  const [familySummary, setFamilySummary] = useState<FamilySummary>(null);
  const [children, setChildren] = useState<DashboardChild[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);

  // normalize verse text key
  const verseText = (v: VerseOfDay | null) => (v?.verse ?? v?.verseText ?? "");

  useEffect(() => {
    (async () => {
      try {
        const data = (await getAIDashboard()) as AIDashboardResponse;
        setVerseOfDay(data.verseOfDay ?? null);
        setDevotional(data.devotional ?? null);
        setFamilySummary(data.familySummary ?? null);
        setChildren(Array.isArray(data.children) ? data.children : []);
        setRecentAlerts(Array.isArray(data.recentAlerts) ? data.recentAlerts : []);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoadingDashboard(false);
      }
    })();
  }, []);

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

  const refreshVerse = async () => {
    try {
      const v = (await getVerseOfTheDay()) as VerseOfDay;
      setVerseOfDay(v);
    } catch (e) {
      console.error("Failed to refresh verse", e);
    }
  };

  const refreshDevotional = async () => {
    try {
      setRefreshingDevo(true);
      const d = (await getDailyDevotional()) as Devotional;
      setDevotional(d);
      setDevoExpanded(true); // show the full new devotional after refresh
    } catch (e) {
      console.error("Failed to refresh devotional", e);
    } finally {
      setRefreshingDevo(false);
    }
  };

  // ---- UI ----
  return (
    <ParentLayout title="My Faith Fortress Parent Dashboard">
      {loadingDashboard ? (
        <div className="p-6 text-sm text-muted-foreground">Loading dashboard…</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          {/* Left column (spans 7): Children (top), Verse, Devotional */}
          <div className="xl:col-span-7 flex flex-col gap-4">
            {/* Children Overview (top-left) */}
            <Card aria-labelledby="children-heading">
              <CardContent className="p-4">
                <h2 id="children-heading" className="font-bold mb-3">
                  Children
                </h2>
                {children.length > 0 ? (
                  <div className="overflow-x-auto">
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
                        {children.map((child, i) => {
                          const used = fmtMinutes(child.totalScreenTimeUsedMinutes);
                          const limit = fmtMinutes(child.screenTimeLimitMinutes);
                          const lessons =
                            child.lessonsAssignedCount == null
                              ? "—"
                              : String(child.lessonsAssignedCount);
                          const isOnline = !!child.online;
                          return (
                            <tr key={child.id} className="align-top border-t">
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
                                      <span className="text-xs text-muted-foreground capitalize">
                                        {child.role}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 pr-2">
                                <span className="whitespace-nowrap">{used}</span>
                                <span className="text-muted-foreground"> / {limit}</span>
                              </td>
                              <td className="py-2 pr-2">{lessons}</td>
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

            {/* Verse of the Day (with collapsible details) */}
            <Card aria-labelledby="votd-heading">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h2 id="votd-heading" className="text-lg font-bold">
                    Verse of the Day
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVotdExpanded((v) => !v)}
                      aria-expanded={votdExpanded}
                    >
                      {votdExpanded ? "Hide Details" : "Read More"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshVerse}
                      aria-label="Refresh verse of the day"
                    >
                      <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                  </div>
                </div>
                {verseText(verseOfDay) || verseOfDay?.reference ? (
                  <>
                    <div className="font-semibold text-blue-700 mt-1 leading-relaxed">
                      {verseText(verseOfDay)}
                    </div>
                    {!!verseOfDay?.reference && (
                      <div className="text-sm text-blue-600 font-medium mt-1">
                        — {verseOfDay.reference}
                      </div>
                    )}
                    {votdExpanded && (
                      <>
                        {!!verseOfDay?.reflection && (
                          <div className="text-sm text-muted-foreground mt-3 italic">
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
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No verse available.</p>
                )}
              </CardContent>
            </Card>

            {/* Devotional (unchanged expand/collapse) */}
            <Card aria-labelledby="devo-heading">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <h2 id="devo-heading" className="text-lg font-bold flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                    Today&apos;s Devotional
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge aria-label="AI generated content" variant="secondary" className="text-xs">
                      AI Generated
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshDevotional}
                      disabled={refreshingDevo}
                      aria-label="Generate a new devotional"
                    >
                      <RefreshCcw className="h-4 w-4 mr-1" />
                      {refreshingDevo ? "Refreshing…" : "Refresh"}
                    </Button>
                  </div>
                </div>

                <div className={`flex-1 overflow-y-auto ${devoExpanded ? "" : "max-h-[140px]"} pr-1`}>
                  {devotional ? (
                    <>
                      {!!devotional.title && (
                        <div className="font-semibold mb-2">{devotional.title}</div>
                      )}
                      <div
                        className="text-sm leading-relaxed text-foreground"
                        // Prefer provided HTML, otherwise convert plaintext to paragraphs
                        dangerouslySetInnerHTML={{
                          __html:
                            /<\/?[a-z][\s\S]*>/i.test(devotional.content)
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

                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDevoExpanded((v) => !v)}
                    aria-expanded={devoExpanded}
                    aria-controls="devo-content"
                  >
                    {devoExpanded ? "Collapse Devotional" : "Read Full Devotional"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Chat Assistant spans two rows to fill space */}
          <div className="xl:col-span-5 xl:row-span-2">
            <Card aria-labelledby="chat-heading" className="h-full">
              <CardContent className="p-4 h-full flex flex-col">
                <h2 id="chat-heading" className="text-lg font-bold mb-2">
                  Assistant
                </h2>
                <div
                  className="flex-1 overflow-y-auto pr-1 border rounded-sm p-2 bg-white"
                  role="log"
                  aria-live="polite"
                >
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`mb-2 text-sm ${
                        m.sender === "bot" ? "text-blue-700" : "text-foreground"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
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

          {/* Bottom row: Summary and Alerts sit under left column only (avoid blank under chat) */}
          <div className="xl:col-span-7 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Family Summary */}
            <Card aria-labelledby="summary-heading">
              <CardContent className="p-4">
                <h2 id="summary-heading" className="font-bold mb-3">
                  Family Content Summary &amp; Recommendations
                </h2>
                {familySummary?.bullets?.length ? (
                  <ul className="list-disc pl-5 space-y-2 text-sm">
                    {familySummary.bullets.map((b, idx) => (
                      <li key={idx} dangerouslySetInnerHTML={{ __html: b }} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {familySummary && "message" in familySummary && familySummary?.message
                      ? familySummary.message
                      : "No summary available yet. Weekly reports appear after at least one week of family activity."}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card aria-labelledby="alerts-heading">
              <CardContent className="p-4">
                <h2 id="alerts-heading" className="font-bold mb-3">Recent Alerts</h2>
                {recentAlerts.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {recentAlerts.map((a, idx) => (
                      <div key={idx} className="border rounded p-2">
                        <div className="font-medium">
                          {a.content_name ?? a.title ?? "Content"}
                        </div>
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
          </div>
        </div>
      )}
    </ParentLayout>
  );
}