# Ollama Setup Guide

This guide explains how to install and configure Ollama so it works with OpenClaw.

---

## What is Ollama?

[Ollama](https://ollama.com) is a command-line tool that makes it easy to download and run large language models (LLMs) locally. It is lightweight, headless (no GUI), and works on Windows, macOS, and Linux. OpenClaw communicates with Ollama's REST API to list models and stream chat responses.

---

## Step 1 — Install Ollama

### Windows

1. Go to [https://ollama.com/download](https://ollama.com/download).
2. Download and run the Windows installer.
3. Ollama starts automatically in the system tray after installation.

### macOS

```bash
brew install ollama
```

Or download the macOS app from [https://ollama.com/download](https://ollama.com/download).

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

---

## Step 2 — Pull (download) a model

Open a terminal and run:

```bash
ollama pull llama3
```

Replace `llama3` with any model name from [https://ollama.com/library](https://ollama.com/library).

**Recommended models by use case:**

| Model | Size | Use case |
|-------|------|----------|
| `llama3` | ~4.7 GB | General purpose, good quality |
| `mistral` | ~4.1 GB | Fast, low memory usage |
| `phi3` | ~2.3 GB | Very small, runs on modest hardware |
| `llama3:70b` | ~40 GB | High quality, needs powerful hardware |
| `codellama` | ~3.8 GB | Code generation and explanation |

> **Tip:** You can have multiple models pulled and switch between them in OpenClaw's Models tab without restarting anything.

---

## Step 3 — Start the Ollama server

### Windows

Ollama starts automatically. If it isn't running, open the Start menu and launch **Ollama**.

### macOS

```bash
ollama serve
```

Or it starts automatically if you installed the macOS app.

### Linux

```bash
ollama serve
```

Or enable it as a system service:

```bash
sudo systemctl enable --now ollama
```

**Verify it is running:**

```bash
curl http://localhost:11434/api/tags
```

You should see a JSON list of your downloaded models.

---

## Step 4 — Start OpenClaw with the Ollama backend

```bash
./start.sh --backend ollama
# or on Windows:
start.bat --backend ollama
```

You should see:

```
[openclaw] ✓ Active backend : ollama
[openclaw]   Ollama         : ✓
```

Or let OpenClaw auto-detect: if LM Studio is not running but Ollama is, OpenClaw switches to Ollama automatically on startup.

---

## Step 5 — Select a model in OpenClaw

1. Open the web UI at `http://localhost:8080` (or use the Android app).
2. Click the **📦 Models** tab.
3. Click on a model name to select it.
4. Go to **💬 Chat** and start chatting.

---

## Configuration in OpenClaw

If Ollama is running on a different host or port, update OpenClaw's settings:

**Via the web UI (Settings tab):**

| Setting | Value |
|---------|-------|
| Ollama Host | `localhost` (or the IP of the machine running Ollama) |
| Ollama Port | `11434` (default) |

**Via the command line:**

```bash
python main.py --backend ollama
```

**Via the settings API:**

```bash
curl -X POST http://localhost:8080/settings \
  -H "Content-Type: application/json" \
  -d '{"backend": "ollama", "ollama_host": "localhost", "ollama_port": 11434}'
```

---

## Running Ollama on a Different PC

You can run Ollama on one machine (e.g. a powerful desktop) and OpenClaw on another.

1. On the **Ollama machine**, allow remote connections by setting the environment variable before starting:

   **Linux / macOS:**
   ```bash
   OLLAMA_HOST=0.0.0.0 ollama serve
   ```

   **Windows** (Command Prompt):
   ```cmd
   set OLLAMA_HOST=0.0.0.0
   ollama serve
   ```

2. In OpenClaw settings, set **Ollama Host** to the IP address of the Ollama machine.

---

## Useful Ollama Commands

```bash
ollama list                  # list downloaded models
ollama pull mistral          # download a model
ollama rm llama3             # remove a model
ollama run llama3            # test a model in the terminal
ollama ps                    # show currently running models
```

---

## Troubleshooting

### "Cannot reach ollama backend"

- Make sure Ollama is running: `curl http://localhost:11434/api/tags`
- On Linux, check the service status: `sudo systemctl status ollama`
- Make sure no firewall is blocking port `11434`.

### "404 model not found" during chat

- You have not pulled the selected model yet. Run `ollama pull <modelname>`.
- Check the model name — it is case-sensitive. `llama3` ≠ `Llama3`.

### Slow responses

- Ollama uses your CPU by default. If you have an NVIDIA GPU, install the [CUDA toolkit](https://developer.nvidia.com/cuda-downloads) and restart Ollama — it will use the GPU automatically.
- For AMD GPUs on Linux, Ollama supports ROCm — see [https://ollama.com/blog/amd-preview](https://ollama.com).
- Try a smaller model (e.g. `phi3` or `mistral`).

### Models list is empty in OpenClaw

- You haven't pulled any models yet. Run `ollama pull llama3`.
- Refresh the Models tab in OpenClaw after pulling.
