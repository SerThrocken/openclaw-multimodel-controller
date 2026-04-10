"""
/conversations  — save and retrieve chat conversations locally.

Conversations are stored in server/conversations.json on the user's PC.
This file is gitignored (like config.json) so saved chats are never
committed to the repository.

All write operations use an atomic temp-file + rename pattern and set
0600 permissions on Unix so other users on the machine cannot read the
saved conversations.

Free-tier cap
─────────────
Non-Pro users may save at most FREE_CONVERSATION_LIMIT conversations.
Attempting to exceed the limit returns HTTP 403 with a message that
links to the Pro upgrade path.  Archiving old chats always works (it
frees space) and is available to all users.

Pro-only endpoints
──────────────────
GET  /conversations/export   — download ALL conversations as a .zip
GET  /conversations/search   — full-text search across saved chats
GET  /conversations/stats    — usage statistics / dashboard data
"""

from __future__ import annotations

import io
import json
import os
import stat
import tempfile
import uuid
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from pro import FREE_CONVERSATION_LIMIT, is_pro

CONVERSATIONS_PATH = Path(__file__).parent.parent / "conversations.json"

router = APIRouter()


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: object  # str for plain text; list for multimodal (vision)


class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "Untitled"
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    backend: Optional[str] = None
    model:   Optional[str] = None
    messages: list[ChatMessage] = Field(default_factory=list)


class ArchiveRequest(BaseModel):
    ids: list[str] = Field(default_factory=list)  # empty = archive ALL


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------

