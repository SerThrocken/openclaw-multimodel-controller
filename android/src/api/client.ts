/**
 * HTTP client for communicating with the OpenClaw PC server.
 *
 * All requests go through the base URL stored in settings.
 * When an auth token is configured it is sent as a Bearer header.
 */

import { getSettings } from "../store/settings";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelInfo {
  id: string;
  object: string;
}

export interface HealthResponse {
  status: string;
  active_backend: "lmstudio" | "ollama";
  lmstudio_available: boolean;
  ollama_available: boolean;
  active_model: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function buildHeaders(): Promise<Record<string, string>> {
  const { authToken } = await getSettings();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

async function baseUrl(): Promise<string> {
  const { serverHost, serverPort } = await getSettings();
  return `http://${serverHost}:${serverPort}`;
}

async function get<T>(path: string): Promise<T> {
  const url = `${await baseUrl()}${path}`;
  const headers = await buildHeaders();
  const resp = await fetch(url, { method: "GET", headers });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GET ${path} failed (${resp.status}): ${text}`);
  }
  return resp.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = `${await baseUrl()}${path}`;
  const headers = await buildHeaders();
  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`POST ${path} failed (${resp.status}): ${text}`);
  }
  return resp.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Ping the server — fast connectivity check. */
export async function healthCheck(): Promise<HealthResponse> {
  return get<HealthResponse>("/health");
}

/** List models available on the active backend. */
export async function listModels(): Promise<ModelInfo[]> {
  const resp = await get<{ data: ModelInfo[] }>("/models");
  return resp.data;
}

/** Send a chat completion request (non-streaming). */
export async function chatCompletion(
  req: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  return post<ChatCompletionResponse>("/chat/completions", {
    ...req,
    stream: false,
  });
}

/**
 * Send a streaming chat completion request.
 * Calls `onChunk` with each text delta as it arrives.
 * Calls `onDone` when the stream ends.
 */
export async function chatCompletionStream(
  req: ChatCompletionRequest,
  onChunk: (delta: string) => void,
  onDone: () => void
): Promise<void> {
  const url = `${await baseUrl()}/chat/completions`;
  const headers = await buildHeaders();

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...req, stream: true }),
  });

  if (!resp.ok || !resp.body) {
    const text = await resp.text();
    throw new Error(`Streaming request failed (${resp.status}): ${text}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        onDone();
        return;
      }
      try {
        const chunk = JSON.parse(data);
        const delta: string =
          chunk?.choices?.[0]?.delta?.content ?? "";
        if (delta) onChunk(delta);
      } catch {
        // ignore malformed lines
      }
    }
  }
  onDone();
}

/** Update server settings (backend, hosts, ports, token, active model). */
export async function updateSettings(
  update: Partial<{
    backend: "lmstudio" | "ollama";
    lmstudio_host: string;
    lmstudio_port: number;
    ollama_host: string;
    ollama_port: number;
    auth_token: string;
    active_model: string;
  }>
): Promise<unknown> {
  return post("/settings", update);
}
