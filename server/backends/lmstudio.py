"""
LM Studio backend client.

LM Studio exposes an OpenAI-compatible REST API at http://localhost:1234/v1
Documentation: https://lmstudio.ai/docs/app/api/endpoints/openai
"""

from __future__ import annotations

from typing import Any, AsyncIterator

import httpx

from config import config


def _headers() -> dict[str, str]:
    return {"Content-Type": "application/json"}


async def list_models() -> list[dict[str, Any]]:
    """Return the list of models currently loaded / available in LM Studio."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{config.lmstudio_base_url()}/models", headers=_headers())
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", [])


async def chat_completion(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Forward a non-streaming chat completion request to LM Studio and return
    the full response body.
    """
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{config.lmstudio_base_url()}/chat/completions",
            json=payload,
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def chat_completion_stream(payload: dict[str, Any]) -> AsyncIterator[bytes]:
    """
    Forward a streaming chat completion request to LM Studio and yield raw
    SSE chunks as they arrive.
    """
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            f"{config.lmstudio_base_url()}/chat/completions",
            json={**payload, "stream": True},
            headers=_headers(),
        ) as resp:
            resp.raise_for_status()
            async for chunk in resp.aiter_bytes():
                yield chunk


async def health_check() -> bool:
    """Return True when LM Studio is reachable."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{config.lmstudio_base_url()}/models", headers=_headers())
            return resp.status_code < 500
    except Exception:
        return False
