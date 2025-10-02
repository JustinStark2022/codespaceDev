export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: "parent" | "child";
  parentId?: number;
  firstName: string;
  lastName: string;
  createdAt: string;
  isParent: boolean;
}

export interface Child {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  createdAt: string;
  role: "child";
  parentId: number;
  age?: number;
  profilePicture?: string;
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
  firstName: string;
  lastName: string;
  displayName: string;
  age: number;
  profilePicture?: File | null;
}
