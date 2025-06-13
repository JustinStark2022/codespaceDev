import { Child } from "@/types/user";

// ✅ Fetch the list of children
export const fetchChildren = async (): Promise<Child[]> => {
  const res = await fetch("/api/user/children", {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch children");
  }

  return res.json();
};

// ✅ Create a new child account
export const createChild = async (childData: {
  username: string;
  password: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email?: string;
}): Promise<Child> => {
  const response = await fetch("/api/user/children", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(childData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to create child");
  }

  return response.json();
};
