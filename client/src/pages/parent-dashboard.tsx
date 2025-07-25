// src/components/ParentDashboard.tsx

import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ParentLayout from "@/components/layout/parent-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  UserPlus,
  ShieldCheck,
  BookOpen,
  MessageCircle,
  PlusCircle,
  UserCog,
  Eye,
  Check,
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Child } from "@/types/user";
import { fetchChildren } from "@/api/children";
import { getFlaggedContent, FlaggedContent } from "@/api/monitoring";
import { getDailyDevotional, getVerseOfTheDay } from "@/api/llm";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/types/chat";
import { initialMessages } from "@/data/messages";

const fallbackChildImages = [
  "/images/profile-girl.png",
  "/images/profile-boy-2.png",
  "/images/profile-boy-1.png",
];

function FamilySummary() {
  return (
    <ul className="list-disc pl-5 space-y-2 text-sm">
      <li><b>1. Daily Bible Time:</b> Encourage each child...</li>
      <li><b>2. Family Devotions:</b> Set aside time weekly...</li>
      <li><b>3. Serve Others:</b> Find ways to serve together...</li>
    </ul>
  );
}

function VerseOfTheDay({ mode }: { mode: "auto" | "manual" }) {
  const [manualVerse, setManualVerse] = useState(
    "Philippians 4:13 - I can do all things through Christ who strengthens me."
  );
  const [generatedVerse, setGeneratedVerse] = useState({
    verse: "Trust in the Lord ...",
    reference: "Proverbs 3:5",
    reflection: "God's wisdom is always ...",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode === "auto") {
      setIsLoading(true);
      getVerseOfTheDay()
        .then((data) => setGeneratedVerse(data))
        .catch((err) => console.error("Failed to fetch verse:", err))
        .finally(() => setIsLoading(false));
    }
  }, [mode]);

  return mode === "auto" ? (
    <div className="space-y-2">
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading today's verse...</div>
      ) : (
        <>
          <div className="font-semibold text-blue-700">{generatedVerse.verse}</div>
          <div className="text-sm text-blue-600 font-medium">
            - {generatedVerse.reference}
          </div>
          <div className="text-xs text-gray-600 mt-2 italic">
            {generatedVerse.reflection}
          </div>
        </>
      )}
    </div>
  ) : (
    <div>
      <div className="mb-2">
        <span className="font-semibold text-blue-700">{manualVerse}</span>
      </div>
      <input
        className="border rounded px-2 py-1 w-full text-sm"
        value={manualVerse}
        onChange={(e) => setManualVerse(e.target.value)}
      />
    </div>
  );
}

function DevotionalCard() {
  const devotionalQuery = useQuery({
    queryKey: ["dailyDevotional"],
    queryFn: () => getDailyDevotional(),
    staleTime: 1000 * 60 * 60 * 12,
  });

  if (devotionalQuery.isLoading) {
    return (
      <Card className="h-[200px]">
        <CardContent className="pt-4 flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Preparing today's devotional...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (devotionalQuery.isError) {
    return (
      <Card className="h-[200px]">
        <CardContent className="pt-4 flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm text-red-600">Unable to load devotional</p>
            <p className="text-xs text-gray-500">Please try refreshing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const devotional = devotionalQuery.data as { content?: string };

  return (
    <Card className="h-[200px] cursor-pointer hover:shadow-lg transition-shadow">
      <CardContent className="pt-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
            Today's Devotional
          </h2>
          <Badge variant="secondary" className="text-xs">AI Generated</Badge>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="text-sm text-gray-700 leading-relaxed line-clamp-6">
            {devotional.content ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: devotional.content.substring(0, 300) + '...'
                }}
              />
            ) : (
              "Click to generate today's family devotional..."
            )}
          </div>
        </div>
        <div className="mt-2">
          <Button variant="outline" size="sm" className="w-full">Read Full Devotional</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  const childrenQuery = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: fetchChildren,
  });
  const flaggedQuery = useQuery<FlaggedContent[]>({
    queryKey: ["flaggedContent"],
    queryFn: getFlaggedContent,
  });

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      sender: "user",
      text: input,
    };

    setMessages((msgs) => [...msgs, userMessage]);
    setInput("");

    try {
      const res = await apiRequest("POST", "/api/ai/chat", {
        message: input,
        context: "parent dashboard",
      });
      const data = await res.json();

      const botMessage: ChatMessage = {
        sender: "bot",
        text: data.response,
      };

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
      <div className="grid grid-cols-2 lg:grid-cols-8 gap-4">
        <div className="xl:col-span-10 flex flex-col gap-2">
          <div className="w-full max-h-[325px] xl:col-span-4 flex flex-row gap-4">
            {/* Children Overview */}
            <Card className="flex-1 min-w-0">
              {/* ... (same as before) */}
            </Card>

            {/* Family Summary */}
            <Card className="max-h-[325px] w-[380px] flex-shrink-0">
              <CardContent className="pt-6">
                <h2>Family Content Summary & Recommendation</h2>
                <FamilySummary />
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card className="max-h-[325px] w-[300px] flex-shrink-0">
              <CardContent className="pt-3 overflow-hidden">
                <h2>Recent Alerts</h2>
                {flaggedQuery.isLoading ? (
                  <p>Loading alerts...</p>
                ) : flaggedQuery.data?.length ? (
                  flaggedQuery.data.map((flag) => (
                    <div key={flag.id}>{flag.name} – {flag.flagReason}</div>
                  ))
                ) : (
                  <div>
                    <Check className="mx-auto h-8 w-8 text-green-500" />
                    <p>No flagged content.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="w-full flex flex-row gap-4 h-full mt-2">
            <div className="flex-1 flex-col gap-2 h-full" style={{ width: 545 }}>
              <div className="flex flex-row ...">
                {/* Action Cards rows */}
              </div>

              <DevotionalCard />
            </div>

            {/* Chatbot */}
            <Card className="h-[280px] flex-1">
              <CardContent className="...">
                {/* Chat UI */}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}
