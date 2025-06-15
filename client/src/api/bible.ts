export interface BibleVerse {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleBook {
  id: number;
  name: string;
  testament: string;
}

export interface BibleLesson {
  id: number;
  title: string;
  verse_ref: string;
  content: string;
  age_range: string;
  scripture_references: string;
  created_at: string;
  completed?: boolean;
  completedAt?: string | null;
}

export const getBibleBooks = async (): Promise<BibleBook[]> => {
  const res = await fetch("/api/bible/books", {
    credentials: "include",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch Bible books");
  }

  return res.json();
};

export const getBibleVerses = async (book?: string, chapter?: number): Promise<BibleVerse[]> => {
  const params = new URLSearchParams();
  if (book) params.append("book", book);
  if (chapter) params.append("chapter", chapter.toString());

  const res = await fetch(`/api/bible/verses?${params.toString()}`, {
    credentials: "include",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch Bible verses");
  }

  return res.json();
};

export const getLessons = async (): Promise<BibleLesson[]> => {
  const res = await fetch("/api/bible/lessons", {
    credentials: "include",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch lessons");
  }

  return res.json();
};

export const getLessonById = async (id: number): Promise<BibleLesson> => {
  const res = await fetch(`/api/bible/lessons/${id}`, {
    credentials: "include",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch lesson");
  }

  return res.json();
};

export const markLessonComplete = async (id: number): Promise<void> => {
  const res = await fetch(`/api/bible/lessons/${id}/complete`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to mark lesson complete");
  }
};
