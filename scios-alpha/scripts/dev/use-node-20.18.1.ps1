# SCI OS ×10 — use bundled Node 20.18.1 for this shell only
# Usage (from any directory):
#   . "$env:LOCALAPPDATA\SCI OS X10\tools\use-node-20.18.1.ps1"
# Or from scios-alpha:
#   . .\scripts\dev\use-node-20.18.1.ps1

$bundled = Join-Path $env:LOCALAPPDATA "SCI OS X10\runtime\node"
$exe = Join-Path $bundled "node.exe"
if (-not (Test-Path $exe)) {
  Write-Error "Bundled Node missing: $exe"
  return
}
$env:PATH = "$bundled;$env:PATH"
Write-Host "node => $(node -v) @ $((Get-Command node).Source)"
Write-Host "Session-only PATH prepend. Close the shell to revert."
