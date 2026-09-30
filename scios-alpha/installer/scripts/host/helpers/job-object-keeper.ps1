# SCI OS ×10 — Job Object keeper (Windows). Holds handle until stdin closes.
# ALPHA_NON_PRODUCTION. No admin required. KILL_ON_JOB_CLOSE on exit.
param(
  [Parameter(Mandatory = $true)][string]$JobName,
  [Parameter(Mandatory = $false)][string]$MarkerPath
)

$ErrorActionPreference = "Stop"

function Write-Marker([string]$Line) {
  if ($MarkerPath) {
    Add-Content -Path $MarkerPath -Value $Line -Encoding UTF8
  }
  Write-Output $Line
  try { [Console]::Out.Flush() } catch {}
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class SciJob {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool SetInformationJobObject(IntPtr hJob, int infoClass, IntPtr lpInfo, uint cb);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool TerminateJobObject(IntPtr hJob, uint uExitCode);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool CloseHandle(IntPtr hObject);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);
  public const int JobObjectExtendedLimitInformation = 9;
  public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
  public const uint PROCESS_SET_QUOTA = 0x0100;
  public const uint PROCESS_TERMINATE = 0x0001;
  [StructLayout(LayoutKind.Sequential)]
  public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
    public long PerProcessUserTimeLimit;
    public long PerJobUserTimeLimit;
    public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize;
    public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit;
    public UIntPtr Affinity;
    public uint PriorityClass;
    public uint SchedulingClass;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct IO_COUNTERS {
    public ulong ReadOperationCount;
    public ulong WriteOperationCount;
    public ulong OtherOperationCount;
    public ulong ReadTransferCount;
    public ulong WriteTransferCount;
    public ulong OtherTransferCount;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
    public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit;
    public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryUsed;
    public UIntPtr PeakJobMemoryUsed;
  }
  public static bool EnableKillOnClose(IntPtr job) {
    var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
    info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    int size = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
    IntPtr ptr = Marshal.AllocHGlobal(size);
    try {
      Marshal.StructureToPtr(info, ptr, false);
      return SetInformationJobObject(job, JobObjectExtendedLimitInformation, ptr, (uint)size);
    } finally {
      Marshal.FreeHGlobal(ptr);
    }
  }
}
"@

$job = [SciJob]::CreateJobObject([IntPtr]::Zero, $JobName)
if ($job -eq [IntPtr]::Zero) {
  Write-Marker ("ERR CREATE " + [Runtime.InteropServices.Marshal]::GetLastWin32Error())
  exit 2
}
if (-not [SciJob]::EnableKillOnClose($job)) {
  Write-Marker ("ERR LIMIT " + [Runtime.InteropServices.Marshal]::GetLastWin32Error())
  exit 2
}
Write-Marker ("OK CREATED " + $JobName)

function Assign-Pid([int]$ProcId) {
  $h = [SciJob]::OpenProcess(([SciJob]::PROCESS_SET_QUOTA -bor [SciJob]::PROCESS_TERMINATE), $false, $ProcId)
  if ($h -eq [IntPtr]::Zero) {
    Write-Marker ("ERR OPENPID " + $ProcId + " " + [Runtime.InteropServices.Marshal]::GetLastWin32Error())
    return
  }
  try {
    if ([SciJob]::AssignProcessToJobObject($job, $h)) {
      Write-Marker ("OK ASSIGN " + $ProcId)
    } else {
      Write-Marker ("ERR ASSIGN " + $ProcId + " " + [Runtime.InteropServices.Marshal]::GetLastWin32Error())
    }
  } finally {
    [SciJob]::CloseHandle($h) | Out-Null
  }
}

try {
  while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    $line = $line.Trim()
    if (-not $line) { continue }
    if ($line -eq "QUIT") { break }
    if ($line -eq "TERMINATE") {
      [SciJob]::TerminateJobObject($job, 1) | Out-Null
      Write-Marker "OK TERMINATE"
      break
    }
    if ($line.StartsWith("ASSIGN ")) {
      $pidStr = $line.Substring(7).Trim()
      [int]$p = 0
      if ([int]::TryParse($pidStr, [ref]$p)) { Assign-Pid $p }
    }
  }
} finally {
  [SciJob]::CloseHandle($job) | Out-Null
}
exit 0
