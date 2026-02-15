export interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  text: string;
}

export type ChatMessage = { 
  role: "system" | "user" | "assistant"; 
  content: string;
};

export type RunpodPayload = {
  prompt?: string;
  inputs?: string;
  instruction?: string;
  text?: string;
  max_tokens?: number;
  max_new_tokens?: number;
  n?: number;
  best_of?: number;
  stream?: boolean;
  stop?: string[];
  use_beam_search?: boolean;
  temperature?: number;
  top_p?: number;
  messages?: Array<ChatMessage>;
  [key: string]: any;
};

export interface PromptExample {
  user: string;
  assistant: string;
}
