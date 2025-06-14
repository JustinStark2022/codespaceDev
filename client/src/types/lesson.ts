export interface BibleLesson {
    id: string;
    title: string;
    content: string;
    completed: boolean;
    createdAt: string;
  }

  export interface UserLessonProgress {
    id: number;
    user_id: number;
    lesson_id: number;
    completed: boolean;
    completed_at?: string;
  }