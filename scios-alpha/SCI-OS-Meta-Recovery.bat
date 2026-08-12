@echo off
REM SCI OS ×10 — Meta-Recovery entry (automatic after failed normal start)
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node 20+ from https://nodejs.org
  pause
  exit /b 1
)
where pnpm >nul 2>&1
if errorlevel 1 (
  echo pnpm is required. Enable via: corepack enable
  pause
  exit /b 1
)
echo SCI OS x10 — Meta-Recovery Engine
pnpm sci:meta-recovery
set EXITCODE=%ERRORLEVEL%
if %EXITCODE% EQU 0 (
  echo Opening Recovery Shell...
  start "" cmd /c "pnpm sci:recovery-shell"
)
pause
exit /b %EXITCODE%
