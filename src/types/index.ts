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
  starred?: boolean;
  imageUrl?: string; // base64 data URL of attached image (data:image/jpeg;base64,...)
}

export interface Conversation {
  id: string;
  title: string;
  providerId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface SystemPromptPreset {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system' | 'oled' | 'solarized' | 'forest' | 'ocean';
  defaultProviderId?: string;
  sendOnEnter: boolean;
  showTimestamps: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  streamResponses: boolean;
  density: 'compact' | 'cozy' | 'comfortable';
  isPro: boolean;
  accentColor?: string;
  visionUsageToday: number;   // how many tap-to-identify calls used today (free tier)
  visionUsageDate: string;    // ISO date string "YYYY-MM-DD" for daily reset
  ttsCharUsedToday: number;   // TTS chars spoken today (free tier)
  ttsUsageDate: string;       // ISO date string for daily reset
  googleClientId?: string;    // Google OAuth Client ID for Gemini sign-in
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
  icon: string;              // emoji
  getKeyUrl?: string;        // URL to get an API key for this service
  autoDetectUrl?: string;    // URL to auto-detect local provider
  oauthSupported?: boolean;  // whether Google OAuth connect is supported
}

export interface SendMessageOptions {
  provider: AIProvider;
  messages: Message[];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}
