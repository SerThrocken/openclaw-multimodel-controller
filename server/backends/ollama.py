"""
Ollama backend client.

Ollama exposes its own REST API at http://localhost:11434
Documentation: https://github.com/ollama/ollama/blob/main/docs/api.md

For chat completions we use the OpenAI-compatible endpoint that Ollama also
provides at /api/chat (and /v1/chat/completions for the OpenAI-compat layer).
"""

from __future__ import annotations

from typing import Any, AsyncIterator

import httpx

from config import config


def _headers() -> dict[str, str]:
    return {"Content-Type": "application/json"}


async def list_models() -> list[dict[str, Any]]:
    """Return models available in Ollama, normalised to OpenAI-style dicts."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{config.ollama_base_url()}/api/tags", headers=_headers())
        resp.raise_for_status()
        data = resp.json()
        # Normalise to {"id": "<name>", "object": "model"} so callers see a
        # consistent structure regardless of the active backend.
        return [
            {"id": m["name"], "object": "model", "details": m}
            for m in data.get("models", [])
        ]


async def chat_completion(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Forward a non-streaming chat completion to Ollama using its
    OpenAI-compatible endpoint and return the full response body.
    """
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{config.ollama_base_url()}/api/chat",
            json=_to_ollama_payload(payload),
            headers=_headers(),
        )
        resp.raise_for_status()
        ollama_resp = resp.json()
        return _to_openai_response(ollama_resp, payload)


async def chat_completion_stream(payload: dict[str, Any]) -> AsyncIterator[bytes]:
    """
    Forward a streaming chat completion to Ollama and yield raw SSE chunks
    in the same format the caller expects (OpenAI-style `data: {...}\n\n`).
    """
    import json

    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            f"{config.ollama_base_url()}/api/chat",
            json={**_to_ollama_payload(payload), "stream": True},
            headers=_headers(),
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                except Exception:
                    continue
                # Translate to OpenAI SSE format
                openai_chunk = {
                    "id": "chatcmpl-ollama",
                    "object": "chat.completion.chunk",
                    "model": payload.get("model", ""),
                    "choices": [
                        {
                            "index": 0,
                            "delta": {
                                "role": "assistant",
                                "content": chunk.get("message", {}).get("content", ""),
                            },
                            "finish_reason": "stop" if chunk.get("done") else None,
                        }
                    ],
                }
                yield f"data: {json.dumps(openai_chunk)}\n\n".encode()
            yield b"data: [DONE]\n\n"


async def health_check() -> bool:
    """Return True when Ollama is reachable."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{config.ollama_base_url()}/api/tags", headers=_headers())
            return resp.status_code < 500
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_ollama_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Convert an OpenAI-style chat payload to Ollama's /api/chat format."""
    return {
        "model": payload.get("model", config.active_model or "llama3"),
        "messages": payload.get("messages", []),
        "stream": False,
        "options": {
            k: v
            for k, v in payload.items()
            if k in {"temperature", "top_p", "top_k", "num_predict", "seed"}
        },
    }


def _to_openai_response(ollama_resp: dict[str, Any], original: dict[str, Any]) -> dict[str, Any]:
    """Wrap Ollama's response in an OpenAI-compatible structure."""
    message = ollama_resp.get("message", {})
    return {
        "id": "chatcmpl-ollama",
        "object": "chat.completion",
        "model": original.get("model", ollama_resp.get("model", "")),
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": message.get("role", "assistant"),
                    "content": message.get("content", ""),
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": ollama_resp.get("prompt_eval_count", 0),
            "completion_tokens": ollama_resp.get("eval_count", 0),
            "total_tokens": ollama_resp.get("prompt_eval_count", 0)
            + ollama_resp.get("eval_count", 0),
        },
    }
