@echo off
REM SCI OS ×10 — one-click cascade (single orchestrator, no parallel second start)
REM Cascade already runs Normal Startup. Do NOT spawn another start-sci-os.
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
    echo [Bootstrap Kernel] Node.js 20.18.x required — or use packaged install with bundled runtime.
    pause
    exit /b 3
  )
  set "NODE_BIN=node"
  set "SCIOS_RUNTIME_MODE=DEVELOPMENT"
)
echo SCI OS x10 — cascade start
"%NODE_BIN%" "installer\scripts\sci-os-x10-launcher.cjs"
set EXITCODE=%ERRORLEVEL%
if %EXITCODE% EQU 0 (
  echo.
  echo Final: READY or DEGRADED — see diagnostics-export\sci-os-x10-cascade-report.json
  echo One-click supervise: pnpm sci:start   ^(do not double-start from this bat^)
)
if %EXITCODE% EQU 3 (
  echo Final: EXTERNAL BLOCKER — see diagnostics-export\sci-os-x10-cascade-report.json
)
if %EXITCODE% EQU 2 (
  echo Final: SYSTEM NO_GO — see diagnostics-export and support bundle
)
pause
exit /b %EXITCODE%
