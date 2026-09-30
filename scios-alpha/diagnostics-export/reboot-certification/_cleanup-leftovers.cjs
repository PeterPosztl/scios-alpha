"use strict";
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname);
fs.mkdirSync(outDir, { recursive: true });
const ps1 = path.join(outDir, "_list-sci.ps1");
fs.writeFileSync(
  ps1,
  [
    "$procs = Get-CimInstance Win32_Process | Where-Object {",
    "  $_.CommandLine -and ($_.CommandLine -match 'scios-alpha|SCI OS X10|start-sci-os|control-plane-api|cockpit-ui|bootstrap-capsule')",
    "}",
    "foreach ($p in $procs) {",
    "  Write-Output ($p.ProcessId.ToString() + '|' + $p.Name + '|' + $p.CommandLine)",
    "}",
  ].join("\n")
);

const listed = spawnSync(
  "powershell",
  ["-NoProfile", "-File", ps1],
  { encoding: "utf8" }
);
const lines = String(listed.stdout || "")
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);
console.log(JSON.stringify({ count: lines.length, lines }, null, 2));

let net = "";
try {
  net = execSync("netstat -ano", { encoding: "utf8" });
} catch {
  net = "";
}
const ports = net
  .split(/\r?\n/)
  .filter((l) => /:3000|:4000/.test(l) && /LISTENING/.test(l));
console.log(JSON.stringify({ listening: ports }, null, 2));

// Force-stop leftover pids from our list
for (const line of lines) {
  const pid = Number(line.split("|")[0]);
  if (!Number.isFinite(pid)) continue;
  try {
    process.kill(pid, "SIGTERM");
    console.log("killed", pid);
  } catch (e) {
    console.log("kill_fail", pid, String(e.message || e));
  }
}
