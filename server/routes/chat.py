"""
/chat/completions  — proxy route.

Accepts an OpenAI-compatible chat completion request and forwards it to
whichever backend is currently configured (LM Studio, Ollama, or any
OpenAI-compatible cloud / custom service).
"""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from config import BackendType, CLOUD_BACKENDS, config
import backends.lmstudio as lmstudio_backend
import backends.ollama as ollama_backend
import backends.cloud as cloud_backend

router = APIRouter()


@router.post("/chat/completions")
async def chat_completions(payload: dict[str, Any]):
    # Inject active model if the caller did not specify one
    if not payload.get("model") and config.active_model:
        payload = {**payload, "model": config.active_model}

    stream: bool = bool(payload.get("stream", False))

    try:
        if config.backend == BackendType.lmstudio:
            if stream:
                return StreamingResponse(
                    lmstudio_backend.chat_completion_stream(payload),
                    media_type="text/event-stream",
                )
            return await lmstudio_backend.chat_completion(payload)

        if config.backend == BackendType.ollama:
            if stream:
                return StreamingResponse(
                    ollama_backend.chat_completion_stream(payload),
                    media_type="text/event-stream",
                )
            return await ollama_backend.chat_completion(payload)

        # Cloud / custom OpenAI-compatible backends
        if config.backend in CLOUD_BACKENDS:
            provider = config.backend.value
            if stream:
                return StreamingResponse(
                    cloud_backend.chat_completion_stream(provider, payload),
                    media_type="text/event-stream",
                )
            return await cloud_backend.chat_completion(provider, payload)

        raise HTTPException(status_code=400, detail=f"Unknown backend: {config.backend}")

    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail=f"Cannot reach {config.backend} backend. Is it running?",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
