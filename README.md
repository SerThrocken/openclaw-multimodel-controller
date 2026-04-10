# 🐾 OpenClaw — Multi-Model AI Controller

Connect your phone or any browser to **LM Studio**, **Ollama**, **OpenAI**, **Gemini**, **Perplexity**, or any OpenAI-compatible endpoint — locally or remotely.  No data collected.  Your keys stay on your PC.

![OpenClaw chat screen](https://github.com/user-attachments/assets/0f917462-9286-4023-b7ea-f60772240952)

---

## How it works

```
Browser / Android App
        │
        │  HTTP  (local Wi-Fi  or  Tailscale encrypted tunnel)
        ▼
  OpenClaw Server        ← runs on your PC  (port 8080)
        │
        ├── LM Studio   (local,  port 1234)
        ├── Ollama       (local,  port 11434)
        ├── OpenAI       (cloud,  HTTPS)
        ├── Gemini       (cloud,  HTTPS)
        ├── Perplexity   (cloud,  HTTPS)
        └── Custom       (any OpenAI-compatible URL)
```

OpenClaw is a lightweight Python server that proxies requests between your devices and whichever AI backend you choose. It also serves a **built-in web UI** that works in any browser — on your PC, phone, or tablet — with no extra installation required.

---

## Features

- **Chat from any device** — built-in web UI at `http://<pc-ip>:8080` from any browser on your network
- **Android APK** — native mobile app built with React Native / Expo
- **6 backends** — LM Studio, Ollama, OpenAI, Gemini, Perplexity, or any custom OpenAI-compatible URL
- **Remote access via Tailscale** — connect from anywhere, fully encrypted, no port forwarding
- **Optional saved conversations** — explicitly save any chat to local storage on your PC; load or delete from the History tab on any device
- **Auto-detect** — switches to the available local backend automatically on startup
- **Model selection** — browse and switch models without restarting
- **Streaming** — real-time token streaming in both the web UI and Android app
- **Optional auth token** — Bearer-token security for LAN and remote access
- **System tray icon** — optional GUI-less control on Windows/macOS/Linux
- **No data collection** — no telemetry, no cloud sync, no account required
- **API keys stay on your PC** — keys are stored locally, never returned by the API, never logged

---

## Quick Start

### 1. Install an AI backend

**Local (runs on your PC):**

| Backend | Download | Default port |
|---------|----------|-------------|
| LM Studio | [lmstudio.ai](https://lmstudio.ai) | `1234` |
| Ollama | [ollama.com](https://ollama.com) | `11434` |

**Cloud (requires an API key):**

| Provider | Keys |
|----------|------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Google Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| Perplexity | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) |
| Custom endpoint | Any OpenAI-compatible URL |

### 2. Start the OpenClaw server

**Windows** — double-click `start.bat`

**macOS / Linux:**
```bash
./start.sh
```

The terminal will show:
```
[openclaw] ✓ Active backend : lmstudio
[openclaw] Web UI available at http://0.0.0.0:8080/
```

### 3. Open the web UI

- **On this PC:** open `http://localhost:8080` in your browser
- **On your phone (LAN):** open `http://<your-pc-ip>:8080`
- **Anywhere (Tailscale):** open `http://<tailscale-ip>:8080`

> Find your PC's IP: run `ipconfig` (Windows) or `ip a` (Linux/macOS).

### 4. Select a backend and model

Go to **⚙️ Settings**, choose your backend, enter an API key if using a cloud provider, click **Save**, then go to **📦 Models** to pick a model.

---

## Android APK

For a native mobile experience, build and install the Android app.

**Requirements:** [Node.js 18+](https://nodejs.org) · [EAS CLI](https://docs.expo.dev/build/introduction/)

```bash
cd android
npm install
npm install -g eas-cli
eas login
npm run build:apk      # builds a downloadable .apk via EAS Build
```

After installing the APK, open the app → **Settings** → enter your PC's IP address → **Test Connection**.

→ Full instructions in the [Setup Guide](docs/setup.md)

---

## Repository Structure

```
openclaw-multimodel-controller/
│
├── server/                  # Python / FastAPI PC server
│   ├── main.py              # Entry point — run this
│   ├── config.py            # Settings model, persisted to config.json
│   ├── requirements.txt     # Python dependencies
│   ├── backends/
│   │   ├── lmstudio.py      # LM Studio API client
│   │   ├── ollama.py        # Ollama API client
│   │   └── cloud.py         # OpenAI / Gemini / Perplexity / Custom client
│   ├── routes/
│   │   ├── chat.py          # POST /chat/completions
│   │   ├── models.py        # GET  /models
│   │   └── settings.py      # GET/POST /settings
│   └── ui/
│       ├── web.html         # Built-in web chat UI (served at /)
│       └── tray.py          # System tray icon (optional)
│
├── android/                 # React Native / Expo Android app
│   ├── App.tsx              # Navigation entry point
│   ├── src/
│   │   ├── api/client.ts    # HTTP client for the OpenClaw server
│   │   ├── store/settings.ts# AsyncStorage settings persistence
│   │   └── screens/
│   │       ├── ChatScreen.tsx
│   │       ├── ModelsScreen.tsx
│   │       └── SettingsScreen.tsx
│   ├── app.json             # Expo config
│   └── eas.json             # EAS Build config
│
├── docs/
│   ├── setup.md             # Complete setup guide
│   ├── tailscale-guide.md   # Remote access via Tailscale
│   ├── cloud-services-guide.md  # OpenAI / Gemini / Perplexity / Custom
│   ├── privacy.md           # Privacy & security reference
│   ├── lmstudio-guide.md    # LM Studio specific guide
│   ├── ollama-guide.md      # Ollama specific guide
│   └── screenshots/         # UI screenshots
│
├── start.sh                 # Linux / macOS quick-start script
└── start.bat                # Windows quick-start script
```

---

## Server API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/conversations` | Optional | List saved conversations (summaries, no messages) |
| `GET` | `/conversations/{id}` | Optional | Load a saved conversation with full messages |
| `POST` | `/conversations` | Optional | Save a conversation |
| `DELETE` | `/conversations/{id}` | Optional | Delete a saved conversation |
| `GET` | `/health` | No | Server status + backend availability |
| `GET` | `/models` | Optional | List models from the active backend |
| `POST` | `/chat/completions` | Optional | OpenAI-compatible chat endpoint |
| `GET` | `/settings` | Optional | Read current configuration (API keys never returned) |
| `POST` | `/settings` | Optional | Update configuration at runtime |
| `GET` | `/` | No | Built-in web UI |
| `GET` | `/docs` | No | Interactive API documentation |

### Example — chat request

```bash
curl http://localhost:8080/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Example — switch to OpenAI backend

```bash
curl -X POST http://localhost:8080/settings \
  -H "Content-Type: application/json" \
  -d '{"backend": "openai", "openai_api_key": "sk-..."}'
```

---

## Configuration

Settings are stored in `server/config.json` on your PC and can be changed via the web UI, Android app, or API.  This file is gitignored and set to owner-read-only — it is never committed or shared.

| Setting | Default | Description |
|---------|---------|-------------|
| `backend` | `lmstudio` | Active backend (`lmstudio`, `ollama`, `openai`, `gemini`, `perplexity`, `custom`) |
| `lmstudio_host` | `localhost` | LM Studio hostname |
| `lmstudio_port` | `1234` | LM Studio port |
| `ollama_host` | `localhost` | Ollama hostname |
| `ollama_port` | `11434` | Ollama port |
| `openai_api_key` | `null` | OpenAI API key (write-only via API) |
| `gemini_api_key` | `null` | Gemini API key (write-only via API) |
| `perplexity_api_key` | `null` | Perplexity API key (write-only via API) |
| `custom_base_url` | `null` | Base URL for custom OpenAI-compatible endpoint |
| `custom_api_key` | `null` | API key for custom endpoint (write-only via API) |
| `custom_name` | `Custom` | Display label for custom provider |
| `bind_host` | `0.0.0.0` | OpenClaw server bind address |
| `bind_port` | `8080` | OpenClaw server port |
| `auth_token` | `null` | Optional Bearer token for LAN/remote security |
| `active_model` | `null` | Currently selected model |

---

## Privacy

- **No data collection** — OpenClaw never contacts any external server on its own.
- **Local storage only** — settings and API keys are saved in `server/config.json` on your PC, with owner-only file permissions.
- **API keys are write-only** — `GET /settings` returns boolean key-set indicators, never actual key values.
- **No telemetry** — no usage data is collected or transmitted.
- **Open source** — every network call is auditable in the source code.

→ Full details: [Privacy & Security](docs/privacy.md)

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Setup Guide](docs/setup.md) | Complete installation and configuration walkthrough |
| [Tailscale Guide](docs/tailscale-guide.md) | Connect remotely from anywhere |
| [Cloud Services Guide](docs/cloud-services-guide.md) | OpenAI, Gemini, Perplexity, Custom endpoints |
| [Privacy & Security](docs/privacy.md) | What is stored, what is transmitted, security measures |
| [LM Studio Guide](docs/lmstudio-guide.md) | LM Studio specific setup |
| [Ollama Guide](docs/ollama-guide.md) | Ollama specific setup |
| Interactive API docs | `http://localhost:8080/docs` (once server is running) |

> **Saving chats:** in the web UI, click **💾 Save** on the Chat tab to keep a conversation.  View, load, and delete saved chats from the **📂 History** tab on any device.

---

## License

See [LICENSE](LICENSE).
