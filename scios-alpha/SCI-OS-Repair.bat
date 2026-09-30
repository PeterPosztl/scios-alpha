@echo off
REM SCI OS ×10 — Repair (prefers bundled Node when present; no Cursor required)
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
"%NODE_BIN%" "installer\scripts\repair-sci-os.cjs"
set "REPAIR_EXIT=%ERRORLEVEL%"
if not "%REPAIR_EXIT%"=="0" (
  echo.
  echo Repair FAILED ^(exit %REPAIR_EXIT%^). Diagnostics preserved under diagnostics-export\
  echo SCI OS will NOT start after a failed repair.
  pause
  exit /b %REPAIR_EXIT%
)
echo.
echo Repair passed. Starting SCI OS in repair mode...
"%NODE_BIN%" "installer\scripts\start-sci-os.cjs" --mode=repair --serve
set "START_EXIT=%ERRORLEVEL%"
if not "%START_EXIT%"=="0" (
  echo Startup after repair failed ^(exit %START_EXIT%^).
  pause
  exit /b %START_EXIT%
)
pause
exit /b 0
