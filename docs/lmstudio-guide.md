# LM Studio Setup Guide

This guide explains how to install and configure LM Studio so it works with OpenClaw.

---

## What is LM Studio?

[LM Studio](https://lmstudio.ai) is a desktop application that lets you download and run large language models (LLMs) locally on your PC — completely offline and private. It exposes an **OpenAI-compatible REST API** that OpenClaw uses.

---

## Step 1 — Download and install LM Studio

1. Go to [https://lmstudio.ai](https://lmstudio.ai).
2. Download the installer for your operating system (Windows, macOS, or Linux).
3. Run the installer and follow the prompts.

**System requirements:**

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8 GB | 16 GB or more |
| GPU (optional) | — | NVIDIA GPU with 6 GB+ VRAM for fast inference |
| Storage | 10 GB free | 20+ GB (models are large) |

---

## Step 2 — Download a model

1. Open LM Studio.
2. Click **Search** (magnifying glass icon) in the left sidebar.
3. Search for a model, for example:
   - `llama-3` — Meta's Llama 3 (good general purpose)
   - `mistral` — Mistral 7B (fast, low memory)
   - `phi-3` — Microsoft Phi-3 (very efficient)
4. Click the model, then click **Download**.  
   Model files are typically 4–8 GB in size.

> **Tip:** Choose a **GGUF** quantized model (e.g. `Q4_K_M`) for a good balance of speed and quality on most hardware.

---

## Step 3 — Load the model

1. Click **Local Server** (the `↔` icon) in the left sidebar.
2. Click **Select a model to load** at the top.
3. Choose the model you downloaded.
4. Click **Load Model**. Wait until it says "Model loaded".

---

## Step 4 — Start the local server

Still on the **Local Server** screen:

1. Make sure the server settings show:
   - **Port:** `1234`
   - **Applies to all origins (*):** checked (important — this lets OpenClaw connect)
2. Click **Start Server**.  
   You should see: `LM Studio Server running at http://localhost:1234`

---

## Step 5 — Verify the API is working

Open a browser or terminal and visit:

```
http://localhost:1234/v1/models
```

You should see a JSON response listing the loaded model.

---

## Step 6 — Start OpenClaw

Run the OpenClaw server and it will auto-detect LM Studio:

```bash
./start.sh
# or on Windows:
start.bat
```

You should see:

```
[openclaw] ✓ Active backend : lmstudio
[openclaw]   LM Studio      : ✓
```

---

## Configuration in OpenClaw

If LM Studio is running on a different host or port, update OpenClaw's settings:

**Via the web UI (Settings tab):**

| Setting | Value |
|---------|-------|
| LM Studio Host | `localhost` (or the IP of the machine running LM Studio) |
| LM Studio Port | `1234` (default) |

**Via the command line:**

```bash
python main.py --backend lmstudio
```

**Via the settings API:**

```bash
curl -X POST http://localhost:8080/settings \
  -H "Content-Type: application/json" \
  -d '{"backend": "lmstudio", "lmstudio_host": "localhost", "lmstudio_port": 1234}'
```

---

## Running LM Studio on a Different PC

OpenClaw does not need to run on the same machine as LM Studio.  
If LM Studio is on a different PC (e.g. a desktop you want to use from a laptop):

1. In LM Studio → Local Server → enable **Allow remote connections** (or bind to `0.0.0.0`).
2. In OpenClaw settings, set **LM Studio Host** to the IP of the LM Studio machine.

---

## Troubleshooting

### "Cannot reach lmstudio backend"

- Make sure LM Studio's local server is **started** (green button on the Local Server tab).
- Make sure a model is **loaded** — the server returns no models otherwise.
- Check the port in LM Studio matches the port in OpenClaw (`1234` by default).

### Slow responses

- A GPU significantly speeds up inference. In LM Studio, check the **GPU Offload** slider under model settings — set it to the maximum your VRAM allows.
- Try a smaller/more quantized model (e.g. `Q4_K_M` instead of `Q8_0`).

### Model not appearing in the Models tab

- Reload the model in LM Studio (unload → load again).
- Refresh the Models tab in OpenClaw.
