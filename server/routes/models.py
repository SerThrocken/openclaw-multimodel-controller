"""
/models  — list available models from the active backend.
"""

from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from config import BackendType, config
import backends.lmstudio as lmstudio_backend
import backends.ollama as ollama_backend

router = APIRouter()


@router.get("/models")
async def list_models():
    try:
        if config.backend == BackendType.lmstudio:
            models = await lmstudio_backend.list_models()
        else:
            models = await ollama_backend.list_models()
        return {"object": "list", "data": models}
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail=f"Cannot reach {config.backend} backend. Is it running?",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
