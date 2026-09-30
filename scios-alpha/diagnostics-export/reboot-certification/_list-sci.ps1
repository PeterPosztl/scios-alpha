$procs = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and ($_.CommandLine -match 'scios-alpha|SCI OS X10|start-sci-os|control-plane-api|cockpit-ui|bootstrap-capsule')
}
foreach ($p in $procs) {
  Write-Output ($p.ProcessId.ToString() + '|' + $p.Name + '|' + $p.CommandLine)
}