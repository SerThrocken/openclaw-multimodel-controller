# 🐾 OpenClaw — Multi-Model Local AI Controller

Connect your Android phone (or any browser) to **LM Studio** or **Ollama** running on your PC for fully private, local AI inference.  No cloud, no subscriptions, no data leaving your network.

---

## How it works

```
Browser / Android App
        │
        │  HTTP  (local Wi-Fi)
        ▼
  OpenClaw Server        ← runs on your PC  (port 8080)
        │
        ├── LM Studio  (port 1234)
        └── Ollama     (port 11434)
```

OpenClaw is a lightweight Python server that proxies requests between your devices and whichever AI backend you have installed. It also serves a **built-in web UI** that works in any browser — on your PC, phone, or tablet — with no extra installation required.

---

## Features

- **Chat from any device** — built-in web UI accessible at `http://<pc-ip>:8080` from any browser on your local network
- **Android APK** — native mobile app built with React Native / Expo
- **LM Studio support** — uses LM Studio's OpenAI-compatible API
- **Ollama support** — works with all Ollama models
- **Auto-detect** — switches to the available backend automatically on startup
- **Model selection** — browse and switch models without restarting
- **Streaming** — real-time token streaming in both the web UI and Android app
- **Optional auth token** — simple Bearer-token security for LAN access
- **System tray icon** — optional GUI-less control on Windows/macOS/Linux
- **100% local** — all traffic stays on your network

---

## Quick Start

### 1. Install a local AI backend

Install and start **at least one** of:

| Backend | Download | Default port |
|---------|----------|-------------|
| LM Studio | [lmstudio.ai](https://lmstudio.ai) | `1234` |
| Ollama | [ollama.com](https://ollama.com) | `11434` |

→ See detailed guides: [LM Studio](docs/lmstudio-guide.md) · [Ollama](docs/ollama-guide.md)

### 2. Start the OpenClaw server

**Windows** — double-click `start.bat`

**macOS / Linux:**
```bash
./start.sh
```

On first run this creates a Python virtual environment and installs all dependencies automatically.

The terminal will show:
```
[openclaw] ✓ Active backend : lmstudio
[openclaw] Web UI available at http://0.0.0.0:8080/
```

### 3. Open the web UI

- **On this PC:** open `http://localhost:8080` in your browser
- **On your phone:** open `http://<your-pc-ip>:8080` in your mobile browser

> Find your PC's IP: run `ipconfig` (Windows) or `ip a` (Linux/macOS) and look for your Wi-Fi adapter's IPv4 address (e.g. `192.168.1.42`).

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
│   │   └── ollama.py        # Ollama API client
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
│   ├── lmstudio-guide.md    # LM Studio specific guide
│   └── ollama-guide.md      # Ollama specific guide
│
├── start.sh                 # Linux / macOS quick-start script
└── start.bat                # Windows quick-start script
```

---

## Server API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Server status + backend availability |
| `GET` | `/models` | Optional | List models from the active backend |
| `POST` | `/chat/completions` | Optional | OpenAI-compatible chat endpoint |
| `GET` | `/settings` | Optional | Read current configuration |
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

### Example — switch backend

```bash
curl -X POST http://localhost:8080/settings \
  -H "Content-Type: application/json" \
  -d '{"backend": "ollama"}'
```

---

## Configuration

Settings are stored in `server/config.json` and can be changed via the web UI, Android app, or API.

| Setting | Default | Description |
|---------|---------|-------------|
| `backend` | `lmstudio` | Active backend (`lmstudio` or `ollama`) |
| `lmstudio_host` | `localhost` | LM Studio hostname |
| `lmstudio_port` | `1234` | LM Studio port |
| `ollama_host` | `localhost` | Ollama hostname |
| `ollama_port` | `11434` | Ollama port |
| `bind_host` | `0.0.0.0` | OpenClaw server bind address |
| `bind_port` | `8080` | OpenClaw server port |
| `auth_token` | `null` | Optional Bearer token for LAN security |
| `active_model` | `null` | Currently selected model |

---

## Privacy

- **No cloud connectivity** — OpenClaw never contacts any external server.
- **Local network only** — traffic between your phone and PC stays on your Wi-Fi.
- **No telemetry** — no usage data is collected.
- **Optional auth** — add `--token <secret>` to restrict access to your devices only.

---

## Documentation

- [Complete Setup Guide](docs/setup.md)
- [LM Studio Guide](docs/lmstudio-guide.md)
- [Ollama Guide](docs/ollama-guide.md)
- Interactive API docs: `http://localhost:8080/docs` (once the server is running)

---

## License

See [LICENSE](LICENSE).
