"""
Application configuration — persisted to config.json in the server directory.
"""

from __future__ import annotations

import json
import os
import stat
import tempfile
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
    openai = "openai"
    gemini = "gemini"
    perplexity = "perplexity"
    # Any OpenAI-compatible endpoint (self-hosted, Azure, LiteLLM proxy, etc.)
    custom = "custom"


CLOUD_BACKENDS = {
    BackendType.openai,
    BackendType.gemini,
    BackendType.perplexity,
    BackendType.custom,
}


class ServerConfig(BaseModel):
    # Which backend to proxy requests to
    backend: BackendType = BackendType.lmstudio

    # LM Studio connection details
    lmstudio_host: str = Field(default=LMSTUDIO_DEFAULT_HOST)
    lmstudio_port: int = Field(default=LMSTUDIO_DEFAULT_PORT)

    # Ollama connection details
    ollama_host: str = Field(default=OLLAMA_DEFAULT_HOST)
    ollama_port: int = Field(default=OLLAMA_DEFAULT_PORT)

    # Cloud service API keys (stored locally in config.json on your PC only —
    # never sent to OpenClaw servers or any third party; forwarded only to the
    # provider whose backend is currently selected).
    openai_api_key: Optional[str] = Field(default=None)
    gemini_api_key: Optional[str] = Field(default=None)
    perplexity_api_key: Optional[str] = Field(default=None)

    # Custom / self-hosted OpenAI-compatible endpoint
    custom_base_url: Optional[str] = Field(default=None)
    custom_api_key: Optional[str] = Field(default=None)
    # Human-readable label shown in the UI for the custom provider
    custom_name: Optional[str] = Field(default="Custom")

    # Bind address / port for *this* proxy server
    bind_host: str = Field(default="0.0.0.0")
    bind_port: int = Field(default=8080)

    # Optional shared-secret token for LAN security.
    # When set, clients must send  Authorization: Bearer <token>
    auth_token: Optional[str] = Field(default=None)

    # Active model selection (remembered across requests)
    active_model: Optional[str] = Field(default=None)

    # ── Patreon OAuth for Pro tier ─────────────────────────────────────────
    # Register an OAuth client at https://www.patreon.com/portal/registration/register-clients
    # Redirect URI: http://localhost:{bind_port}/pro/oauth/callback
    patreon_client_id:     Optional[str] = Field(default=None)
    patreon_client_secret: Optional[str] = Field(default=None)  # write-only, never returned by GET
    patreon_campaign_id:   Optional[str] = Field(default=None)  # optional, filters to your campaign
    # Patreon ID of the server owner — bypasses pledge check (no pledge required for creator)
    creator_patreon_id:    Optional[str] = Field(default=None)
    # Fernet key used to encrypt Patreon tokens stored in pro.json.
    # Generated automatically on first use; stored in this file (0o600 permissions).
    pro_encryption_key:    Optional[str] = Field(default=None)

    def lmstudio_base_url(self) -> str:
        return f"http://{self.lmstudio_host}:{self.lmstudio_port}/v1"

    def ollama_base_url(self) -> str:
        return f"http://{self.ollama_host}:{self.ollama_port}"

    def save(self) -> None:
        """Persist config to disk atomically with owner-only read/write permissions.

        Uses a temp file + rename so a crash mid-write cannot corrupt the config.
        File permissions are set to 0o600 (owner read/write only) on POSIX systems
        so other users on the same machine cannot read stored API keys.
        """
        config_dir = CONFIG_PATH.parent
        try:
            fd, tmp_path = tempfile.mkstemp(dir=config_dir, suffix=".tmp")
            try:
                with os.fdopen(fd, "w") as f:
                    f.write(self.model_dump_json(indent=2))
                # Restrict permissions before moving into place
                try:
                    os.chmod(tmp_path, stat.S_IRUSR | stat.S_IWUSR)  # 0o600
                except Exception:
                    pass  # Non-POSIX filesystem (e.g. FAT32 on Windows) — skip
                Path(tmp_path).replace(CONFIG_PATH)
            except Exception:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
                raise
        except Exception:
            # Fall back to simple write if atomic write fails (e.g. cross-device)
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
