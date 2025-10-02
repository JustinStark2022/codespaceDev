import { User } from "@/types/user";

export async function getMe(): Promise<User> {
  const res = await fetch("/api/user", {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
    }
    throw new Error("Failed to fetch user");
  }

  const data = await res.json();
  
  // Transform backend response to match frontend User interface
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    display_name: data.display_name,
    role: data.role,
    parent_id: data.parent_id,
    first_name: data.first_name,
    last_name: data.last_name,
    created_at: data.created_at,
    isParent: data.role === "parent"
  };
}

export interface LoginResponse {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: string;
  parentId?: number | null;
  firstName: string;
  lastName: string;
  createdAt?: string;
  isParent: boolean;
  token?: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch("/api/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Login failed" }));
    throw new Error(errorData.message || "Login failed");
  }

  const data = await response.json();
  
  // Transform backend response to match frontend expectations
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    displayName: data.displayName || data.display_name,
    role: data.role,
    parentId: data.parentId || data.parent_id,
    firstName: data.firstName || data.first_name,
    lastName: data.lastName || data.last_name,
    createdAt: data.createdAt || data.created_at,
    isParent: data.isParent || data.role === "parent",
    token: data.token
  };
}