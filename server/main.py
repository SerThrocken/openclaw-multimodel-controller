"""
OpenClaw Multi-Model Controller — PC Server
===========================================

Entry point.  Starts a FastAPI/Uvicorn server that:

  * Proxies AI inference requests to LM Studio, Ollama, or any
    OpenAI-compatible cloud/custom service.
  * Serves a built-in web chat UI at http://localhost:8080  so the app
    works in any browser on PC *or* on a mobile phone browser over LAN —
    no Android APK required for basic usage.
  * Optionally shows a system-tray icon (--tray) for GUI-less control.

Usage
-----
    python main.py [--host 0.0.0.0] [--port 8080] [--tray]
    python main.py --backend ollama --port 8080
    python main.py --backend openai --port 8080
    python main.py --token mysecret   # enable Bearer-token auth
"""

from __future__ import annotations

import argparse
import asyncio
import hmac
import sys
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse

from config import CLOUD_BACKENDS, BackendType, config
import backends.lmstudio as lmstudio_backend
import backends.ollama as ollama_backend
import backends.cloud as cloud_backend
from routes import chat, models, settings as settings_route, conversations as conversations_route, pro_route as pro_route

_UI_HTML = Path(__file__).parent / "ui" / "web.html"


# ---------------------------------------------------------------------------
# Lifespan — replaces the deprecated @app.on_event("startup")
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Check available backends on startup and report status."""
    lm_ok = await lmstudio_backend.health_check()
    ol_ok = await ollama_backend.health_check()

    if config.backend in CLOUD_BACKENDS:
        # Cloud / custom backend selected — check it, don't auto-switch away.
        cloud_ok = await cloud_backend.health_check(config.backend.value)
        print(f"[openclaw] ✓ Active backend : {config.backend.value}")
        print(f"[openclaw]   Cloud endpoint : {'✓ reachable' if cloud_ok else '✗ unreachable or no API key set'}")
        print(f"[openclaw]   LM Studio      : {'✓' if lm_ok else '✗'}")
        print(f"[openclaw]   Ollama         : {'✓' if ol_ok else '✗'}")
    elif not lm_ok and not ol_ok:
        print("[openclaw] WARNING: Neither LM Studio nor Ollama is reachable.")
        print("           Start one of them before sending chat requests.")
    else:
        # If the configured local backend is unreachable but the other one is, switch.
        if config.backend == BackendType.lmstudio and not lm_ok and ol_ok:
            config.backend = BackendType.ollama
            config.save()
            print("[openclaw] LM Studio not found — switched to Ollama automatically.")
        elif config.backend == BackendType.ollama and not ol_ok and lm_ok:
            config.backend = BackendType.lmstudio
            config.save()
            print("[openclaw] Ollama not found — switched to LM Studio automatically.")

        print(f"[openclaw] ✓ Active backend : {config.backend.value}")
        print(f"[openclaw]   LM Studio      : {'✓' if lm_ok else '✗'}")
        print(f"[openclaw]   Ollama         : {'✓' if ol_ok else '✗'}")

    print(f"[openclaw] Web UI available at http://{config.bind_host}:{config.bind_port}/")

    # Re-validate Pro tier on startup so stale tokens are refreshed immediately.
    from pro import is_pro, revalidate_pro
    if is_pro():
        print("[openclaw] Revalidating Pro tier with Patreon…")
        still_pro = await revalidate_pro()
        print(f"[openclaw] {'✓ Pro verified.' if still_pro else '⚠ Pro could not be re-verified — reverted to free tier.'}")

    yield  # application runs here


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="OpenClaw Multi-Model Controller",
    description=(
        "Local-network proxy that routes browser/Android AI requests to either "
        "LM Studio or Ollama running on the same PC."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow any origin so the Android app and browsers on other LAN
# devices can reach the server.  allow_credentials is intentionally omitted
# (defaults to False): auth uses Bearer tokens in headers, not cookies,
# so credential sharing is not required.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Optional token-based authentication
# ---------------------------------------------------------------------------

async def verify_token(request: Request):
    if config.auth_token is None:
        return  # Auth disabled globally
    # The OAuth callback must be publicly reachable — Patreon's redirect does
    # not include our Bearer token, so we exempt this path from auth.
    if request.url.path == "/pro/oauth/callback":
        return
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = auth_header.removeprefix("Bearer ").strip()
    # Use constant-time comparison to prevent timing-based side-channel attacks.
    if not hmac.compare_digest(token, config.auth_token):
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Routers (protected by optional token auth)
# ---------------------------------------------------------------------------

app.include_router(chat.router, dependencies=[Depends(verify_token)])
app.include_router(models.router, dependencies=[Depends(verify_token)])
app.include_router(settings_route.router, dependencies=[Depends(verify_token)])
app.include_router(conversations_route.router, dependencies=[Depends(verify_token)])
app.include_router(pro_route.router, dependencies=[Depends(verify_token)])


# ---------------------------------------------------------------------------
# Health / discovery endpoint  (no auth — Android/browser can ping freely)
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    lm_ok = await lmstudio_backend.health_check()
    ol_ok = await ollama_backend.health_check()
    cloud_ok = None
    if config.backend in CLOUD_BACKENDS:
        cloud_ok = await cloud_backend.health_check(config.backend.value)
    return {
        "status": "ok",
        "active_backend": config.backend,
        "lmstudio_available": lm_ok,
        "ollama_available": ol_ok,
        "cloud_available": cloud_ok,
        "active_model": config.active_model,
    }


# ---------------------------------------------------------------------------
# Built-in web UI — served at "/"
# Works in any browser: PC (localhost) or mobile phone (via LAN IP).
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def web_ui():
    if _UI_HTML.exists():
        return FileResponse(_UI_HTML, media_type="text/html")
    return HTMLResponse(
        "<h2>OpenClaw server is running.</h2>"
        "<p>The web UI file (<code>ui/web.html</code>) was not found.</p>"
        "<p>See the <a href='/docs'>API docs</a> for direct API access.</p>"
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OpenClaw Multi-Model Controller server")
    parser.add_argument("--host", default=config.bind_host, help="Bind host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=config.bind_port, help="Bind port (default: 8080)")
    parser.add_argument("--tray", action="store_true", help="Show system tray icon")
    parser.add_argument(
        "--backend",
        choices=["lmstudio", "ollama", "openai", "gemini", "perplexity", "custom"],
        default=None,
        help="Force backend selection",
    )
    parser.add_argument("--token", default=None, help="Set shared auth token for LAN/remote security")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Apply CLI overrides
    config.bind_host = args.host
    config.bind_port = args.port
    if args.backend:
        config.backend = BackendType(args.backend)
    if args.token:
        config.auth_token = args.token
    config.save()

    uv_config = uvicorn.Config(
        app,
        host=config.bind_host,
        port=config.bind_port,
        log_level="info",
    )
    server = uvicorn.Server(uv_config)

    if args.tray:
        # Run uvicorn in a background thread and show tray in main thread
        def run_server():
            asyncio.run(server.serve())

        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()

        from ui.tray import run_tray
        run_tray(on_quit=lambda: sys.exit(0))
    else:
        server.run()


if __name__ == "__main__":
    main()
