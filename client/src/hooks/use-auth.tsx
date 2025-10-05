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
    verseOfDay,
    verseGenerating, // expose flag
    isLoading,
    isError,
    fetchUser,
    logout,
    setUser,
  };
}
