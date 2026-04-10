"""
/pro  — Patreon OAuth endpoints for Pro tier verification.

OAuth flow
──────────
1. GET  /pro/oauth/start           → { url, redirect_uri }
2.      User authorises in a popup window
3. GET  /pro/oauth/callback        → HTML page (posts postMessage to opener)
4.      UI receives message, calls checkProStatus()

Creator flow
────────────
GET /pro/oauth/start?creator=1  →  same OAuth flow but pledge check is skipped;
the server owner's Patreon ID is stored in config as creator_patreon_id.

Re-validation
─────────────
GET /pro/status  triggers re-validation if the last check was > 24 h ago.
POST /pro/revalidate  forces an immediate re-check.

NOTE: /pro/oauth/callback must NOT require the OpenClaw Bearer token because
Patreon's redirect does not include it.  main.py exempts this path from the
verify_token dependency.
"""
from __future__ import annotations

import json as _json

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from pro import (
    new_oauth_state, consume_oauth_state,
    build_oauth_url, exchange_code, get_patron_info, activate_pro_from_oauth,
    deactivate_pro, pro_info, revalidate_pro, _needs_revalidation,
    PATREON_MIN_CENTS,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Shared HTML result page
# ---------------------------------------------------------------------------

def _result_page(success: bool, message: str) -> str:
    icon  = "🌟" if success else "❌"
    color = "#4caf50" if success else "#f44336"
    ev    = "patreon_oauth_success" if success else "patreon_oauth_error"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>OpenClaw Pro</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:system-ui,-apple-system,sans-serif;background:#1a1a2e;
         color:#f0f0f0;display:flex;align-items:center;justify-content:center;
         min-height:100vh;padding:20px}}
    .card{{background:#16213e;border:1px solid #2a2a4e;border-radius:16px;
           padding:40px 32px;max-width:380px;width:100%;text-align:center;
           box-shadow:0 8px 32px rgba(0,0,0,.4)}}
    .icon{{font-size:52px;margin-bottom:20px;display:block;
           animation:pop .4s cubic-bezier(.34,1.56,.64,1)}}
    @keyframes pop{{from{{transform:scale(0)}}to{{transform:scale(1)}}}}
    h2{{font-size:20px;margin-bottom:12px;color:{color}}}
    p{{color:#888;font-size:14px;line-height:1.6}}
    .bar{{height:3px;background:{color};border-radius:2px;margin-top:24px;
          animation:shrink 2.2s linear forwards}}
    @keyframes shrink{{from{{width:100%}}to{{width:0%}}}}
  </style>
</head>
<body>
  <div class="card">
    <span class="icon">{icon}</span>
    <h2>{"Pro Activated!" if success else "Verification Failed"}</h2>
    <p>{message}</p>
    <div class="bar"></div>
  </div>
  <script>
    try {{
      window.opener && window.opener.postMessage(
        {{ type: {_json.dumps(ev)}, message: {_json.dumps(message)} }},
        window.location.origin
      );
    }} catch(_) {{}}
    setTimeout(() => window.close(), 2200);
  </script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/pro/status")
async def get_pro_status():
    """Return current Pro status; triggers 24 h re-validation if due."""
    if _needs_revalidation():
        await revalidate_pro()
    return pro_info()


@router.get("/pro/oauth/start")
async def oauth_start(creator: bool = False):
    """
    Return the Patreon authorization URL.  Pass ?creator=1 to start the
    server-owner linking flow (no pledge check required).
    """
    from config import config
    if not config.patreon_client_id or not config.patreon_client_secret:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail=(
                "Patreon OAuth is not configured. "
                "Enter your Client ID and Client Secret in "
                "⚙ Settings → Developer — Patreon OAuth Setup."
            ),
        )
    redirect_uri = f"http://localhost:{config.bind_port}/pro/oauth/callback"
    state = new_oauth_state(is_creator=creator)
    url   = build_oauth_url(redirect_uri, state, config.patreon_client_id)
    return {"url": url, "redirect_uri": redirect_uri}


@router.get("/pro/oauth/callback", include_in_schema=False)
async def oauth_callback(code: str = "", state: str = "", error: str = ""):
    """
    Patreon redirects here after the user authorises or denies.
    This route is intentionally excluded from Bearer-token auth in main.py.
    """
    if error:
        return HTMLResponse(_result_page(False, f"Patreon returned: {error}"), status_code=400)

    if not code or not state:
        return HTMLResponse(_result_page(False, "Missing code or state."), status_code=400)

    state_meta = consume_oauth_state(state)
    if state_meta is None:
        return HTMLResponse(
            _result_page(False, "Invalid or expired state — please try again."),
            status_code=400,
        )

    is_creator = state_meta.get("is_creator", False)

    from config import config
    client_id     = config.patreon_client_id
    client_secret = config.patreon_client_secret
    campaign_id   = config.patreon_campaign_id
    redirect_uri  = f"http://localhost:{config.bind_port}/pro/oauth/callback"

    # ── Step 1: exchange code for tokens ────────────────────────────────
    try:
        token_data = await exchange_code(code, redirect_uri, client_id, client_secret)
    except Exception as exc:
        return HTMLResponse(_result_page(False, f"Token exchange failed: {exc}"), status_code=502)

    access_token  = token_data.get("access_token",  "")
    refresh_token = token_data.get("refresh_token", "")
    if not access_token:
        return HTMLResponse(_result_page(False, "No access token received."), status_code=502)

    # ── Step 2: get Patreon identity ─────────────────────────────────────
    try:
        patron = await get_patron_info(access_token, campaign_id)
    except Exception as exc:
        return HTMLResponse(_result_page(False, f"Could not verify patron: {exc}"), status_code=502)

    name = patron.get("full_name") or "Supporter"

    # ── Step 3: creator bypass — no pledge check ─────────────────────────
    if is_creator:
        try:
            await activate_pro_from_oauth(patron, access_token, refresh_token, is_creator=True)
        except Exception as exc:
            return HTMLResponse(_result_page(False, f"Failed to save: {exc}"), status_code=500)
        return HTMLResponse(_result_page(
            True,
            f"Creator account linked! Welcome, {name}. "
            f"You'll never be locked out of your own app. You can close this window.",
        ))

    # ── Step 4: regular patron — check pledge ────────────────────────────
    if not patron.get("is_active_patron"):
        needed = PATREON_MIN_CENTS // 100
        actual = (patron.get("entitled_cents") or 0) // 100
        status = patron.get("patron_status") or "none"
        return HTMLResponse(
            _result_page(
                False,
                f"Not an active ${needed}+ patron "
                f"(status: {status}, current pledge: ${actual}). "
                f"Please pledge at least ${needed}/month at patreon.com/TLG3D and try again.",
            ),
            status_code=403,
        )

    # ── Step 5: activate ─────────────────────────────────────────────────
    try:
        await activate_pro_from_oauth(patron, access_token, refresh_token, is_creator=False)
    except Exception as exc:
        return HTMLResponse(_result_page(False, f"Failed to save Pro: {exc}"), status_code=500)

    return HTMLResponse(_result_page(
        True,
        f"Welcome, {name}! Thank you for your ${(patron['entitled_cents'] or 0)//100}+/month pledge. "
        f"All Pro features are now unlocked. You can close this window.",
    ))


@router.delete("/pro/activate")
async def deactivate():
    """Remove pro.json and revert to the free tier."""
    deactivate_pro()
    return pro_info()


@router.post("/pro/revalidate")
async def force_revalidate():
    """Force an immediate re-validation of stored Patreon tokens."""
    still_pro = await revalidate_pro()
    return {**pro_info(), "revalidated": True, "still_valid": still_pro}
