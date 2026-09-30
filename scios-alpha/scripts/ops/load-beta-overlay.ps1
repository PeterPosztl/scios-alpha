# SCI OS x10 - load B-axis overlay into *this shell only*.
# Does not rewrite the A2-clean packaged.json.
#
# ASCII-only on purpose: Windows PowerShell 5.1 reads .ps1 as ANSI when there is
# no BOM, so non-ASCII punctuation breaks parsing.
#
# Usage (after B1 Docker READY + compose up):
#   . .\scripts\ops\load-beta-overlay.ps1

$ErrorActionPreference = "Stop"
$overlayPath = Join-Path $PSScriptRoot "..\..\config\packaged.beta.overlay.json" | Resolve-Path
$raw = [System.IO.File]::ReadAllText($overlayPath)
$j = $raw | ConvertFrom-Json
$local = $env:LOCALAPPDATA

foreach ($p in $j.env.PSObject.Properties) {
  $v = [string]$p.Value
  if ($v -match '^REPLACE_WITH_') {
    Write-Host "SKIP $($p.Name) (placeholder - set manually for B3)"
    continue
  }
  $v = $v.Replace('${LOCALAPPDATA}', $local).Replace('%LOCALAPPDATA%', $local)
  # Normalize Windows path separators for cert paths
  if ($p.Name -match 'CERT|KEY|PATH' -and $v -match 'SCI OS X10') {
    $v = $v -replace '/', '\'
  }
  Set-Item -Path "Env:$($p.Name)" -Value $v
  if ($p.Name -match 'SECRET|PASSWORD') {
    Write-Host "SET $($p.Name)=***"
  } else {
    Write-Host "SET $($p.Name)=$v"
  }
}

Write-Host ""
Write-Host "B overlay loaded into session. A2-clean packaged.json untouched."
Write-Host "Verify: docker compose -p $($j.composeProject) -f $($j.compose) ps"
