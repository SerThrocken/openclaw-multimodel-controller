"""
/models  — list available models from the active backend.
"""

from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from config import BackendType, CLOUD_BACKENDS, config
import backends.lmstudio as lmstudio_backend
import backends.ollama as ollama_backend
import backends.cloud as cloud_backend

router = APIRouter()


@router.get("/models")
async def list_models():
    try:
        if config.backend == BackendType.lmstudio:
            models = await lmstudio_backend.list_models()
        elif config.backend == BackendType.ollama:
            models = await ollama_backend.list_models()
        elif config.backend in CLOUD_BACKENDS:
            models = await cloud_backend.list_models(config.backend.value)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown backend: {config.backend}")
        return {"object": "list", "data": models}
    except HTTPException:
        raise
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
