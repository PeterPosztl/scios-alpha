@echo off
REM SCI OS ×10 — Normal Start (DEVELOPMENT profile)
REM Canonical: Bootstrap Capsule → start-sci-os.cjs (same orchestrator as PACKAGED)
REM System Node allowed only in DEVELOPMENT. PACKAGED forbids system Node fallback.
cd /d "%~dp0"
set "SCIOS_APP_ROOT=%~dp0"
set "SCIOS_RUNTIME_MODE=DEVELOPMENT"
set "NODE_BIN="
if exist "%~dp0runtime\node\node.exe" set "NODE_BIN=%~dp0runtime\node\node.exe"
if not defined NODE_BIN (
  where node >nul 2>&1
  if errorlevel 1 (
    echo [DEVELOPMENT] Node.js matching package.json engines is required.
    echo Install Node 20.18.x LTS ^(engines: ^>=20.18.0 ^<21^) or use a packaged install with bundled 20.18.1.
    pause
    exit /b 1
  )
  set "NODE_BIN=node"
)
"%NODE_BIN%" "installer\scripts\bootstrap-capsule.cjs" --serve
set EXITCODE=%ERRORLEVEL%
echo.
echo User Shell: http://127.0.0.1:4000/   ^(not Control Plane :3000^)
pause
exit /b %EXITCODE%
