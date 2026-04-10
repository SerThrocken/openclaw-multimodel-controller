"""
System tray icon for the OpenClaw server.

Provides a minimal GUI so users can see the server status and switch
backends without opening a terminal.  Requires pystray and Pillow.

Usage (called from main.py when --tray flag is passed):
    from ui.tray import run_tray
    run_tray(server_thread)
"""

from __future__ import annotations

import threading
from typing import Callable

try:
    import pystray
    from PIL import Image, ImageDraw

    _TRAY_AVAILABLE = True
except ImportError:
    _TRAY_AVAILABLE = False


def _make_icon(color: str = "#4A90D9") -> "Image.Image":
    """Draw a simple coloured circle as the tray icon."""
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, size - 4, size - 4], fill=color)
    return img


def run_tray(on_quit: Callable[[], None]) -> None:
    """
    Start the system tray icon.  Blocks the calling thread.

    Parameters
    ----------
    on_quit:
        Callback invoked when the user chooses Quit from the tray menu.
    """
    if not _TRAY_AVAILABLE:
        print("[tray] pystray / Pillow not installed — tray icon disabled.")
        return

    from config import BackendType, config

    def _switch_backend(backend: BackendType):
        def _handler(icon, item):
            config.backend = backend
            config.save()
            icon.notify(f"Backend switched to {backend.value}", "OpenClaw")
        return _handler

    def _quit(icon, item):
        icon.stop()
        on_quit()

    menu = pystray.Menu(
        pystray.MenuItem("OpenClaw Server — running", lambda *_: None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Use LM Studio", _switch_backend(BackendType.lmstudio)),
        pystray.MenuItem("Use Ollama", _switch_backend(BackendType.ollama)),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit", _quit),
    )

    icon = pystray.Icon(
        name="openclaw",
        icon=_make_icon(),
        title="OpenClaw",
        menu=menu,
    )
    icon.run()
