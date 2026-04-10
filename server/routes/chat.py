"""
/chat/completions  — proxy route.

Accepts an OpenAI-compatible chat completion request and forwards it to
whichever backend (LM Studio or Ollama) is currently configured.
"""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from config import BackendType, config
import backends.lmstudio as lmstudio_backend
import backends.ollama as ollama_backend

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

        # Ollama
        if stream:
            return StreamingResponse(
                ollama_backend.chat_completion_stream(payload),
                media_type="text/event-stream",
            )
        return await ollama_backend.chat_completion(payload)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail=f"Cannot reach {config.backend} backend. Is it running?",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
