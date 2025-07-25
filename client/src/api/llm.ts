import { apiRequest } from "@/lib/queryClient";

// Devotional API calls
export const getDailyDevotional = async () => {
  const res = await apiRequest("GET", "/api/devotional/daily");
  return res.json();
};

export const getVerseOfTheDay = async () => {
  const res = await apiRequest("GET", "/api/devotional/verse");
  return res.json();
};

// Content monitoring API calls
export const analyzeContent = async (data: {
  content: string;
  contentType?: string;
  childId?: number;
  source?: string;
}) => {
  const res = await apiRequest("POST", "/api/monitor/analyze", data);
  return res.json();
};

export const getWeeklySummary = async (data: {
  childId?: number;
  weekStart?: string;
  weekEnd?: string;
}) => {
  const res = await apiRequest("POST", "/api/monitor/weekly-summary", data);
  return res.json();
};

// Lessons API calls
export const generateCustomLesson = async (data: {
  age: number;
  topic: string;
  difficulty?: string;
}) => {
  const res = await apiRequest("POST", "/api/lessons/generate", data);
  return res.json();
};

// Blog API calls
export const generateParentBlog = async (data: {
  topic?: string;
  category?: string;
}) => {
  const res = await apiRequest("POST", "/api/blog/parent", data);
  return res.json();
};

export const generateKidsBlog = async (data: {
  topic?: string;
  age?: number;
  category?: string;
}) => {
  const res = await apiRequest("POST", "/api/blog/kids", data);
  return res.json();
};
