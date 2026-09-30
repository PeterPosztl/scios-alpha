@echo off
REM SCI OS ×10 — Safe Mode (prefers bundled Node when present)
cd /d "%~dp0"
set "SCIOS_APP_ROOT=%~dp0"
set "NODE_BIN="
if exist "%~dp0runtime\node\node.exe" (
  set "NODE_BIN=%~dp0runtime\node\node.exe"
  set "SCIOS_RUNTIME_MODE=PACKAGED"
  set "SCIOS_PACKAGED=1"
)
if not defined NODE_BIN (
  where node >nul 2>&1
  if errorlevel 1 (
    echo Bundled or system Node.js required ^(20.18.x^).
    pause
    exit /b 1
  )
  set "NODE_BIN=node"
  set "SCIOS_RUNTIME_MODE=DEVELOPMENT"
)
"%NODE_BIN%" "installer\scripts\start-sci-os.cjs" --mode=safe --no-open
pause
