export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: "parent" | "child";
  parent_id?: number;
  first_name: string;
  last_name: string;
  created_at: string;
  isParent: boolean;
}

export interface Child {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  created_at: string;
  role: "child";
  parent_id: number;
  age?: number;
  profile_picture?: string;
  totalLessons?: number;
  completedLessons?: number;
  screenTime?: {
    allowedTimeMinutes: number;
    usedTimeMinutes: number;
  } | null;
}

export interface ChildFormData {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  age: number;
}
