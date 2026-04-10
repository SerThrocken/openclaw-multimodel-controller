# Openclaw MultiModel Controller

A cross-platform AI chat controller that lets you connect to and converse with multiple AI providers from a single application. Available as a **Desktop app** (Windows / macOS / Linux via Electron) and an **Android APK** (via Capacitor).

---

## Features

- **Multiple AI providers** – OpenAI, Claude (Anthropic), Google Gemini, Perplexity, Ollama (local), OpenRouter, and any OpenAI-compatible endpoint.
- **Conversation history** – Persisted across sessions with per-provider colour-coded threads.
- **Provider management** – Add, edit, enable/disable, and test connections from the Connections tab.
- **Configurable per connection** – System prompt, temperature, max tokens, and accent colour per provider.
- **Settings** – Theme, font size, send-on-Enter toggle, and timestamp display.
- **CORS bypass in Electron** – AI requests are proxied through the main process so no browser CORS issues.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18 or later |
| npm | 9 or later |
| Android Studio *(Android build only)* | Latest stable |
| Java JDK *(Android build only)* | 17 or later |

---

## Getting Started (Development)

```bash
# Install dependencies
npm install

# Start the web dev server (browser preview at http://localhost:5173)
npm run dev

# Start the Electron desktop app in dev mode (hot-reload)
npm run electron:dev
```

---

## Building

### Desktop (Electron)

```bash
# Build the web bundle, then package the desktop app
npm run electron:build
```

Packaged installers are written to the `dist/` folder:

| Platform | Output |
|---|---|
| Windows | `dist/*.exe` (NSIS installer) |
| macOS | `dist/*.dmg` |
| Linux | `dist/*.AppImage` |

### Android (Capacitor)

```bash
# 1. Build the web bundle
npm run build

# 2. Sync the bundle into the Android project
npm run cap:sync

# 3. Open in Android Studio to build / run on device
npm run cap:open:android
```

> **First-time setup only:** if the `android/` folder does not yet exist, run `npm run cap:add:android` once before the steps above.

---

## Supported AI Providers

| Provider | Requires API Key | Default Model | Get API Key |
|---|---|---|---|
| **OpenAI** | Yes | `gpt-4o` | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Claude (Anthropic)** | Yes | `claude-opus-4-5` | [console.anthropic.com](https://console.anthropic.com/) |
| **Google Gemini** | Yes | `gemini-2.0-flash` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Perplexity** | Yes | `llama-3.1-sonar-large-128k-online` | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) |
| **Ollama (Local)** | No | `llama3.2` | N/A – install [Ollama](https://ollama.com) locally |
| **OpenRouter** | Yes | `openai/gpt-4o` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Custom / OpenAI-compatible** | Optional | `default` | Depends on your endpoint |

---

## Using the Application

### 1 – Add an AI Connection

1. Open the **Connections** tab (plug icon in the bottom navigation).
2. Click **Add Connection**.
3. Select a provider type from the grid.
4. Fill in the required fields:
   - **Name** – A friendly label for this connection.
   - **API Key** – Your provider API key (not required for Ollama or custom endpoints without auth).
   - **Base URL** – Pre-filled with the provider's default; change only if you use a proxy or self-hosted instance.
   - **Model** – Choose from the dropdown or type a custom model name.
5. Expand **Advanced Settings** to optionally set:
   - **System Prompt** – Custom instructions prepended to every conversation.
   - **Temperature** – Controls response creativity (0 = deterministic, 2 = very creative). Default: `0.7`.
   - **Max Tokens** – Maximum length of the model's reply. Default: `2048`.
   - **Color** – Accent colour used to identify this connection throughout the UI.
6. Click **Add Connection** to save.

To verify a connection is working, expand its card and click **Test Connection**.

### 2 – Chat

1. Open the **Chat** tab (message icon in the bottom navigation).
2. If you have more than one enabled provider, use the provider selector in the chat header to choose which model to talk to.
3. Type your message in the input box and press **Enter** (or **Shift+Enter** for a new line when *Send on Enter* is enabled).
4. Click the **Stop** button (red × icon) to cancel a response mid-generation.
5. Use the sidebar on the left to switch between past conversations or click **New Chat** to start a fresh thread.
6. Hover over a conversation in the sidebar and click the × icon to delete it.

### 3 – Manage Connections

From the **Connections** tab you can:

- **Enable / Disable** a connection with the toggle button – disabled connections are hidden from the chat provider selector.
- **Edit** a connection to update its API key, model, or advanced settings.
- **Delete** a connection (also removes all associated conversations).
- **Test** a connection to send a quick ping and verify it responds correctly.

### 4 – Settings

Open the **Settings** tab to customise the application:

| Setting | Options | Default |
|---|---|---|
| Theme | Dark / Light / System | Dark |
| Font Size | Small / Medium / Large | Medium |
| Send on Enter | On / Off | On |
| Show Timestamps | On / Off | Off |

> The **Statistics** section at the bottom shows a live count of your connections, active connections, conversations, and total messages.

---

## Project Structure

```
openclaw-multimodel-controller/
├── electron/               # Electron main & preload scripts
│   ├── main.cjs            # Main process (window creation, IPC, CORS proxy)
│   └── preload.cjs         # Exposes safe IPC bridge to the renderer
├── public/                 # Static assets (icon, etc.)
├── src/
│   ├── components/
│   │   ├── chat/           # Chat page and message bubble components
│   │   ├── connections/    # Connections page and provider form
│   │   ├── layout/         # App shell / navigation layout
│   │   └── settings/       # Settings page
│   ├── providers/
│   │   ├── api.ts          # Sends messages to each provider's API
│   │   └── templates.ts    # Provider metadata (URLs, models, colours)
│   ├── store/              # Zustand global state (providers, conversations, settings)
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Route definitions
│   └── main.tsx            # React entry point
├── capacitor.config.ts     # Capacitor (Android) configuration
├── vite.config.ts          # Vite build configuration
└── package.json
```

---

## Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (browser) |
| `npm run build` | Build the production web bundle |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build in a browser |
| `npm run electron:dev` | Run the Electron app in development mode |
| `npm run electron:build` | Build and package the Electron desktop app |
| `npm run cap:sync` | Sync the web build into the Capacitor Android project |
| `npm run cap:open:android` | Open the Android project in Android Studio |

---

## Data Storage

All provider credentials, conversation history, and settings are stored locally using **localStorage** (browser/Android) or Electron's equivalent persistent storage. No data is sent to any server other than the AI provider APIs you configure.

---

## License

This project is private. See [LICENSE](LICENSE) if present.
