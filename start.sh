#!/usr/bin/env bash
# start.sh — OpenClaw PC server quick-start (Linux / macOS)
#
# Creates a Python virtual environment on first run, installs dependencies,
# then launches the server.  All flags are forwarded to main.py.
#
# Examples:
#   ./start.sh                           # default: 0.0.0.0:8080, auto-detect backend
#   ./start.sh --backend ollama          # force Ollama
#   ./start.sh --port 9090 --tray        # custom port + system tray icon
#   ./start.sh --token mysecret          # enable LAN auth token

set -euo pipefail
cd "$(dirname "$0")/server"

PYTHON=${PYTHON:-python3}
VENV_DIR=".venv"

# ── Python check ────────────────────────────────────────────────────────────
if ! command -v "$PYTHON" &>/dev/null; then
  echo "ERROR: Python 3 not found.  Install it from https://python.org then retry."
  exit 1
fi

PY_VERSION=$("$PYTHON" -c 'import sys; print(sys.version_info.major, sys.version_info.minor)')
read -r PY_MAJOR PY_MINOR <<< "$PY_VERSION"
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]; }; then
  echo "ERROR: Python 3.10 or later is required (found $PY_MAJOR.$PY_MINOR)."
  exit 1
fi

# ── Virtual environment ─────────────────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo "[openclaw] Creating virtual environment…"
  "$PYTHON" -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# ── Install / upgrade dependencies ─────────────────────────────────────────
echo "[openclaw] Checking dependencies…"
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# ── Launch ──────────────────────────────────────────────────────────────────
echo "[openclaw] Starting server…"
echo "[openclaw] Open http://localhost:8080 in your browser to use the web UI."
echo ""
exec python main.py "$@"