def _load_all() -> list[dict]:
    if not CONVERSATIONS_PATH.exists():
        return []
    try:
        data = json.loads(CONVERSATIONS_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_all(conversations: list[dict]) -> None:
    """Persist conversations atomically with owner-only permissions."""
    tmp_dir = CONVERSATIONS_PATH.parent
    try:
        fd, tmp_path = tempfile.mkstemp(dir=tmp_dir, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(conversations, f, indent=2, ensure_ascii=False)
            try:
                os.chmod(tmp_path, stat.S_IRUSR | stat.S_IWUSR)  # 0o600
            except Exception:
                pass  # Non-POSIX filesystem — skip
            Path(tmp_path).replace(CONVERSATIONS_PATH)
        except Exception:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
            raise
    except Exception:
        # Fall back to simple write if atomic write fails
        CONVERSATIONS_PATH.write_text(
            json.dumps(conversations, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )


def _summary(c: dict) -> dict:
    return {
        "id":            c.get("id"),
        "title":         c.get("title", "Untitled"),
        "created_at":    c.get("created_at"),
        "updated_at":    c.get("updated_at"),
        "backend":       c.get("backend"),
        "model":         c.get("model"),
        "message_count": len(c.get("messages", [])),
    }


def _build_zip(conversations: list[dict]) -> bytes:
    """Build an in-memory zip containing each conversation as a JSON file."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for c in conversations:
            cid   = c.get("id", "unknown")
            title = c.get("title", "untitled")[:40].replace("/", "_").replace("\\", "_")
            fname = f"{cid[:8]}-{title}.json"
            zf.writestr(fname, json.dumps(c, indent=2, ensure_ascii=False))
    buf.seek(0)
    return buf.read()


# ---------------------------------------------------------------------------
# Routes — fixed paths MUST be declared before parameterised ones
# ---------------------------------------------------------------------------

@router.get("/conversations")
def list_conversations():
    """Return all saved conversations as lightweight summaries (no messages)."""
    conversations = _load_all()
    summaries = [_summary(c) for c in conversations]
    summaries.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
    return summaries


@router.get("/conversations/stats")
def get_stats():
    """Return usage statistics for the dashboard.  Pro only."""
    if not is_pro():
        raise HTTPException(
            status_code=403,
            detail="Pro feature — unlock at patreon.com/TLG3D",
        )
    conversations = _load_all()
    total_msgs = sum(len(c.get("messages", [])) for c in conversations)
    models:      Counter = Counter()
    backends:    Counter = Counter()
    msg_per_day: Counter = Counter()
    now = datetime.now(timezone.utc)

    for c in conversations:
        if c.get("model"):
            models[c["model"]] += 1
        if c.get("backend"):
            backends[c["backend"]] += 1
        updated = c.get("updated_at", "")
        if updated:
            try:
                dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                if (now - dt).days <= 30:
                    msg_per_day[dt.strftime("%Y-%m-%d")] += len(c.get("messages", []))
            except Exception:
                pass

    return {
        "total_conversations": len(conversations),
        "total_messages":      total_msgs,
        "top_models":          models.most_common(5),
        "top_backends":        backends.most_common(5),
        "messages_per_day":    dict(sorted(msg_per_day.items())),
    }


@router.get("/conversations/search")
def search_conversations(q: str = ""):
    """Full-text search across saved conversations.  Pro only."""
    if not is_pro():
        raise HTTPException(
            status_code=403,
            detail="Pro feature — unlock at patreon.com/TLG3D",
        )
    q_lower = q.lower().strip()
    if not q_lower:
        return []
    results = []
    for c in _load_all():
        if q_lower in c.get("title", "").lower():
            results.append(_summary(c))
            continue
        for m in c.get("messages", []):
            raw = m.get("content", "")
            text = raw if isinstance(raw, str) else " ".join(
                p.get("text", "") for p in raw if isinstance(p, dict) and p.get("type") == "text"
            )
            if q_lower in text.lower():
                results.append(_summary(c))
                break
    results.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
    return results


@router.get("/conversations/export")
def export_conversations():
    """Download all conversations as a zip archive.  Pro only, non-destructive."""
    if not is_pro():
        raise HTTPException(
            status_code=403,
            detail="Pro feature — unlock at patreon.com/TLG3D",
        )
    conversations = _load_all()
    if not conversations:
        raise HTTPException(status_code=404, detail="No conversations to export")
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return Response(
        content=_build_zip(conversations),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="openclaw-export-{ts}.zip"'
        },
    )


@router.post("/conversations/archive")
def archive_conversations(body: ArchiveRequest):
    """Zip selected (or all) conversations and remove them from active storage.

    Frees up space on the device.  Available to all users (free + Pro).
    """
    conversations = _load_all()
    ids_set = set(body.ids) if body.ids else None
    to_archive = (
        conversations if ids_set is None
        else [c for c in conversations if c.get("id") in ids_set]
    )
    if not to_archive:
        raise HTTPException(status_code=404, detail="No matching conversations to archive")

    archived_ids = {c.get("id") for c in to_archive}
    remaining = [c for c in conversations if c.get("id") not in archived_ids]
    _save_all(remaining)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return Response(
        content=_build_zip(to_archive),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="openclaw-archive-{ts}.zip"'
        },
    )


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str):
    """Return a single conversation including all messages."""
    for c in _load_all():
        if c.get("id") == conversation_id:
            return c
    raise HTTPException(status_code=404, detail="Conversation not found")


@router.post("/conversations", status_code=201)
def save_conversation(body: Conversation):
    """Save a new conversation or overwrite an existing one with the same id."""
    conversations = _load_all()
    data = body.model_dump()
    for i, c in enumerate(conversations):
        if c.get("id") == body.id:
            # Update in place, refresh updated_at
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            conversations[i] = data
            _save_all(conversations)
            return data

    # New conversation — enforce free-tier limit
    if not is_pro() and len(conversations) >= FREE_CONVERSATION_LIMIT:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Free tier limit reached ({FREE_CONVERSATION_LIMIT} conversations). "
                "Archive old chats to free up space, or unlock unlimited with OpenClaw Pro."
            ),
        )
    conversations.append(data)
    _save_all(conversations)
    return data


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: str):
    """Permanently delete a saved conversation."""
    conversations = _load_all()
    updated = [c for c in conversations if c.get("id") != conversation_id]
    if len(updated) == len(conversations):
        raise HTTPException(status_code=404, detail="Conversation not found")
    _save_all(updated)

