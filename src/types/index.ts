export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  thinking?: string;    // thinking chain (deepseek-r1, qwq, etc.)
  timestamp: string;
  interrupted?: boolean;
  toolCall?: { name: string; arguments: any }; // Assistant's intended tool call
  toolResult?: string; // Result payload from a tool execution
  hiddenContext?: string; // Hidden system injection specific to this message
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

export interface ResearchPlan {
  summary: string;
  steps: string[];
}

export interface ResearchStep {
  id: string;
  type: 'search' | 'read' | 'think';
  query?: string;
  url?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  resultSnippet?: string;
}

export interface ResearchSession {
  id: string;
  title: string;
  prompt: string;
  plan?: ResearchPlan;
  steps: ResearchStep[];
  status: 'idle' | 'planning' | 'researching' | 'synthesizing' | 'done';
  report?: string; // The final markdown report
  updatedAt: number;
}
