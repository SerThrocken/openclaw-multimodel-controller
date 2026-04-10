"""
OpenClaw Multi-Model Controller — PC Server
===========================================

Entry point.  Starts a FastAPI/Uvicorn server that proxies AI inference
requests from the Android client to either LM Studio or Ollama running
locally on the same PC.

Usage
-----
    python main.py [--host 0.0.0.0] [--port 8080] [--tray]

The --tray flag launches a system tray icon for GUI-less control.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import threading

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from config import config
import backends.lmstudio as lmstudio_backend
import backends.ollama as ollama_backend
from routes import chat, models, settings as settings_route

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="OpenClaw Multi-Model Controller",
    description=(
        "Local-network proxy that routes Android AI requests to either "
        "LM Studio or Ollama running on the same PC."
    ),
    version="1.0.0",
)

# CORS — allow the Android/web client on any origin within the LAN
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Optional token-based authentication
# ---------------------------------------------------------------------------

async def verify_token(request: Request):
    if config.auth_token is None:
        return  # Auth disabled
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = auth_header.removeprefix("Bearer ").strip()
    if token != config.auth_token:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(chat.router, dependencies=[Depends(verify_token)])
app.include_router(models.router, dependencies=[Depends(verify_token)])
app.include_router(settings_route.router, dependencies=[Depends(verify_token)])


# ---------------------------------------------------------------------------
# Health / discovery endpoint  (no auth required so Android can ping easily)
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    lm_ok = await lmstudio_backend.health_check()
    ol_ok = await ollama_backend.health_check()
    return {
        "status": "ok",
        "active_backend": config.backend,
        "lmstudio_available": lm_ok,
        "ollama_available": ol_ok,
        "active_model": config.active_model,
    }


# ---------------------------------------------------------------------------
# Startup: auto-detect available backends
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def auto_detect_backend():
    lm_ok = await lmstudio_backend.health_check()
    ol_ok = await ollama_backend.health_check()

    if not lm_ok and not ol_ok:
        print("[openclaw] WARNING: Neither LM Studio nor Ollama is reachable.")
        print("           Start one before sending requests.")
        return

    # If the configured backend is unavailable but the other one is, switch.
    if config.backend.value == "lmstudio" and not lm_ok and ol_ok:
        config.backend = config.backend.__class__("ollama")
        config.save()
        print("[openclaw] LM Studio not found — switched to Ollama automatically.")
    elif config.backend.value == "ollama" and not ol_ok and lm_ok:
        config.backend = config.backend.__class__("lmstudio")
        config.save()
        print("[openclaw] Ollama not found — switched to LM Studio automatically.")

    status = "✓" if (lm_ok or ol_ok) else "✗"
    print(f"[openclaw] {status} Active backend: {config.backend.value}")
    print(f"[openclaw]   LM Studio reachable : {lm_ok}")
    print(f"[openclaw]   Ollama reachable    : {ol_ok}")


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
        choices=["lmstudio", "ollama"],
        default=None,
        help="Force backend selection",
    )
    parser.add_argument("--token", default=None, help="Set shared auth token for LAN security")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Apply CLI overrides
    config.bind_host = args.host
    config.bind_port = args.port
    if args.backend:
        from config import BackendType
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
