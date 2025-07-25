export interface ChatLog {
    id: number;
    childId: number;
    childName: string;
    platform: string;
    content: string;
    flagged: boolean;
    flagReason?: string;
    timestamp: string;
    participants: string[];
  }

  export interface ChatMessage {
    sender: "user" | "bot";
    text: string;
    id?: string;
    timestamp?: Date;
    type?: "suggestion" | "question" | "guidance";
  }