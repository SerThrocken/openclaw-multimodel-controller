import type { AIProvider, Message, SendMessageOptions } from '../types';

export interface ChatCompletionPayload {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function buildOpenAIPayload(provider: AIProvider, messages: Message[]): ChatCompletionPayload {
  const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
  const msgs = messages.map((m) => ({ role: m.role, content: m.content }));

  if (provider.systemPrompt) {
    msgs.unshift({ role: 'system', content: provider.systemPrompt });
  }

  return {
    url: `${baseUrl}/chat/completions`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
      ...(provider.type === 'openrouter'
        ? { 'HTTP-Referer': 'https://github.com/tlcrockett5099-cmyk/openclaw-multimodel-controller', 'X-Title': 'Openclaw MultiModel' }
        : {}),
    },
    body: {
      model: provider.model,
      messages: msgs,
      temperature: provider.temperature ?? 0.7,
      max_tokens: provider.maxTokens ?? 2048,
      stream: false,
    },
  };
}

function buildAnthropicPayload(provider: AIProvider, messages: Message[]): ChatCompletionPayload {
  const baseUrl = provider.baseUrl || 'https://api.anthropic.com';
  const userMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  return {
    url: `${baseUrl}/v1/messages`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: {
      model: provider.model,
      max_tokens: provider.maxTokens ?? 2048,
      system: provider.systemPrompt || 'You are a helpful AI assistant.',
      messages: userMessages,
    },
  };
}

function buildGeminiPayload(provider: AIProvider, messages: Message[]): ChatCompletionPayload {
  const baseUrl = provider.baseUrl || 'https://generativelanguage.googleapis.com';
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  return {
    url: `${baseUrl}/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey || ''}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      contents,
      generationConfig: {
        temperature: provider.temperature ?? 0.7,
        maxOutputTokens: provider.maxTokens ?? 2048,
      },
      ...(provider.systemPrompt
        ? { systemInstruction: { parts: [{ text: provider.systemPrompt }] } }
        : {}),
    },
  };
}

function parseResponse(provider: AIProvider, data: string): string {
  try {
    const json = JSON.parse(data);

    if (provider.type === 'anthropic') {
      return json.content?.[0]?.text || 'No response content.';
    }

    if (provider.type === 'gemini') {
      return json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response content.';
    }

    // OpenAI-compatible (openai, perplexity, ollama, openrouter, custom)
    return json.choices?.[0]?.message?.content || 'No response content.';
  } catch {
    return data || 'Failed to parse response.';
  }
}

export async function sendMessage(options: SendMessageOptions): Promise<string> {
  const { provider, messages } = options;

  let payload: ChatCompletionPayload;

  switch (provider.type) {
    case 'anthropic':
      payload = buildAnthropicPayload(provider, messages);
      break;
    case 'gemini':
      payload = buildGeminiPayload(provider, messages);
      break;
    case 'openai':
    case 'perplexity':
    case 'ollama':
    case 'openrouter':
    case 'custom':
    default:
      payload = buildOpenAIPayload(provider, messages);
      break;
  }

  // In Electron, use IPC to bypass CORS
  const electronAPI = (window as Window & typeof globalThis & { electronAPI?: { aiRequest: (opts: ChatCompletionPayload) => Promise<{ status: number; data: string }> } }).electronAPI;
  if (electronAPI?.aiRequest) {
    const result = await electronAPI.aiRequest(payload);
    if (result.status >= 400) {
      throw new Error(`API error ${result.status}: ${result.data}`);
    }
    return parseResponse(provider, result.data);
  }

  // In browser/Capacitor, use native fetch
  const response = await fetch(payload.url, {
    method: payload.method,
    headers: payload.headers as HeadersInit,
    body: JSON.stringify(payload.body),
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const text = await response.text();
  return parseResponse(provider, text);
}

export async function testConnection(provider: AIProvider): Promise<{ success: boolean; message: string }> {
  try {
    const testMessages: Message[] = [
      { id: 'test', role: 'user', content: 'Hello! Please respond with "OK" to confirm the connection works.', timestamp: new Date().toISOString() },
    ];
    const result = await sendMessage({ provider, messages: testMessages });
    return { success: true, message: result.slice(0, 100) };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}
