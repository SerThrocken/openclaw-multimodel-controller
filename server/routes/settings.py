"""
/settings  — read and update server configuration at runtime.

Security note: API keys are accepted via POST but are NEVER returned by GET.
The GET response only indicates whether a key is currently set (boolean).
This prevents keys from being exposed over the network even to authenticated
clients.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from config import BackendType, config

router = APIRouter()


class SettingsUpdate(BaseModel):
    backend: Optional[BackendType] = None
    lmstudio_host: Optional[str] = None
    lmstudio_port: Optional[int] = None
    ollama_host: Optional[str] = None
    ollama_port: Optional[int] = None
    auth_token: Optional[str] = None
    active_model: Optional[str] = None
    # Cloud provider API keys — accepted on write, never returned on read
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    perplexity_api_key: Optional[str] = None
    custom_api_key: Optional[str] = None
    # Custom endpoint settings (not secret — safe to return)
    custom_base_url: Optional[str] = None
    custom_name: Optional[str] = None
    # Patreon OAuth (client_secret is write-only — never returned by GET)
    patreon_client_id:     Optional[str] = None
    patreon_client_secret: Optional[str] = None
    patreon_campaign_id:   Optional[str] = None


@router.get("/settings")
def get_settings():
    return {
        "backend": config.backend,
        "lmstudio_host": config.lmstudio_host,
        "lmstudio_port": config.lmstudio_port,
        "ollama_host": config.ollama_host,
        "ollama_port": config.ollama_port,
        "bind_host": config.bind_host,
        "bind_port": config.bind_port,
        "auth_token_set": config.auth_token is not None,
        "active_model": config.active_model,
        # API keys: boolean presence only — actual values never returned
        "openai_api_key_set": config.openai_api_key is not None,
        "gemini_api_key_set": config.gemini_api_key is not None,
        "perplexity_api_key_set": config.perplexity_api_key is not None,
        "custom_api_key_set": config.custom_api_key is not None,
        # Custom endpoint (not secret)
        "custom_base_url": config.custom_base_url,
        "custom_name": config.custom_name,
        # Patreon OAuth — client_id and campaign_id are safe to return; secret is boolean only
        "patreon_client_id":         config.patreon_client_id,
        "patreon_client_secret_set": config.patreon_client_secret is not None,
        "patreon_campaign_id":       config.patreon_campaign_id,
    }


@router.post("/settings")
def update_settings(update: SettingsUpdate):
    if update.backend is not None:
        config.backend = update.backend
    if update.lmstudio_host is not None:
        config.lmstudio_host = update.lmstudio_host
    if update.lmstudio_port is not None:
        config.lmstudio_port = update.lmstudio_port
    if update.ollama_host is not None:
        config.ollama_host = update.ollama_host
    if update.ollama_port is not None:
        config.ollama_port = update.ollama_port
    if update.auth_token is not None:
        config.auth_token = update.auth_token if update.auth_token != "" else None
    if update.active_model is not None:
        config.active_model = update.active_model if update.active_model != "" else None
    # Cloud API keys: empty string clears the key
    if update.openai_api_key is not None:
        config.openai_api_key = update.openai_api_key if update.openai_api_key != "" else None
    if update.gemini_api_key is not None:
        config.gemini_api_key = update.gemini_api_key if update.gemini_api_key != "" else None
    if update.perplexity_api_key is not None:
        config.perplexity_api_key = update.perplexity_api_key if update.perplexity_api_key != "" else None
    if update.custom_api_key is not None:
        config.custom_api_key = update.custom_api_key if update.custom_api_key != "" else None
    if update.custom_base_url is not None:
        config.custom_base_url = update.custom_base_url if update.custom_base_url != "" else None
    if update.custom_name is not None:
        config.custom_name = update.custom_name if update.custom_name != "" else "Custom"
    config.save()
    return get_settings()
