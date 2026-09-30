# Reboot-detector audit — independent Windows sources
$ErrorActionPreference = 'Continue'
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
Write-Output "=== Win32_OperatingSystem ==="
Write-Output ("LastBootUpTime=" + $os.LastBootUpTime.ToString('o'))
Write-Output ("FileTimeUtc=" + $os.LastBootUpTime.ToFileTimeUtc())
Write-Output ("LocalDateTime=" + $os.LocalDateTime.ToString('o'))
Write-Output ("UptimeMin=" + [int]((Get-Date) - $os.LastBootUpTime).TotalMinutes)
Write-Output "=== ComputerSystem ==="
Write-Output ("BootupState=" + $cs.BootupState)
Write-Output ("ChassisBootupState=" + $cs.ChassisBootupState)
Write-Output "=== FastStartup / Hybrid ==="
$fs = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' -Name HiberbootEnabled -ErrorAction SilentlyContinue
Write-Output ("HiberbootEnabled=" + $(if ($null -ne $fs) { $fs.HiberbootEnabled } else { 'MISSING' }))
Write-Output "=== Recent System events (12,13,41,6005,6006,6008,1074) ==="
$ids = 12,13,41,6005,6006,6008,1074
Get-WinEvent -FilterHashtable @{LogName='System'; Id=$ids; StartTime=(Get-Date).AddDays(-2)} -MaxEvents 40 -ErrorAction SilentlyContinue |
  ForEach-Object {
    Write-Output ($_.TimeCreated.ToString('o') + '|Id=' + $_.Id + '|' + ($_.Message -replace '\s+',' ').Substring(0, [Math]::Min(120, ($_.Message -replace '\s+',' ').Length)))
  }
Write-Output "=== Kernel-General / Kernel-Power last boot markers ==="
Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-General'; Id=12; StartTime=(Get-Date).AddDays(-2)} -MaxEvents 5 -ErrorAction SilentlyContinue |
  ForEach-Object { Write-Output ($_.TimeCreated.ToString('o') + '|Kernel-General-12') }
