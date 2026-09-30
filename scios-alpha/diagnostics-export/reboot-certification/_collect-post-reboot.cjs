"use strict";
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const OUT = path.join(__dirname);
const STAGE = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const DIST = path.join(__dirname, "../../dist/SCI-OS-X10");
const REPO_OUT = path.join(__dirname);

function read(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

const ps = `
$os = Get-CimInstance Win32_OperatingSystem
Write-Output ("BOOT|" + $os.LastBootUpTime.ToString("o") + "|" + $os.LastBootUpTime.ToFileTimeUtc())
Write-Output ("NOW|" + (Get-Date).ToString("o"))
Write-Output ("UPMIN|" + [int]((Get-Date) - $os.LastBootUpTime).TotalMinutes)
Get-WinEvent -FilterHashtable @{LogName='System'; Id=12; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 5 -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("EVT12|" + $_.TimeCreated.ToString("o")) }
Get-WinEvent -FilterHashtable @{LogName='System'; Id=6005; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 5 -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("EVT6005|" + $_.TimeCreated.ToString("o")) }
`;
const psPath = path.join(OUT, "_boot-check.ps1");
fs.writeFileSync(psPath, ps);
const bootOut = spawnSync("powershell", ["-NoProfile", "-File", psPath], {
  encoding: "utf8",
}).stdout;

const stagedReport = read(path.join(STAGE, "diagnostics-export/startup-report.json"));
const distReport = read(path.join(DIST, "diagnostics-export/startup-report.json"));
const stagedShutdown = read(path.join(STAGE, "diagnostics-export/shutdown-report.json"));
const distShutdown = read(path.join(DIST, "diagnostics-export/shutdown-report.json"));
const pre = read(path.join(OUT, "00-pre-reboot-state.json"));

console.log(
  JSON.stringify(
    {
      bootOut: String(bootOut || "").trim().split(/\r?\n/),
      preBoot: pre?.windowsBootIdentityBefore || null,
      staged: stagedReport
        ? {
            at: stagedReport.timestamp,
            verdict: stagedReport.verdict,
            appRoot: stagedReport.appRoot,
            node: stagedReport.node,
            desktop: stagedReport.desktop,
          }
        : null,
      dist: distReport
        ? {
            at: distReport.timestamp,
            verdict: distReport.verdict,
            appRoot: distReport.appRoot,
            node: distReport.node,
            desktop: distReport.desktop,
          }
        : null,
      stagedShutdownAt: stagedShutdown?.at || null,
      distShutdownAt: distShutdown?.at || null,
    },
    null,
    2
  )
);
