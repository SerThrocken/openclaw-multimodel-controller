export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'perplexity'
  | 'ollama'
  | 'openrouter'
  | 'custom';

export interface AIProvider {
  id: string;
  name: string;
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  color: string;
  icon?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  providerId?: string;
  providerName?: string;
  error?: boolean;
  loading?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  providerId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  defaultProviderId?: string;
  sendOnEnter: boolean;
  showTimestamps: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  streamResponses: boolean;
}

export interface ProviderTemplate {
  type: ProviderType;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  modelOptions: string[];
  requiresApiKey: boolean;
  docsUrl: string;
  description: string;
  color: string;
}

export interface SendMessageOptions {
  provider: AIProvider;
  messages: Message[];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}
