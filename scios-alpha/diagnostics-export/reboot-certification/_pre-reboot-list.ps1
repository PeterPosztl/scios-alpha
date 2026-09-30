$procs = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and (
    $_.CommandLine -match 'start-sci-os\.cjs' -or
    $_.CommandLine -match 'bootstrap-capsule\.cjs' -or
    $_.CommandLine -match 'control-plane-api' -or
    $_.CommandLine -match 'cockpit-ui' -or
    $_.CommandLine -match 'SCI OS X10\\app\\runtime\\node\\node\.exe'
  ) -and ($_.CommandLine -notmatch 'reboot-cert|final-reboot-prep|prove-reboot')
}
foreach ($p in $procs) { Write-Output ($p.ProcessId.ToString() + '|' + $p.Name) }