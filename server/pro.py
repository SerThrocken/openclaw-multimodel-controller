"""
Pro tier — verified via Patreon OAuth.

Flow
────
1. Developer configures Patreon OAuth credentials in ⚙ Settings → Developer Setup.
2. User (or the server owner) clicks "Sign in with Patreon" in the UI.
3. Server generates a CSRF-safe state nonce and returns the Patreon auth URL.
4. User authorises in a popup window.
5. Patreon redirects to /pro/oauth/callback with an auth code.
6. Server exchanges the code for access + refresh tokens (HTTPS).
7. Server calls Patreon /identity to verify patron_status == "active_patron"
   and currently_entitled_amount_cents >= 500 ($5+).
   — OR — if the Patreon user ID matches config.creator_patreon_id, the pledge
   check is skipped and Pro is granted unconditionally (server-owner bypass).
8. Tokens are Fernet-encrypted and stored in pro.json (0o600 permissions).
9. On app start and every 24 h: tokens are refreshed and patron status is
   re-validated; Pro is revoked automatically if the pledge lapses.
   Creator accounts keep Pro even if their pledge lapses.

Security
────────
• OAuth state nonces expire after 10 minutes and are single-use (CSRF protection).
• All Patreon API calls use HTTPS.
• Access/refresh tokens are encrypted at rest with Fernet (AES-128-CBC + HMAC-SHA256).
• The Fernet key is stored in config.json (0o600 — owner-only read/write).
• pro.json itself also carries 0o600 permissions.
"""
from __future__ import annotations

import json
import os
import secrets
import stat
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken

PRO_PATH = Path(__file__).parent / "pro.json"

PATREON_URL = (
    "https://patreon.com/TLG3D"
    "?utm_medium=unknown&utm_source=join_link"
    "&utm_campaign=creatorshare_creator&utm_content=copyLink"
)

_PATREON_AUTH_URL     = "https://www.patreon.com/oauth2/authorize"
_PATREON_TOKEN_URL    = "https://www.patreon.com/api/oauth2/token"
_PATREON_IDENTITY_URL = (
    "https://www.patreon.com/api/oauth2/v2/identity"
    "?include=memberships"
    "&fields[member]=patron_status,currently_entitled_amount_cents,last_charge_status"
    "&fields[user]=full_name,email"
)

PATREON_MIN_CENTS       = 500    # $5.00 minimum pledge
REVALIDATE_INTERVAL_SEC = 86400  # 24 h between automatic re-checks

FREE_CONVERSATION_LIMIT = 25
FREE_LIVE_EXCHANGES     = 5
FREE_TTS_CHAR_LIMIT     = 200

# ---------------------------------------------------------------------------
# OAuth state nonces (in-memory, 10-minute TTL, single-use)
# ---------------------------------------------------------------------------

_oauth_states: dict[str, dict] = {}  # state → {"expiry": float, "is_creator": bool}


def new_oauth_state(is_creator: bool = False) -> str:
    """Return a fresh cryptographic state nonce (10-min TTL)."""
    state = secrets.token_hex(24)
    _oauth_states[state] = {"expiry": time.monotonic() + 600, "is_creator": is_creator}
    # Prune stale entries
    stale = [s for s, v in _oauth_states.items() if time.monotonic() > v["expiry"]]
    for s in stale:
        _oauth_states.pop(s, None)
    return state


def consume_oauth_state(state: str) -> Optional[dict]:
    """Consume and return state metadata; None if missing or expired."""
    meta = _oauth_states.pop(state, None)
    if meta is None or time.monotonic() > meta["expiry"]:
        return None
    return meta


# ---------------------------------------------------------------------------
# Fernet encryption helpers
# ---------------------------------------------------------------------------

def _get_fernet() -> Fernet:
    from config import config  # lazy — avoids circular import at module load
    if not config.pro_encryption_key:
        key = Fernet.generate_key().decode()
        config.pro_encryption_key = key
        config.save()
    return Fernet(config.pro_encryption_key.encode())


def _encrypt(data: dict) -> str:
    return _get_fernet().encrypt(json.dumps(data).encode()).decode()


def _decrypt(token: str) -> dict:
    return json.loads(_get_fernet().decrypt(token.encode()).decode())


# ---------------------------------------------------------------------------
# Local Pro state helpers
# ---------------------------------------------------------------------------

def is_pro() -> bool:
    """True when a valid, verified pro.json exists."""
    if not PRO_PATH.exists():
        return False
    try:
        return bool(json.loads(PRO_PATH.read_text(encoding="utf-8")).get("patron_verified"))
    except Exception:
        return False


