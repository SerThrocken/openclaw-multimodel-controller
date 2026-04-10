"""
Cloud AI service backend — OpenAI-compatible API proxy.

Supports any service that exposes an OpenAI-compatible REST API, including:
  • OpenAI (ChatGPT)          → https://api.openai.com/v1
  • Google Gemini             → https://generativelanguage.googleapis.com/v1beta/openai/
  • Perplexity                → https://api.perplexity.ai
  • Custom / self-hosted      → any URL the user provides (LiteLLM, Ollama remote,
                                 Azure OpenAI, LM Studio remote, LocalAI, etc.)

API keys are read from config at call time so live settings changes take
effect without a server restart.  Keys are stored ONLY in the local
config.json file on the user's PC and are forwarded exclusively to the
provider's own API endpoint over HTTPS — never logged or sent elsewhere.
"""

from __future__ import annotations

from typing import Any, AsyncIterator, Optional

import httpx

from config import config

# ---------------------------------------------------------------------------
# Provider registry  (named presets with known base URLs + fallback models)
# ---------------------------------------------------------------------------

_PROVIDERS: dict[str, dict[str, Any]] = {
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "default_models": [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-3.5-turbo",
        ],
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "default_models": [
            "gemini-2.0-flash",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.0-pro",
        ],
    },
    "perplexity": {
        "base_url": "https://api.perplexity.ai",
        "default_models": [
            "sonar-pro",
            "sonar",
            "sonar-reasoning-pro",
            "sonar-reasoning",
        ],
    },
}


def _provider_info(provider: str) -> tuple[str, Optional[str]]:
    """Return (base_url, api_key) for the given provider name."""
    if provider == "custom":
        base_url = (config.custom_base_url or "").rstrip("/")
        if base_url and not base_url.lower().startswith(("http://", "https://")):
            raise ValueError(
                "custom_base_url must start with http:// or https://. "
                f"Got: {base_url!r}"
            )
        return base_url, config.custom_api_key
    info = _PROVIDERS[provider]
    api_key: Optional[str] = getattr(config, f"{provider}_api_key", None)
    return info["base_url"], api_key


def _auth_headers(api_key: Optional[str]) -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


# ---------------------------------------------------------------------------
# Public interface (mirrors lmstudio.py / ollama.py)
# ---------------------------------------------------------------------------

async def list_models(provider: str) -> list[dict[str, Any]]:
    """
    Return a list of models for the given cloud provider.

    Tries the provider's /models endpoint first.  Falls back to a curated
    default list for named providers, or an empty list for custom endpoints.
    """
    base_url, api_key = _provider_info(provider)
    fallback = [
        {"id": m, "object": "model"}
        for m in _PROVIDERS.get(provider, {}).get("default_models", [])
    ]
    if not base_url:
        return fallback
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{base_url}/models",
                headers=_auth_headers(api_key),
            )
            if resp.status_code >= 400:
                return fallback
            data = resp.json()
            models = data.get("data", [])
            return models if models else fallback
    except Exception:
        return fallback


async def chat_completion(provider: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Forward a non-streaming chat completion to the cloud provider."""
    base_url, api_key = _provider_info(provider)
    if not base_url:
        raise ValueError(f"No base URL configured for provider '{provider}'")
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            json={**payload, "stream": False},
            headers=_auth_headers(api_key),
        )
        resp.raise_for_status()
        return resp.json()


async def chat_completion_stream(
    provider: str, payload: dict[str, Any]
) -> AsyncIterator[bytes]:
    """Forward a streaming chat completion, yielding raw SSE bytes."""
    base_url, api_key = _provider_info(provider)
    if not base_url:
        raise ValueError(f"No base URL configured for provider '{provider}'")
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            f"{base_url}/chat/completions",
            json={**payload, "stream": True},
            headers=_auth_headers(api_key),
        ) as resp:
            resp.raise_for_status()
            async for chunk in resp.aiter_bytes():
                yield chunk


async def health_check(provider: str) -> bool:
    """
    Return True if the provider endpoint is reachable.

    For named providers (openai/gemini/perplexity) a missing API key is
    treated as unhealthy so the startup log is informative.
    For the custom provider the endpoint URL must also be set.
    """
    base_url, api_key = _provider_info(provider)
    if not base_url:
        return False
    if provider != "custom" and not api_key:
        return False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{base_url}/models",
                headers=_auth_headers(api_key),
            )
            return resp.status_code < 500
    except Exception:
        return False
