// src/hooks/use-auth.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { User } from "../types/user";
import { getMe, MeResponse } from "../api/user";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<User[]>([]);
  const [verseOfDay, setVerseOfDay] = useState<MeResponse["verseOfDay"]>(null);
  const [verseGenerating, setVerseGenerating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [location, navigate] = useLocation();
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [parentScreenTime, setParentScreenTime] = useState<{ used: number; allowed: number } | null>(null);
  const [childrenScreenTime, setChildrenScreenTime] = useState<Array<{ childId: number; username: string; allowed: number; used: number }>>([]);
  const [recentActivityLogs, setRecentActivityLogs] = useState<any[]>([]);
  const [recentContentAnalysis, setRecentContentAnalysis] = useState<any[]>([]);
  const [latestWeeklySummary, setLatestWeeklySummary] = useState<any | null>(null);

  const hasFetchedRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const fetchUser = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;
    setIsLoading(true);
    const run = (async () => {
      try {
        const meResp: MeResponse = await getMe();
        setUser(meResp.user);
        setChildren(meResp.children || []);
        setVerseOfDay(meResp.verseOfDay ?? null);
        setVerseGenerating(!!meResp.isVerseGenerating);
        setIsError(false);
        setChildrenCount(meResp.childrenCount ?? (meResp.children?.length || 0));
        setParentScreenTime(meResp.parentScreenTime ?? null);
        setChildrenScreenTime(meResp.childrenScreenTime ?? []);
        setRecentActivityLogs(meResp.recentActivityLogs ?? []);
        setRecentContentAnalysis(meResp.recentContentAnalysis ?? []);
        setLatestWeeklySummary(meResp.latestWeeklySummary ?? null);
        // ✅ Redirect if user is on /auth after successful login
        if (location === "/auth") {
          if (meResp.user.role === "parent") navigate("/dashboard");
          else navigate("/child-dashboard");
        }
      } catch (error) {
        console.warn("Auth fetchUser failed:", error);
        setIsError(true);
        setUser(null);
        setChildren([]);
        setVerseOfDay(null);
        setVerseGenerating(false);
        setChildrenCount(0);
        setParentScreenTime(null);
        setChildrenScreenTime([]);
        setRecentActivityLogs([]);
        setRecentContentAnalysis([]);
        setLatestWeeklySummary(null);

        // ⛔️ Prevent redirect loop if already on auth page
        if (location !== "/auth") navigate("/auth");
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = run;
    return run;
  }, [location, navigate]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (verseGenerating && !verseOfDay) {
      const t = setTimeout(() => {
        fetchUser();
      }, 3500); // re-check after background generation window
      return () => clearTimeout(t);
    }
  }, [verseGenerating, verseOfDay, fetchUser]);

  const logout = () => {
    fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      setUser(null);
      navigate("/auth");
    });
  };

  return {
    user,
    children,
    childrenCount,
    verseOfDay,
    verseGenerating,
    parentScreenTime,
    childrenScreenTime,
    recentActivityLogs,
    recentContentAnalysis,
    latestWeeklySummary,
    isLoading,
    isError,
    fetchUser,
    logout,
    setUser,
  };
}
