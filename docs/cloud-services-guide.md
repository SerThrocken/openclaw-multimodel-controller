# Cloud & Custom AI Services

OpenClaw can connect to any AI service that exposes an OpenAI-compatible REST API — including paid cloud providers and self-hosted servers.

---

## Supported providers

| Provider | Backend name | Requires API key | Models endpoint |
|----------|-------------|-----------------|-----------------|
| [OpenAI (ChatGPT)](https://platform.openai.com) | `openai` | Yes | ✓ Dynamic |
| [Google Gemini](https://aistudio.google.com) | `gemini` | Yes | ✓ Dynamic |
| [Perplexity](https://www.perplexity.ai/settings/api) | `perplexity` | Yes | Built-in list |
| Any OpenAI-compatible endpoint | `custom` | Optional | Tried automatically |

> **Your keys are never shared with OpenClaw** — they are stored only in `server/config.json` on your PC and sent exclusively to the provider's own API over HTTPS.  See [Privacy & Security](privacy.md) for full details.

---

## OpenAI (ChatGPT)

### 1. Get an API key

1. Sign in at [https://platform.openai.com](https://platform.openai.com).
2. Go to **API keys** → **Create new secret key**.
3. Copy the key — you will only see it once.

### 2. Configure in OpenClaw

1. Open the OpenClaw web UI → **⚙️ Settings**.
2. Under **Cloud services**, click **OpenAI**.
3. Paste your API key in the **API Key** field.
4. Click **💾 Save Settings**.
5. Go to **📦 Models** and select a model (e.g. `gpt-4o`).

### Available models (auto-fetched, fallback list shown)

| Model | Notes |
|-------|-------|
| `gpt-4o` | Latest flagship, multimodal |
| `gpt-4o-mini` | Fast and affordable |
| `gpt-4-turbo` | Previous generation flagship |
| `gpt-3.5-turbo` | Fast, low cost |

---

## Google Gemini

Google Gemini exposes an OpenAI-compatible endpoint, so no special client code is needed.

### 1. Get an API key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Click **Create API key** → select or create a project.
3. Copy the key.

### 2. Configure in OpenClaw

1. Open the web UI → **⚙️ Settings**.
2. Under **Cloud services**, click **Gemini**.
3. Paste your API key.
4. Click **💾 Save Settings**.
5. Go to **📦 Models** and select a model.

### Available models (auto-fetched, fallback list shown)

| Model | Notes |
|-------|-------|
| `gemini-2.0-flash` | Fastest Gemini 2 model |
| `gemini-1.5-pro` | Best quality, long context (2M tokens) |
| `gemini-1.5-flash` | Fast, efficient |
| `gemini-1.0-pro` | Previous generation |

---

## Perplexity

### 1. Get an API key

1. Sign in at [https://www.perplexity.ai](https://www.perplexity.ai).
2. Go to **Settings** → **API** → **Generate** a new key.

### 2. Configure in OpenClaw

1. Open the web UI → **⚙️ Settings**.
2. Under **Cloud services**, click **Perplexity**.
3. Paste your API key.
4. Click **💾 Save Settings**.
5. Go to **📦 Models** and select a model.

### Available models (built-in list — Perplexity has no public models endpoint)

| Model | Notes |
|-------|-------|
| `sonar-pro` | Best quality, search-augmented |
| `sonar` | Fast, search-augmented |
| `sonar-reasoning-pro` | Extended thinking + search |
| `sonar-reasoning` | Fast reasoning |

---

## Custom / any OpenAI-compatible endpoint

Use this option for:

- **Self-hosted servers** — LocalAI, LM Studio on a remote machine, LLaMA.cpp server, KoboldCpp, vLLM, etc.
- **LiteLLM proxy** — a single endpoint that routes to many providers.
- **Azure OpenAI** — your own Azure deployment.
- **Anthropic** (via a compatibility layer).
- **Any other service** that speaks the OpenAI API format.

### Configure in OpenClaw

1. Open the web UI → **⚙️ Settings**.
2. Under **Any OpenAI-compatible endpoint**, click **⚙ Custom…**.
3. Fill in:
   - **Service name** — a label shown in the header (e.g. `My Llama Server`).
   - **Base URL** — the root URL of the OpenAI-compatible API, e.g.:
     - `http://192.168.1.50:8080/v1` (local LLaMA.cpp)
     - `https://my-litellm.example.com/v1`
     - `https://<resource>.openai.azure.com/openai/deployments/<deployment>`
   - **API Key** — paste your key, or leave blank if the server doesn't require one.
4. Click **💾 Save Settings**.
5. Go to **📦 Models** — OpenClaw will try to fetch the model list from `/models`.  If the endpoint doesn't support it, enter the model name manually in a chat message or via the settings API.

> **Base URL must start with `http://` or `https://`** — other schemes are rejected for security.

### Example — LM Studio on a remote PC

If you have LM Studio running on another machine (e.g. your desktop) and want to connect from a laptop:

1. On the desktop, start LM Studio's server with the "Listen on all interfaces" option enabled.
2. In OpenClaw settings on the laptop, choose **Custom** and enter `http://192.168.1.42:1234/v1`.

### Example — Azure OpenAI

```
Base URL:  https://my-resource.openai.azure.com/openai/deployments/gpt-4o
API Key:   <your Azure API key>
```

---

## Switching between backends

You can switch backends at any time without restarting the server:

1. Go to **⚙️ Settings**, click the desired backend button, and click **💾 Save Settings**.
2. Go to **📦 Models** to pick a model for the new backend.
3. Start chatting.

Your chat history is cleared on backend switch to avoid sending mixed-context messages.

---

## Troubleshooting

### "No base URL configured for provider 'custom'"

You selected the Custom backend but haven't set a Base URL yet.  Go to Settings → ⚙ Custom → enter the URL → Save.

### "401 Unauthorized" from cloud provider

Your API key is wrong or expired.  Go to Settings, clear the key field and paste a fresh one.

### Models list shows built-in defaults instead of live list

The provider's `/models` endpoint is unavailable (common for Perplexity and some custom servers).  OpenClaw falls back to a curated list automatically.  You can still type any model name directly in the chat payload.

### "Connection refused" for custom endpoint

- Make sure the remote server is running and listening on the configured port.
- Check that no firewall is blocking the connection between the two machines.
- If using a Tailscale address, verify Tailscale is connected on both devices.
