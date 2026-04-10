/**
 * Persistent settings store backed by AsyncStorage.
 *
 * Stored keys:
 *   openclaw_server_host   — IP or hostname of the PC server
 *   openclaw_server_port   — port number
 *   openclaw_auth_token    — optional Bearer token
 *   openclaw_active_model  — last selected model ID
 *   openclaw_backend       — "lmstudio" | "ollama"
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  serverHost: "openclaw_server_host",
  serverPort: "openclaw_server_port",
  authToken: "openclaw_auth_token",
  activeModel: "openclaw_active_model",
  backend: "openclaw_backend",
} as const;

export type BackendType = "lmstudio" | "ollama";

export interface AppSettings {
  serverHost: string;
  serverPort: number;
  authToken: string;
  activeModel: string;
  backend: BackendType;
}

const DEFAULTS: AppSettings = {
  serverHost: "192.168.1.100",
  serverPort: 8080,
  authToken: "",
  activeModel: "",
  backend: "lmstudio",
};

export async function getSettings(): Promise<AppSettings> {
  const [host, port, token, model, backend] = await AsyncStorage.multiGet([
    KEYS.serverHost,
    KEYS.serverPort,
    KEYS.authToken,
    KEYS.activeModel,
    KEYS.backend,
  ]);

  return {
    serverHost: host[1] ?? DEFAULTS.serverHost,
    serverPort: port[1] ? parseInt(port[1], 10) : DEFAULTS.serverPort,
    authToken: token[1] ?? DEFAULTS.authToken,
    activeModel: model[1] ?? DEFAULTS.activeModel,
    backend: (backend[1] as BackendType) ?? DEFAULTS.backend,
  };
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const pairs: [string, string][] = [];
  if (settings.serverHost !== undefined)
    pairs.push([KEYS.serverHost, settings.serverHost]);
  if (settings.serverPort !== undefined)
    pairs.push([KEYS.serverPort, String(settings.serverPort)]);
  if (settings.authToken !== undefined)
    pairs.push([KEYS.authToken, settings.authToken]);
  if (settings.activeModel !== undefined)
    pairs.push([KEYS.activeModel, settings.activeModel]);
  if (settings.backend !== undefined)
    pairs.push([KEYS.backend, settings.backend]);

  await AsyncStorage.multiSet(pairs);
}
