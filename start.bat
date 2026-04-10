@echo off
REM start.bat — OpenClaw PC server quick-start (Windows)
REM
REM Creates a Python virtual environment on first run, installs dependencies,
REM then launches the server.  Pass any flags directly:
REM
REM   start.bat                        (default: 0.0.0.0:8080, auto-detect backend)
REM   start.bat --backend ollama       (force Ollama)
REM   start.bat --port 9090 --tray     (custom port + system tray icon)
REM   start.bat --token mysecret       (enable LAN auth token)

setlocal enabledelayedexpansion

cd /d "%~dp0server"

set VENV_DIR=.venv

REM ── Python check ──────────────────────────────────────────────────────────
where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found.  Install it from https://python.org then retry.
    echo        Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

python -c "import sys; exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.10 or later is required.
    echo        Download it from https://python.org
    pause
    exit /b 1
)

REM ── Virtual environment ───────────────────────────────────────────────────
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo [openclaw] Creating virtual environment...
    python -m venv %VENV_DIR%
)

call %VENV_DIR%\Scripts\activate.bat

REM ── Install / upgrade dependencies ────────────────────────────────────────
echo [openclaw] Checking dependencies...
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

REM ── Launch ────────────────────────────────────────────────────────────────
echo [openclaw] Starting server...
echo [openclaw] Open http://localhost:8080 in your browser to use the web UI.
echo.
python main.py %*
