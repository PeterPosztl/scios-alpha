@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required.
  pause
  exit /b 1
)
node "installer\scripts\start-sci-os.cjs" --mode=safe --no-open
pause
