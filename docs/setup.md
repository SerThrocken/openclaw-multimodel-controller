# OpenClaw Setup Guide

This guide walks you through setting up the OpenClaw Multi-Model Controller from scratch — on your PC, and on your Android phone.

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Requirements](#requirements)
3. [Step 1 — Install an AI backend](#step-1--install-an-ai-backend)
4. [Step 2 — Start the OpenClaw server on your PC](#step-2--start-the-openclaw-server-on-your-pc)
5. [Step 3 — Use the web UI (PC or phone browser)](#step-3--use-the-web-ui-pc-or-phone-browser)
6. [Step 4 — Install the Android APK (optional)](#step-4--install-the-android-apk-optional)
7. [Step 5 — Connect your phone to the server](#step-5--connect-your-phone-to-the-server)
8. [Remote access via Tailscale](#remote-access-via-tailscale)
9. [Cloud & paid AI services](#cloud--paid-ai-services)
10. [Saving conversations locally](#saving-conversations-locally)
11. [Secure the server with an auth token](#secure-the-server-with-an-auth-token)
12. [Privacy & data security](#privacy--data-security)
13. [Troubleshooting](#troubleshooting)

---

## How it works

```
Android App / Browser
      │
      │  HTTP (local Wi-Fi or Tailscale VPN)
      ▼
OpenClaw Server  ←── runs on your PC (port 8080)
      │
      ├─── LM Studio   (local, port 1234)
      ├─── Ollama      (local, port 11434)
      ├─── OpenAI      (cloud, via HTTPS)
      ├─── Gemini      (cloud, via HTTPS)
      ├─── Perplexity  (cloud, via HTTPS)
      └─── Custom      (any OpenAI-compatible URL)
```

OpenClaw is a lightweight server that sits between your devices and the AI backend.  
**All settings and API keys are stored locally on your PC — nothing is collected by OpenClaw.**

---

## Requirements

| Component | Minimum version |
|-----------|----------------|
| Python | 3.10 or later |
| AI backend | LM Studio, Ollama, or a cloud API key |
| Android phone | Android 8.0+ (for APK) |
| Wi-Fi | PC and phone on the same network (or Tailscale for remote) |

---

## Step 1 — Install an AI backend

### Option A — Local backend (runs on your PC, fully offline)

Install and start **at least one** of:

| Backend | Download | Default port |
|---------|----------|-------------|
| LM Studio | [lmstudio.ai](https://lmstudio.ai) | `1234` |
| Ollama | [ollama.com](https://ollama.com) | `11434` |

→ See detailed guides: [LM Studio](lmstudio-guide.md) · [Ollama](ollama-guide.md)

### Option B — Cloud AI service (requires an API key from the provider)

No local software needed.  Supported providers:

| Provider | Free tier | Notes |
|----------|-----------|-------|
| OpenAI | No | [Get API key →](https://platform.openai.com/api-keys) |
| Google Gemini | Yes (limited) | [Get API key →](https://aistudio.google.com/app/apikey) |
| Perplexity | No | [Get API key →](https://www.perplexity.ai/settings/api) |
| Custom endpoint | — | Any OpenAI-compatible URL |

→ Full setup instructions: [Cloud Services Guide](cloud-services-guide.md)

---

## Step 2 — Start the OpenClaw server on your PC

### Windows

1. Double-click **`start.bat`** in the root of this repository.  
   On first run it automatically creates a Python virtual environment and installs all dependencies.

2. A terminal window opens showing:
   ```
   [openclaw] ✓ Active backend : lmstudio
   [openclaw] Web UI available at http://0.0.0.0:8080/
   ```

### macOS / Linux

Open a terminal, navigate to the repository folder, and run:

```bash
chmod +x start.sh   # only needed once
./start.sh
```

### Manual start (any platform)

```bash
cd server
pip install -r requirements.txt
python main.py
```

### Optional flags

| Flag | Description |
|------|-------------|
| `--backend lmstudio` | Force LM Studio as the active backend |
| `--backend ollama` | Force Ollama as the active backend |
| `--backend openai` | Force OpenAI as the active backend |
| `--backend gemini` | Force Gemini as the active backend |
| `--backend perplexity` | Force Perplexity as the active backend |
| `--backend custom` | Force the custom endpoint as the active backend |
| `--port 9090` | Use a different port (default: `8080`) |
| `--host 127.0.0.1` | Bind to localhost only (no phone access) |
| `--tray` | Show a system tray icon for GUI control |
| `--token mysecret` | Enable Bearer-token authentication |

---

## Step 3 — Use the web UI (PC or phone browser)

The OpenClaw server includes a built-in web chat interface that works in **any browser** — on your PC, phone, or tablet.

**On your PC:**  
Open `http://localhost:8080` in your browser.

**On your phone (over Wi-Fi):**  
1. Find your PC's local IP address:
   - **Windows:** open Command Prompt → `ipconfig` → look for `IPv4 Address` (e.g. `192.168.1.42`)
   - **macOS:** open Terminal → `ipconfig getifaddr en0`
   - **Linux:** open Terminal → `ip a` or `hostname -I`
2. On your phone browser, open `http://192.168.1.42:8080` (replace with your actual IP).

The web UI has three tabs:

| Tab | Purpose |
|-----|---------|
| **💬 Chat** | Send messages to your AI |
| **📦 Models** | Browse and select the active model |
| **⚙️ Settings** | Switch backend, configure hosts/ports, enter API keys |

---

## Step 4 — Install the Android APK (optional)

The Android APK gives you a native app experience with a chat interface designed for mobile.

### Build the APK yourself (recommended)

Requires [Node.js 18+](https://nodejs.org) and [EAS CLI](https://docs.expo.dev/build/introduction/).

```bash
cd android
npm install
npm install -g eas-cli
eas login          # create a free Expo account if you don't have one
npm run build:apk  # builds a preview APK via EAS Build
```

EAS Build will print a download link when the build is complete.  
Download the `.apk` file and install it on your phone.

### Enable Unknown Sources on Android

Before installing the APK:

1. Open **Settings** → **Security** (or **Apps** on newer Android)
2. Enable **Install unknown apps** for your browser or file manager
3. Open the downloaded `.apk` and tap **Install**

### Run locally with Expo Go (for development)

```bash
cd android
npm install
npm run start     # then scan the QR code with Expo Go on your phone
```

---

## Step 5 — Connect your phone to the server

1. Open OpenClaw (APK) on your phone.
2. Tap **⚙️ Settings**.
3. Enter your PC's local IP address (e.g. `192.168.1.42`) and port (`8080`).
4. Tap **Test Connection** — you should see a green "Connected!" message.
5. Tap **💬 Chat** to start chatting.

> **Tip:** Your PC's local IP may change if you restart your router.  
> Assign a static IP to your PC in your router settings to avoid this.

---

## Remote access via Tailscale

Tailscale lets you connect to OpenClaw from **anywhere** — not just your home Wi-Fi — without port forwarding.  All traffic is encrypted with WireGuard.

**Quick steps:**

1. Install Tailscale on your PC and phone — [tailscale.com/download](https://tailscale.com/download).
2. Sign in to the **same Tailscale account** on both devices.
3. Find your PC's Tailscale IP: run `tailscale ip -4` → e.g. `100.64.0.12`.
4. Open `http://100.64.0.12:8080` on your phone.

→ Full instructions: [Tailscale Guide](tailscale-guide.md)

---

## Cloud & paid AI services

You can use OpenAI, Gemini, Perplexity, or any OpenAI-compatible API instead of (or alongside) a local backend.

1. Open the web UI → **⚙️ Settings**.
2. Click your provider (e.g. **OpenAI**).
3. Paste your API key — it is stored only on your PC, never sent to OpenClaw servers.
4. Click **💾 Save Settings**.

→ Full instructions including custom endpoints: [Cloud Services Guide](cloud-services-guide.md)

---

## Saving conversations locally

OpenClaw lets you **optionally save specific conversations** to your PC's local storage.  No chats are saved automatically — you choose exactly which conversations to keep.

### How to save a chat

1. Have a conversation in the **💬 Chat** tab.
2. Click **💾 Save** in the header.  The conversation is saved immediately to `server/conversations.json` on your PC.
3. A brief "✓ Saved" confirmation appears in the button.

### How to view and load saved chats

1. Click the **📂 History** tab.
2. All saved conversations are listed, most recent first, with the backend, model, message count, and time saved.
3. Click any conversation to load it into the chat.  If you have an unsaved conversation open, you will be asked to confirm before it is replaced.

### How to delete a saved chat

In the **📂 History** tab, click the 🗑 button on any conversation to permanently delete it.

### Privacy of saved chats

- Conversations are stored in `server/conversations.json` on your PC only.
- This file is **gitignored** — it is never committed to the repository.
- On Unix systems (Linux/macOS) the file is set to owner-read-only (`0600`) permissions so other users on the machine cannot read your saved chats.
- Saved chats are accessible from any device that can connect to your OpenClaw server (PC browser, phone browser, or Android app over LAN or Tailscale).
- If you have an auth token set, the `/conversations` endpoints are protected by it — other people on your network cannot read or delete your saved chats without the token.

---

## Secure the server with an auth token

By default the server is open to anyone on your local network.  
To restrict access to only your device:

**Start the server with a token:**

```bash
./start.sh --token mysupersecrettoken
# or on Windows:
start.bat --token mysupersecrettoken
```

**In the web UI:**  
Settings tab → **OpenClaw Access Token** field → enter your token → **Save Settings**.

**In the Android app:**  
Settings → Auth Token → enter `mysupersecrettoken` → Save.

> **Always set a token when using Tailscale or any remote access method.**

---

## Privacy & data security

- **No data collection** — OpenClaw never sends telemetry or usage data anywhere.
- **Local storage only** — settings and API keys are saved in `server/config.json` on your PC, owner-readable only (`0600` permissions on Unix).
- **API keys never leave your PC unencrypted** — they are forwarded directly to the AI provider over HTTPS, never returned by the settings API.
- **`config.json` is gitignored** — it will never be committed to the repository.

→ Full details: [Privacy & Security](privacy.md)

---

## Troubleshooting

### "Neither LM Studio nor Ollama is reachable"

- Make sure LM Studio or Ollama is **running** before starting OpenClaw.
- Check the backend is listening on the expected port (`1234` for LM Studio, `11434` for Ollama).
- See the backend-specific guides for details.

### Phone can't connect to server

- Make sure your PC and phone are on the **same Wi-Fi network**.
- Check that your PC firewall allows inbound connections on port `8080`.
  - **Windows:** search "Windows Defender Firewall" → "Allow an app" → add Python.
  - **macOS:** System Preferences → Security & Privacy → Firewall → allow incoming connections for Python.
- Verify the IP address is correct (`ipconfig` / `ip a`).
- For remote access, use [Tailscale](tailscale-guide.md) instead of exposing ports.

### "Connection refused" in the browser

- The server is not running — start it with `start.bat` or `./start.sh`.
- The server may be on a different port — check the terminal output.

### Streaming doesn't work in the browser

- Some corporate proxies strip SSE (Server-Sent Events).  
  If you are behind a proxy, try disabling it for local addresses.

### Models list is empty

- For LM Studio: load at least one model in the LM Studio app before connecting.
- For Ollama: run `ollama pull llama3` (or any model name) in a terminal.
- For cloud backends: the model list is fetched live; check your API key is set correctly.

### "401 Unauthorized"

- You have an auth token set on the server.  Enter the same token in Settings → **OpenClaw Access Token** on your client device.
