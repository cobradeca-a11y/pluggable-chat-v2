export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  isError?: boolean;
}

export interface ChatRequest {
  messages: Message[];
  provider?: string;
  model?: string;
  api_key?: string;
}

export interface ChatResponse {
  content: string;
}

export interface ProviderSettings {
  provider: "mock" | "openrouter" | "ollama" | "";
  model: string;
  apiKey: string;
}
