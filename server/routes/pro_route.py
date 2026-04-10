"""
/pro  — Pro tier status and activation endpoints.

Users who donate $2+ on Patreon can activate Pro directly from
Settings in the web UI, or by manually creating server/pro.json.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from pro import activate_pro, deactivate_pro, pro_info

router = APIRouter()


@router.get("/pro/status")
def get_pro_status():
    """Return current Pro tier status and free-tier limits."""
    return pro_info()


class ActivateRequest(BaseModel):
    name:  Optional[str] = None
    email: Optional[str] = None


@router.post("/pro/activate")
def activate(body: ActivateRequest):
    """Activate the Pro tier by writing pro.json.

    Users should only call this after donating $2+ on Patreon.
    Honour-system: the server writes the file locally; no remote
    verification is performed.
    """
    activate_pro(body.name, body.email)
    return pro_info()


@router.delete("/pro/activate")
def deactivate():
    """Remove pro.json and revert to the free tier."""
    deactivate_pro()
    return pro_info()
