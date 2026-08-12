@echo off
REM SCI OS ×10.exe — canonical cascade
REM Bootstrap Kernel → Normal Startup → Startup Recovery Pack → Meta-Recovery → Proof → Verdict
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo [Bootstrap Kernel] Node.js 20+ is required — https://nodejs.org
  pause
  exit /b 3
)
echo SCI OS x10 — cascade start
node "installer\scripts\sci-os-x10-launcher.cjs"
set EXITCODE=%ERRORLEVEL%
if %EXITCODE% EQU 0 (
  echo.
  echo Final: READY or DEGRADED — starting supervised services...
  start "SCI OS x10" cmd /c "node installer\scripts\start-sci-os.cjs --mode=normal --serve"
)
if %EXITCODE% EQU 3 (
  echo Final: EXTERNAL BLOCKER — see diagnostics-export\sci-os-x10-cascade-report.json
)
if %EXITCODE% EQU 2 (
  echo Final: SYSTEM NO_GO — see diagnostics-export and support bundle
)
pause
exit /b %EXITCODE%
