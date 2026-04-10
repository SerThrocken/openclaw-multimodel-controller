# Privacy & Security

OpenClaw is designed from the ground up so that **your data never leaves your control**.  This document explains exactly what is stored, what is transmitted, and what security measures are in place.

---

## Your data stays on your device

| Data | Where it lives | Who can access it |
|------|---------------|-------------------|
| Chat messages | In memory only — cleared on page refresh or "Clear" button | Only you, while the session is active |
| Saved conversations | `server/conversations.json` on your PC (only when you explicitly click 💾 Save) | Only you (file is owner-read-only on Unix) |
| Settings (hosts, ports) | `server/config.json` on your PC | Only you (file is owner-read-only on Unix) |
| API keys | `server/config.json` on your PC | Only you — **never returned by the API**, never logged |
| Model selection | `server/config.json` on your PC | Only you |
| Auth token | `server/config.json` on your PC | Only you |

No database, no cloud sync, no account required.

---

## No data collection — ever

OpenClaw **does not**:

- Send telemetry, analytics, or crash reports anywhere.
- Log chat messages or prompt content.
- Automatically save any conversation — saving is always an explicit user action (clicking 💾 Save).
- Phone home to any OpenClaw server.
- Require an internet connection to function (for local backends).
- Share your API keys with any party other than the AI provider you explicitly chose.

The source code is fully open — you can audit every network call yourself.

---

## API keys

When you add an API key for OpenAI, Gemini, Perplexity, or a custom provider:

1. **Storage:** the key is saved to `server/config.json` on your local PC only.
2. **Transmission:** when you send a chat message, OpenClaw's server process forwards your key in the `Authorization: Bearer` header of a single HTTPS request directly to the provider's API endpoint.  No other party receives it.
3. **The web UI never receives your key back.** The `GET /settings` endpoint returns only a boolean (`openai_api_key_set: true/false`) — never the actual key value.  This means your key is safe even if someone gains read access to the settings API.

```
Your browser  →  POST /settings  →  OpenClaw server  (key stored in config.json)
                                                │
                    key forwarded only here ────┘
                                                ↓
                              Provider API (OpenAI / Gemini / etc.)
                              over HTTPS — encrypted in transit
```

---

## config.json and conversations.json security

`server/config.json` contains your settings and any stored API keys.  
`server/conversations.json` contains any conversations you explicitly chose to save.

- **File permissions:** on Unix systems (Linux, macOS), OpenClaw automatically sets both files to `0600` (owner read/write only) when saving.  Other users on the same machine cannot read them.
- **Git protection:** both files are listed in `.gitignore`.  They will never be committed to your repository, preventing accidental exposure.
- **Backup advice:** treat both files like sensitive personal data — store backups encrypted.

---

## Auth token

The optional auth token (`--token` flag or Settings → OpenClaw Access Token) protects all API endpoints with `Authorization: Bearer <token>` authentication.

- The `/health` and `/` (web UI) endpoints are intentionally public so your devices can discover the server without pre-configuring a token.
- All other endpoints (`/chat/completions`, `/models`, `/settings`) require the token when it is set.
- The token comparison uses **constant-time comparison** (`hmac.compare_digest`) to prevent timing-based side-channel attacks.

**Recommendation:** always set an auth token when using Tailscale or any remote access method.

---

## Network security

| Scenario | Recommendation |
|----------|---------------|
| Local network only (home Wi-Fi) | Auth token optional but recommended |
| Tailscale remote access | **Set an auth token** |
| Exposed to the internet directly | Not recommended — use Tailscale instead |
| Using cloud AI backends (OpenAI etc.) | Ensure your PC is not on an untrusted network |

### HTTPS / TLS

By default OpenClaw serves plain HTTP.  On a local network this is generally acceptable.  For Tailscale access, Tailscale encrypts all traffic between devices with WireGuard, so your AI conversations are encrypted in transit even without HTTPS.

If you require HTTPS directly on the OpenClaw server, place a reverse proxy (e.g. Caddy, Nginx) in front of it with a TLS certificate.

---

## CORS

OpenClaw's CORS policy allows requests from any origin so the Android app and browser on different LAN devices can connect.  `allow_credentials` is **not** set — the API uses Bearer tokens in HTTP headers, not cookies, so credential-sharing is unnecessary.

---

## Responsible disclosure

If you find a security vulnerability in OpenClaw, please open a GitHub issue or contact the repository owner directly before publishing.
