@echo off
REM SCI OS ×10 — Meta-Recovery
REM PACKAGED: bundled Node → recovery\server.cjs (no pnpm/tsx/source)
REM DEVELOPMENT: may use pnpm
cd /d "%~dp0"
set "SCIOS_APP_ROOT=%~dp0"
set "NODE_BIN="
if exist "%~dp0runtime\node\node.exe" (
  set "NODE_BIN=%~dp0runtime\node\node.exe"
  set "SCIOS_RUNTIME_MODE=PACKAGED"
  set "SCIOS_PACKAGED=1"
  echo SCI OS x10 — Meta-Recovery ^(bundled Node^)
  "%NODE_BIN%" "installer\scripts\repair-sci-os.cjs"
  set EXITCODE=%ERRORLEVEL%
  if %EXITCODE% NEQ 0 (
    echo Repair failed. See diagnostics-export\
    pause
    exit /b %EXITCODE%
  )
  if exist "%~dp0recovery\server.cjs" (
    start "" "%NODE_BIN%" "%~dp0recovery\server.cjs"
  ) else (
    echo RECOVERY_ARTIFACT_MISSING: recovery\server.cjs
    echo Packaged recovery requires rebuild ^(pnpm package:dist^).
    pause
    exit /b 2
  )
  pause
  exit /b 0
)
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20.18.x is required.
  pause
  exit /b 1
)
where pnpm >nul 2>&1
if errorlevel 1 (
  echo [DEVELOPMENT] pnpm is required. Enable via: corepack enable
  pause
  exit /b 1
)
echo SCI OS x10 — Meta-Recovery Engine ^(DEVELOPMENT^)
pnpm sci:meta-recovery
set EXITCODE=%ERRORLEVEL%
if %EXITCODE% EQU 0 (
  echo Opening Recovery Shell...
  start "" cmd /c "pnpm sci:recovery-shell"
)
pause
exit /b %EXITCODE%
