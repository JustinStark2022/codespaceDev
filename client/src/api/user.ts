import { User } from "@/types/user";

export async function getMe(): Promise<User> {
  const res = await fetch("/api/user", {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Not strictly necessary to handle here, as caller should handle promise rejection
    }
    throw new Error("Failed to fetch user");
  }

  const data = await res.json();

  // Backend response is now aligned with frontend User type (camelCase)
  return data;
}

export async function login(username: string, password: string): Promise<User> {
  const response = await fetch("/api/login", {
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

  // Backend returns { user, token }, we rely on HttpOnly cookie for auth
  // and use the user object to set the auth context.
  if (!data.user) {
    throw new Error("Login response did not include user data.");
  }

  return data.user;
}