def pro_info() -> dict:
    """Return Pro status details for the /pro/status API response."""
    try:
        from config import config as _c
        oauth_configured = bool(_c.patreon_client_id and _c.patreon_client_secret)
    except Exception:
        oauth_configured = False

    base: dict = {
        "pro":                     False,
        "is_creator":              False,
        "supporter_name":          None,
        "patreon_email":           None,
        "verified_at":             None,
        "last_revalidated":        None,
        "patreon_url":             PATREON_URL,
        "patreon_oauth_configured": oauth_configured,
        "free_conversation_limit": FREE_CONVERSATION_LIMIT,
        "free_live_exchanges":     FREE_LIVE_EXCHANGES,
        "free_tts_char_limit":     FREE_TTS_CHAR_LIMIT,
    }
    if not is_pro():
        return base
    try:
        data = json.loads(PRO_PATH.read_text(encoding="utf-8"))
    except Exception:
        return base
    return {
        **base,
        "pro":              True,
        "is_creator":       bool(data.get("is_creator")),
        "supporter_name":   data.get("full_name"),
        "patreon_email":    data.get("patreon_email"),
        "verified_at":      data.get("verified_at"),
        "last_revalidated": data.get("last_revalidated"),
    }


def deactivate_pro() -> None:
    try:
        PRO_PATH.unlink()
    except FileNotFoundError:
        pass


def _write_pro(data: dict) -> None:
    """Atomically write pro.json with 0o600 permissions."""
    tmp_dir = PRO_PATH.parent
    fd, tmp_path = tempfile.mkstemp(dir=tmp_dir, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        try:
            os.chmod(tmp_path, stat.S_IRUSR | stat.S_IWUSR)
        except Exception:
            pass
        Path(tmp_path).replace(PRO_PATH)
    except Exception:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        raise


def _needs_revalidation() -> bool:
    if not PRO_PATH.exists():
        return False
    try:
        data = json.loads(PRO_PATH.read_text(encoding="utf-8"))
        last = data.get("last_revalidated")
        if not last:
            return True
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(last)).total_seconds()
        return age >= REVALIDATE_INTERVAL_SEC
    except Exception:
        return True


# ---------------------------------------------------------------------------
# Patreon API helpers (async)
# ---------------------------------------------------------------------------

def build_oauth_url(redirect_uri: str, state: str, client_id: str) -> str:
    params = {
        "response_type": "code",
        "client_id":     client_id,
        "redirect_uri":  redirect_uri,
        "scope":         "identity identity[email] identity.memberships",
        "state":         state,
    }
    return f"{_PATREON_AUTH_URL}?{urlencode(params)}"


