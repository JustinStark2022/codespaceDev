import React, { useEffect, useRef, useState } from "react";
import ParentLayout from "@/components/layout/parent-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ChatMessage } from "@/types/chat";
import { initialMessages } from "@/data/messages";

const fallbackChildImages = [
  "/images/profile-girl.png",
  "/images/profile-boy-2.png",
  "/images/profile-boy-1.png",
];

export default function ParentDashboard() {
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  // Unified dashboard data state
  const [verseOfDay, setVerseOfDay] = useState<any>(null);
  const [familySummary, setFamilySummary] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const r = await fetch("/api/ai/dashboard", { credentials: "include" });
        const data = await r.json();
        setVerseOfDay(data.verseOfDay);
        setFamilySummary(data.familySummary);
        setChildren(data.children || []);
        setRecentAlerts(data.recentAlerts || []);
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
    setInput("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, context: "parent dashboard" }),
      });
      const data = await res.json();
      const botMessage: ChatMessage = { sender: "bot", text: data.response };
      setMessages((msgs) => [...msgs, botMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        sender: "bot",
        text: "I'm having trouble connecting...",
      };
      setMessages((msgs) => [...msgs, errorMessage]);
    }
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <ParentLayout title="My Faith Fortress Parent Dashboard">
      {loadingDashboard ? (
        <p>Loading dashboard...</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-8 gap-4">
          <div className="xl:col-span-10 flex flex-col gap-2">
            <div className="w-full max-h-[325px] xl:col-span-4 flex flex-row gap-4">
              {/* Children Overview */}
              <Card className="flex-1 min-w-0 p-4">
                <h2 className="font-bold mb-2">Children</h2>
                {children.length > 0 ? (
                  children.map((child, i) => (
                    <div key={child.id} className="flex items-center gap-2">
                      <img
                        src={child.profilePicture || fallbackChildImages[i % fallbackChildImages.length]}
                        alt={child.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <span>{child.name}</span>
                    </div>
                  ))
                ) : (
                  <p>No children linked.</p>
                )}
              </Card>

              {/* Family Summary */}
              <Card className="max-h-[325px] w-[380px] flex-shrink-0 p-4">
                <h2>Family Content Summary & Recommendation</h2>
                {familySummary?.bullets ? (
                  <ul className="list-disc pl-5 space-y-2 text-sm">
                    {familySummary.bullets.map((b: string, idx: number) => (
                      <li key={idx} dangerouslySetInnerHTML={{ __html: b }} />
                    ))}
                  </ul>
                ) : (
                  <p>No summary available.</p>
                )}
              </Card>

              {/* Alerts */}
              <Card className="max-h-[325px] w-[300px] flex-shrink-0 p-4">
                <h2>Recent Alerts</h2>
                {recentAlerts.length > 0 ? (
                  recentAlerts.map((alert, idx) => (
                    <div key={idx}>
                      {alert.name} – {alert.flagReason}
                    </div>
                  ))
                ) : (
                  <div>
                    <Check className="mx-auto h-8 w-8 text-green-500" />
                    <p>No flagged content.</p>
                  </div>
                )}
              </Card>
            </div>

            <div className="w-full flex flex-row gap-4 h-full mt-2">
              <div className="flex-1 flex-col gap-2 h-full" style={{ width: 545 }}>
                {/* Verse of the Day */}
                <Card className="p-4 mb-4">
                  <h2 className="text-lg font-bold">Verse of the Day</h2>
                  {verseOfDay ? (
                    <>
                      <div className="font-semibold text-blue-700">{verseOfDay.verseText}</div>
                      <div className="text-sm text-blue-600 font-medium">
                        - {verseOfDay.reference}
                      </div>
                      <div className="text-xs text-gray-600 mt-2 italic">
                        {verseOfDay.reflection}
                      </div>
                    </>
                  ) : (
                    <p>No verse available.</p>
                  )}
                </Card>

                {/* Devotional */}
                <Card className="h-[200px] cursor-pointer hover:shadow-lg transition-shadow p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                      Today's Devotional
                    </h2>
                    <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm text-gray-700 leading-relaxed line-clamp-6">
                      {verseOfDay?.prayer
                        ? verseOfDay.prayer.substring(0, 300) + "..."
                        : "Click to generate today's family devotional..."}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Button variant="outline" size="sm" className="w-full">
                      Read Full Devotional
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Chatbot */}
              <Card className="h-[280px] flex-1 p-4 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`mb-2 ${msg.sender === "bot" ? "text-blue-600" : ""}`}>
                      {msg.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="mt-2 flex">
                  <input
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button size="sm" onClick={handleSend} className="ml-2">Send</Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </ParentLayout>
  );
}
