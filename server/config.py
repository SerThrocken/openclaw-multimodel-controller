"""
Application configuration — persisted to config.json in the server directory.
"""

from __future__ import annotations

import json
import os
from enum import Enum
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field

CONFIG_PATH = Path(os.environ.get("OPENCLAW_CONFIG", Path(__file__).parent / "config.json"))

LMSTUDIO_DEFAULT_HOST = "localhost"
LMSTUDIO_DEFAULT_PORT = 1234

OLLAMA_DEFAULT_HOST = "localhost"
OLLAMA_DEFAULT_PORT = 11434


class BackendType(str, Enum):
    lmstudio = "lmstudio"
    ollama = "ollama"


class ServerConfig(BaseModel):
    # Which backend to proxy requests to
    backend: BackendType = BackendType.lmstudio

    # LM Studio connection details
    lmstudio_host: str = Field(default=LMSTUDIO_DEFAULT_HOST)
    lmstudio_port: int = Field(default=LMSTUDIO_DEFAULT_PORT)

    # Ollama connection details
    ollama_host: str = Field(default=OLLAMA_DEFAULT_HOST)
    ollama_port: int = Field(default=OLLAMA_DEFAULT_PORT)

    # Bind address / port for *this* proxy server
    bind_host: str = Field(default="0.0.0.0")
    bind_port: int = Field(default=8080)

    # Optional shared-secret token for LAN security.
    # When set, clients must send  Authorization: Bearer <token>
    auth_token: Optional[str] = Field(default=None)

    # Active model selection (remembered across requests)
    active_model: Optional[str] = Field(default=None)

    def lmstudio_base_url(self) -> str:
        return f"http://{self.lmstudio_host}:{self.lmstudio_port}/v1"

    def ollama_base_url(self) -> str:
        return f"http://{self.ollama_host}:{self.ollama_port}"

    def save(self) -> None:
        CONFIG_PATH.write_text(self.model_dump_json(indent=2))

    @classmethod
    def load(cls) -> "ServerConfig":
        if CONFIG_PATH.exists():
            try:
                data = json.loads(CONFIG_PATH.read_text())
                return cls(**data)
            except Exception:
                pass
        return cls()


# Module-level singleton loaded at import time
config: ServerConfig = ServerConfig.load()
