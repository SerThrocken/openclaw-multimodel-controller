"""
Pro tier — unlocked by placing a  pro.json  file in the server directory.

How to unlock
─────────────
1. Donate $2 or more on Patreon:
   https://patreon.com/TLG3D?utm_medium=unknown&utm_source=join_link
       &utm_campaign=creatorshare_creator&utm_content=copyLink

2. Click  ⚙️ Settings → 🌟 Unlock OpenClaw Pro  in the web UI and press
   "I've Donated — Activate Pro", OR manually create  server/pro.json:

       { "name": "Your Name", "email": "your-patreon-email@example.com" }

3. Restart the server — Pro features activate immediately.

The file is gitignored so it is never committed to the repository.
"""
from __future__ import annotations

import json
import os
import stat
import tempfile
from pathlib import Path

PRO_PATH = Path(__file__).parent / "pro.json"

PATREON_URL = (
    "https://patreon.com/TLG3D"
    "?utm_medium=unknown&utm_source=join_link"
    "&utm_campaign=creatorshare_creator&utm_content=copyLink"
)

FREE_CONVERSATION_LIMIT = 25

# Live-session limits for the free tier
FREE_LIVE_EXCHANGES   = 5    # voice/text exchanges per browser session
FREE_TTS_CHAR_LIMIT   = 200  # characters spoken aloud per response


def is_pro() -> bool:
    """Return True when a valid pro.json exists in the server directory."""
    return PRO_PATH.exists()


def pro_info() -> dict:
    """Return Pro status details suitable for the /pro/status API response."""
    if not PRO_PATH.exists():
        return {
            "pro": False,
            "supporter_name": None,
            "patreon_url": PATREON_URL,
            "free_conversation_limit": FREE_CONVERSATION_LIMIT,
            "free_live_exchanges":     FREE_LIVE_EXCHANGES,
            "free_tts_char_limit":     FREE_TTS_CHAR_LIMIT,
        }
    try:
        data = json.loads(PRO_PATH.read_text(encoding="utf-8"))
    except Exception:
        data = {}
    return {
        "pro": True,
        "supporter_name": data.get("name") or None,
        "patreon_url": PATREON_URL,
        "free_conversation_limit": FREE_CONVERSATION_LIMIT,
        "free_live_exchanges":     FREE_LIVE_EXCHANGES,
        "free_tts_char_limit":     FREE_TTS_CHAR_LIMIT,
    }


def activate_pro(name: str | None, email: str | None) -> None:
    """Write pro.json to the server directory, activating the Pro tier."""
    data: dict = {}
    if name:
        data["name"] = name
    if email:
        data["email"] = email
    _write_pro(data)


def deactivate_pro() -> None:
    """Remove pro.json, reverting to the free tier."""
    try:
        PRO_PATH.unlink()
    except FileNotFoundError:
        pass


def _write_pro(data: dict) -> None:
    """Atomically write pro.json with owner-only permissions."""
    tmp_dir = PRO_PATH.parent
    fd, tmp_path = tempfile.mkstemp(dir=tmp_dir, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        try:
            os.chmod(tmp_path, stat.S_IRUSR | stat.S_IWUSR)  # 0o600
        except Exception:
            pass  # Non-POSIX filesystem — skip
        Path(tmp_path).replace(PRO_PATH)
    except Exception:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        raise
