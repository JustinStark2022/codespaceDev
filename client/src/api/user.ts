import { User } from "@/types/user";

const API_BASE = import.meta.env.VITE_API_URL || "";

export interface MeResponse {
  user: User;
  children: User[];
  verseOfDay?: {
    reference: string;
    verseText: string;
    reflection?: string;
    prayer?: string;
  } | null;
  isVerseGenerating?: boolean; // new flag
}

export async function getMe(): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/api/user`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Unauthorized" : "Failed to fetch user");
  return res.json();
}

export async function login(username: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Login failed" }));
    throw new Error(errorData.message || "Login failed");
  }

  const data = await response.json();

  // Adjust expectation (token removed) - backend now returns { message, user }
  if (!data.user) throw new Error("Login response did not include user data.");
  return data.user;
}