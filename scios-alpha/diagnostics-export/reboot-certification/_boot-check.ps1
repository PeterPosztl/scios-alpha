
$os = Get-CimInstance Win32_OperatingSystem
Write-Output ("BOOT|" + $os.LastBootUpTime.ToString("o") + "|" + $os.LastBootUpTime.ToFileTimeUtc())
Write-Output ("NOW|" + (Get-Date).ToString("o"))
Write-Output ("UPMIN|" + [int]((Get-Date) - $os.LastBootUpTime).TotalMinutes)
Get-WinEvent -FilterHashtable @{LogName='System'; Id=12; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 5 -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("EVT12|" + $_.TimeCreated.ToString("o")) }
Get-WinEvent -FilterHashtable @{LogName='System'; Id=6005; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 5 -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("EVT6005|" + $_.TimeCreated.ToString("o")) }
