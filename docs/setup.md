# OpenClaw Setup Guide

This guide walks you through setting up the OpenClaw Multi-Model Controller from scratch — on your PC, and on your Android phone.

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Requirements](#requirements)
3. [Step 1 — Install a local AI backend](#step-1--install-a-local-ai-backend)
4. [Step 2 — Start the OpenClaw server on your PC](#step-2--start-the-openclaw-server-on-your-pc)
5. [Step 3 — Use the web UI (PC or phone browser)](#step-3--use-the-web-ui-pc-or-phone-browser)
6. [Step 4 — Install the Android APK (optional)](#step-4--install-the-android-apk-optional)
7. [Step 5 — Connect your phone to the server](#step-5--connect-your-phone-to-the-server)
8. [Optional — Secure the server with an auth token](#optional--secure-the-server-with-an-auth-token)
9. [Troubleshooting](#troubleshooting)

---

## How it works

```
Android App / Browser
      │
      │  HTTP (local Wi-Fi)
      ▼
OpenClaw Server  ←── runs on your PC (port 8080)
      │
      ├─── LM Studio  (port 1234)
      └─── Ollama     (port 11434)
```

OpenClaw is a lightweight server that sits between your devices and the AI backend.  
**All data stays on your local network — nothing is sent to the internet.**

---

## Requirements

| Component | Minimum version |
|-----------|----------------|
| Python | 3.10 or later |
| LM Studio **or** Ollama | Latest stable |
| Android phone | Android 8.0+ (for APK) |
| Wi-Fi | PC and phone on the **same network** |

---

## Step 1 — Install a local AI backend

You need either **LM Studio** or **Ollama** installed and running on your PC.  
You can install both and switch between them at any time.

- [LM Studio setup guide →](lmstudio-guide.md)
- [Ollama setup guide →](ollama-guide.md)

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
| **💬 Chat** | Send messages to your local AI |
| **📦 Models** | Browse and select the active model |
| **⚙️ Settings** | Switch backend, configure hosts/ports |

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

## Optional — Secure the server with an auth token

By default the server is open to anyone on your local network.  
To restrict access to only your device:

**Start the server with a token:**

```bash
./start.sh --token mysupersecrettoken
# or on Windows:
start.bat --token mysupersecrettoken
```

**In the Android app:**  
Settings → Auth Token → enter `mysupersecrettoken` → Save.

**In the web UI:**  
Settings tab → Auth Token field → enter your token → Save Settings.

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

### "Connection refused" in the browser

- The server is not running — start it with `start.bat` or `./start.sh`.
- The server may be on a different port — check the terminal output.

### Streaming doesn't work in the browser

- Some corporate proxies strip SSE (Server-Sent Events).  
  If you are behind a proxy, try disabling it for local addresses.

### Models list is empty

- For LM Studio: load at least one model in the LM Studio app before connecting.
- For Ollama: run `ollama pull llama3` (or any model name) in a terminal.
