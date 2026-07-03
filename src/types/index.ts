export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  thinking?: string;    // thinking chain (deepseek-r1, qwq, etc.)
  timestamp: string;
  interrupted?: boolean;
  toolCall?: { name: string; arguments: any }; // Assistant's intended tool call
  toolResult?: string; // Result payload from a tool execution
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export type ProviderType = 'ollama' | 'lmstudio';

export interface AIModel {
  id: string; // Internal API id (name for ollama, id for lmstudio)
  name: string; // Display name
  size?: number; // Size in bytes if available
  provider: ProviderType;
  details?: {
    parameter_size?: string;
    family?: string;
  };
  capabilities?: {
    vision?: boolean;
    thinking?: boolean;
  };
}

export interface DevStats {
  tokensPerSecond: number;
  totalTokens: number;
  promptTokens: number;
  generationMs: number;
}
