"""
/settings  — read and update server configuration at runtime.
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
    config.save()
    return get_settings()
