export interface Attachment {
  name: string;
  type: string;  // MIME type
  data: string;  // base64
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  isError?: boolean;
  attachment?: Attachment;
  type?: "text" | "image_url" | "image_base64" | "video_url" | "video_generation";
}

export interface ChatRequest {
  messages: Message[];
  provider?: string;
  model?: string;
  api_key?: string;
  attachment?: Attachment;
}

export interface ChatResponse {
  content: string;
}

export interface ProviderSettings {
  provider: string;
  model: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  provider: string;
  model: string;
}

export interface ConversationsStore {
  conversations: Conversation[];
  activeId: string | null;
}
