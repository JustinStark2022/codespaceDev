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

// ✅ Create a new child account with profile picture
export const createChild = async (childData: {
  username: string;
  password: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email?: string;
  age: number;
  profilePicture?: File | null;
}): Promise<Child> => {
  // Create FormData to handle file upload
  const formData = new FormData();

  // Add all text fields
  formData.append("username", childData.username);
  formData.append("password", childData.password);
  formData.append("display_name", childData.display_name);
  formData.append("first_name", childData.first_name);
  formData.append("last_name", childData.last_name);
  formData.append("age", childData.age.toString());

  if (childData.email) {
    formData.append("email", childData.email);
  }

  // Add profile picture if provided
  if (childData.profilePicture) {
    formData.append("profilePicture", childData.profilePicture);
  }

  const response = await fetch("/api/user/children", {
    method: "POST",
    credentials: "include",
    // Don't set Content-Type header - let browser set it with boundary for FormData
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to create child");
  }

  return response.json();
};