async def exchange_code(
    code: str, redirect_uri: str, client_id: str, client_secret: str
) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            _PATREON_TOKEN_URL,
            data={
                "code":          code,
                "grant_type":    "authorization_code",
                "client_id":     client_id,
                "client_secret": client_secret,
                "redirect_uri":  redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def _refresh_tokens(refresh_token: str, client_id: str, client_secret: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            _PATREON_TOKEN_URL,
            data={
                "grant_type":    "refresh_token",
                "refresh_token": refresh_token,
                "client_id":     client_id,
                "client_secret": client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def get_patron_info(access_token: str, campaign_id: Optional[str] = None) -> dict:
    """
    Call Patreon /identity and extract patron status.

    Returns dict with keys:
        patreon_id, full_name, email,
        patron_status, entitled_cents, is_active_patron
    """
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            _PATREON_IDENTITY_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        body = resp.json()

    user_data  = body.get("data", {})
    user_attrs = user_data.get("attributes", {})
    patreon_id = user_data.get("id")
    memberships = [m for m in body.get("included", []) if m.get("type") == "member"]

    best_cents, best_status = 0, None
    for m in memberships:
        attrs = m.get("attributes", {})
        # If campaign_id is set, only consider memberships for that campaign
        if campaign_id:
            rel_id = (
                m.get("relationships", {})
                 .get("campaign", {})
                 .get("data", {})
                 .get("id")
            )
            if rel_id != campaign_id:
                continue
        cents  = attrs.get("currently_entitled_amount_cents") or 0
        status = attrs.get("patron_status") or ""
        if cents > best_cents or (cents == best_cents and status == "active_patron"):
            best_cents, best_status = cents, status

    return {
        "patreon_id":       patreon_id,
        "full_name":        user_attrs.get("full_name"),
        "email":            user_attrs.get("email"),
        "patron_status":    best_status,
        "entitled_cents":   best_cents,
        "is_active_patron": best_status == "active_patron" and best_cents >= PATREON_MIN_CENTS,
    }


# ---------------------------------------------------------------------------
# Activation helpers
# ---------------------------------------------------------------------------

async def activate_pro_from_oauth(
    patron: dict, access_token: str, refresh_token: str, is_creator: bool = False
) -> None:
    """Encrypt tokens and write pro.json. Works for both patrons and creator."""
    now = datetime.now(timezone.utc).isoformat()
    tokens_enc = _encrypt({"access_token": access_token, "refresh_token": refresh_token})
    data = {
        "patron_verified":  True,
        "is_creator":       is_creator,
        "patreon_id":       patron["patreon_id"],
        "patreon_email":    patron["email"],
        "full_name":        patron["full_name"],
        "patron_status":    "creator" if is_creator else patron["patron_status"],
        "entitled_cents":   patron["entitled_cents"],
        "verified_at":      now,
        "last_revalidated": now,
        "tokens_enc":       tokens_enc,
    }
    _write_pro(data)
    # Persist creator_patreon_id to config so re-validation can identify the owner
    if is_creator and patron["patreon_id"]:
        from config import config
        config.creator_patreon_id = patron["patreon_id"]
        config.save()


# ---------------------------------------------------------------------------
# Periodic re-validation
# ---------------------------------------------------------------------------

async def revalidate_pro() -> bool:
    """
    Re-validate stored Patreon tokens.

    • Tries the access token; falls back to the refresh token on 401.
    • Updates last_revalidated on success.
    • Deactivates Pro if the patron is no longer active (unless is_creator).
    • On network errors, keeps the current status unchanged (benefit of the doubt).

    Returns True if Pro is still valid after the check.
    """
    if not PRO_PATH.exists():
        return False

    from config import config
    client_id     = config.patreon_client_id
    client_secret = config.patreon_client_secret
    campaign_id   = config.patreon_campaign_id

    if not client_id or not client_secret:
        # Credentials not configured — trust the existing file
        return is_pro()

    try:
        data = json.loads(PRO_PATH.read_text(encoding="utf-8"))
    except Exception:
        deactivate_pro()
        return False

    tokens_enc = data.get("tokens_enc")
    if not tokens_enc:
        if data.get("is_creator"):
            return True  # Legacy creator entry without tokens — keep active
        deactivate_pro()
        return False

    try:
        tokens = _decrypt(tokens_enc)
    except (InvalidToken, Exception):
        if data.get("is_creator"):
            return True  # Key rotation / migration — keep creator active
        deactivate_pro()
        return False

    access_token  = tokens.get("access_token",  "")
    refresh_token = tokens.get("refresh_token", "")
    is_creator    = bool(data.get("is_creator"))
    stored_pid    = data.get("patreon_id", "")
    creator_pid   = config.creator_patreon_id or ""

    patron = None
    try:
        patron = await get_patron_info(access_token, campaign_id)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401 and refresh_token:
            try:
                new_tokens    = await _refresh_tokens(refresh_token, client_id, client_secret)
                access_token  = new_tokens["access_token"]
                refresh_token = new_tokens.get("refresh_token", refresh_token)
                patron        = await get_patron_info(access_token, campaign_id)
                data["tokens_enc"] = _encrypt({
                    "access_token":  access_token,
                    "refresh_token": refresh_token,
                })
            except Exception:
                if is_creator:
                    return True  # Keep creator active when refresh fails
                deactivate_pro()
                return False
        else:
            if is_creator:
                return True  # Keep creator active on other HTTP errors
            deactivate_pro()
            return False
    except Exception:
        # Network error — keep current status unchanged
        return True

    # Creator bypass: if the Patreon ID matches the stored creator, skip pledge check
    if is_creator or (creator_pid and patron and patron.get("patreon_id") == creator_pid):
        data.update({
            "is_creator":       True,
            "patron_status":    "creator",
            "last_revalidated": datetime.now(timezone.utc).isoformat(),
        })
        if patron:
            data["full_name"]      = patron.get("full_name") or data.get("full_name")
            data["patreon_email"]  = patron.get("email")     or data.get("patreon_email")
            data["entitled_cents"] = patron.get("entitled_cents", 0)
        _write_pro(data)
        return True

    # Regular patron: check pledge is still active
    if not patron or not patron.get("is_active_patron"):
        deactivate_pro()
        return False

    data.update({
        "patron_status":    patron["patron_status"],
        "entitled_cents":   patron["entitled_cents"],
        "last_revalidated": datetime.now(timezone.utc).isoformat(),
    })
    _write_pro(data)
    return True
