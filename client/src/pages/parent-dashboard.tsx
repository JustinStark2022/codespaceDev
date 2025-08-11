import React, { useEffect, useRef, useState } from "react";
import ParentLayout from "@/components/layout/parent-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { ChatMessage } from "@/types/chat";
import { initialMessages } from "@/data/messages";

type VerseOfDay = {
  verse: string;
  reference: string;
  reflection?: string;
};

type Devotional = {
  title: string;
  content: string; // HTML or plaintext from LLM
  prayer: string;
};

type DashboardChild = {
  id: number;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

type RecentAlert = {
  id?: number;
  content_name?: string;
  flag_reason?: string | null;
  guidance_notes?: string | null;
  ai_analysis?: string | null;
  created_at?: string | null;
};

type FamilySummary =
  | {
      // from DB weekly_content_summaries
      summary_content?: string;
      parental_advice?: string;
      discussion_topics?: string;
      spiritual_guidance?: string;
      generated_at?: string;
      // optional helper shape the backend may return
      bullets?: string[];
      message?: string;
    }
  | null;

const fallbackChildImages = [
  "/images/profile-girl.png",
  "/images/profile-boy-2.png",
  "/images/profile-boy-1.png",
];

export default function ParentDashboard() {
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // chat state
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  // dashboard state
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [familySummary, setFamilySummary] = useState<FamilySummary>(null);
  const [children, setChildren] = useState<DashboardChild[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const r = await fetch("/api/ai/dashboard", { credentials: "include" });
        if (!r.ok) throw new Error(`dashboard ${r.status}`);
        const data = await r.json();

        // backend keys from /api/ai/dashboard
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
    }
    fetchDashboard();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { sender: "user", text: input };
    setMessages((msgs) => [...msgs, userMessage]);

    const current = input;
    setInput("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: current, context: "parent dashboard" }),
      });
      const data = await res.json();
      const botMessage: ChatMessage = { sender: "bot", text: data.response ?? "…" };
      setMessages((msgs) => [...msgs, botMessage]);
    } catch {
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "I'm having trouble connecting… please try again." },
      ]);
    }

    // keep scrolled to bottom
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const renderChildName = (c: DashboardChild) =>
    c.displayName ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    "Child";

  return (
    <ParentLayout title="My Faith Fortress Parent Dashboard">
      {loadingDashboard ? (
        <div className="p-6 text-sm text-muted-foreground">Loading dashboard…</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-8 gap-4">
          <div className="xl:col-span-10 flex flex-col gap-2">
            <div className="w-full max-h-[325px] xl:col-span-4 flex flex-row gap-4">
              {/* Children Overview */}
              <Card className="flex-1 min-w-0">
                <CardContent className="p-4">
                  <h2 className="font-bold mb-3">Children</h2>
                  {children.length > 0 ? (
                    <div className="space-y-3">
                      {children.map((child, i) => (
                        <div key={child.id} className="flex items-center gap-3">
                          <img
                            src={fallbackChildImages[i % fallbackChildImages.length]}
                            className="w-10 h-10 rounded-full"
                            alt="child avatar"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{renderChildName(child)}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {child.role}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No children linked.</p>
                  )}
                </CardContent>
              </Card>

              {/* Family Summary */}
              <Card className="max-h-[325px] w-[380px] flex-shrink-0">
                <CardContent className="p-4">
                  <h2 className="font-bold mb-3">
                    Family Content Summary &amp; Recommendation
                  </h2>
                  {familySummary?.bullets?.length ? (
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      {familySummary.bullets.map((b, idx) => (
                        <li key={idx} dangerouslySetInnerHTML={{ __html: b }} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {familySummary && "message" in familySummary && familySummary.message
                        ? familySummary.message
                        : "No summary available yet. Weekly reports appear after at least one week of family activity."}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Alerts */}
              <Card className="max-h-[325px] w-[300px] flex-shrink-0">
                <CardContent className="p-4">
                  <h2 className="font-bold mb-3">Recent Alerts</h2>
                  {recentAlerts.length > 0 ? (
                    <div className="space-y-2 text-sm">
                      {recentAlerts.map((a, idx) => (
                        <div key={idx} className="border rounded p-2">
                          <div className="font-medium">{a.content_name ?? "Content"}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.flag_reason || a.guidance_notes || "Needs review"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Check className="mx-auto h-8 w-8 text-green-500 mb-2" />
                      <p className="text-sm text-muted-foreground">No flagged content.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="w-full flex flex-row gap-4 h-full mt-2">
              <div className="flex-1 flex-col gap-2 h-full" style={{ width: 545 }}>
                {/* Verse of the Day */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <h2 className="text-lg font-bold">Verse of the Day</h2>
                    {verseOfDay && (verseOfDay.verse || verseOfDay.reference) ? (
                      <>
                        <div className="font-semibold text-blue-700 mt-1">
                          {verseOfDay.verse}
                        </div>
                        <div className="text-sm text-blue-600 font-medium">
                          — {verseOfDay.reference}
                        </div>
                        {!!verseOfDay.reflection && (
                          <div className="text-xs text-muted-foreground mt-2 italic">
                            {verseOfDay.reflection}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No verse available.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Devotional */}
                <Card className="h-[220px]">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-lg font-bold flex items-center">
                        <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                        Today&apos;s Devotional
                      </h2>
                      <Badge variant="secondary" className="text-xs">
                        AI Generated
                      </Badge>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm text-foreground leading-relaxed line-clamp-6">
                        {devotional?.content ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: devotional.content,
                            }}
                          />
                        ) : (
                          "Click to generate today's family devotional…"
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={async () => {
                          // you can open a modal in your app; for now just refresh devotional via the dashboard call
                          try {
                            const r = await fetch("/api/ai/devotional", {
                              credentials: "include",
                            });
                            const d = await r.json();
                            setDevotional(d);
                          } catch {
                            // no-op
                          }
                        }}
                      >
                        Read Full Devotional
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chat Assistant */}
              <Card className="h-[280px] flex-1">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto pr-1">
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend();
                      }}
                    />
                    <Button size="sm" onClick={handleSend} className="ml-2">
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </ParentLayout>
  );
}
