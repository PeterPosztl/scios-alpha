#!/usr/bin/env node
"use strict";
/**
 * Install quiescence gate — SCI-owned process release before atomic swap.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpGet(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve({ status: res.statusCode || 0 });
    });
    req.on("error", () => resolve({ status: 0 }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0 });
    });
  });
}

function listSciOwnedLocalAppProcesses(installDir) {
  if (process.platform !== "win32") return [];
  const ps = `
$root = '${installDir.replace(/'/g, "''")}'
$node = Join-Path $root 'runtime\\node\\node.exe'
Get-CimInstance Win32_Process |
  Where-Object {
    ($_.ExecutablePath -and (
      $_.ExecutablePath.StartsWith($root) -or
      $_.ExecutablePath -ieq $node
    )) -or
    ($_.CommandLine -and (
      $_.CommandLine -like "*$root*" -or
      $_.CommandLine -like "*SCI OS X10\\app\\*" -or
      $_.CommandLine -like "*SCI OS X10/app/*"
    ))
  } |
  Where-Object {
    $_.Name -ne 'powershell.exe' -and $_.Name -ne 'pwsh.exe' -and
    $_.ProcessId -ne ${process.pid}
  } |
  Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine |
  ConvertTo-Json -Compress
`;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.status !== 0 || !r.stdout?.trim()) return [];
  try {
    const parsed = JSON.parse(r.stdout);
    return (Array.isArray(parsed) ? parsed : [parsed]).map((p) => ({
      pid: p.ProcessId,
      parentPid: p.ParentProcessId,
      executable: p.ExecutablePath || "",
      commandLine: (p.CommandLine || "").slice(0, 500),
      sciOwned: true,
    }));
  } catch {
    return [];
  }
}

function classifySciProcess(p) {
  const cmd = p.commandLine || "";
  if (cmd.includes("recovery\\server.cjs") || cmd.includes("recovery/server.cjs"))
    return "recovery-server";
  if (cmd.includes("job-object-keeper") || cmd.includes("SCI-PROV-TEST"))
    return "orphan-debug-spawn";
  if (cmd.includes("backend\\server.cjs") || cmd.includes("control-plane"))
    return "control-plane";
  if (cmd.includes("cockpit")) return "cockpit";
  if (cmd.includes("start-sci-os")) return "orchestrator";
  return "sci-local-app-process";
}

async function stopSciOwnedProcesses(installDir, excludePid = process.pid) {
  const stopped = [];
  const skipped = [];
  const procs = listSciOwnedLocalAppProcesses(installDir);
  for (const p of procs) {
    if (p.pid === excludePid) continue;
    try {
      process.kill(p.pid, "SIGTERM");
      stopped.push({
        pid: p.pid,
        component: classifySciProcess(p),
        executable: p.executable,
      });
    } catch (e) {
      skipped.push({ pid: p.pid, reason: String(e.message || e) });
    }
  }
  return { stopped, skipped, procs };
}

async function waitPortsDown(ports, maxMs = 8000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    let allDown = true;
    for (const port of ports) {
      const r = await httpGet(`http://127.0.0.1:${port}/healthz`, 800);
      if (r.status !== 0) continue;
      allDown = false;
      break;
    }
    if (allDown) return true;
    await sleep(250);
  }
  return false;
}

async function quiesceForInstall(opts = {}) {
  const repoRoot = opts.repoRoot || path.resolve(__dirname, "../..");
  const installDir = opts.installDir;
  const productRoot = path.dirname(installDir);
  const report = {
    schema: "sci-os-install-quiescence/v1",
    at: new Date().toISOString(),
    installDir,
    attempts: [],
  };

  spawnSync(process.execPath, [path.join(repoRoot, "installer/scripts/convergence/stop.cjs")], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    timeout: 45000,
  });

  const delays = [500, 1000, 1500, 2000, 2500];
  for (let i = 0; i < delays.length; i++) {
    const stopResult = await stopSciOwnedProcesses(installDir);
    await sleep(delays[i]);
    const portsDown = await waitPortsDown([3000, 4000], 3000);
    const remaining = listSciOwnedLocalAppProcesses(installDir).filter(
      (p) => p.pid !== process.pid
    );
    report.attempts.push({
      attempt: i + 1,
      delayMs: delays[i],
      stopped: stopResult.stopped,
      skipped: stopResult.skipped,
      portsDown,
      remainingPids: remaining.map((p) => ({
        pid: p.pid,
        component: classifySciProcess(p),
      })),
    });
    if (remaining.length === 0) {
      report.ok = true;
      report.quiescent = true;
      return report;
    }
  }

  const finalRemaining = listSciOwnedLocalAppProcesses(installDir).filter(
    (p) => p.pid !== process.pid
  );
  report.ok = finalRemaining.length === 0;
  report.quiescent = report.ok;
  report.remaining = finalRemaining.map((p) => ({
    pid: p.pid,
    component: classifySciProcess(p),
    commandLine: p.commandLine,
  }));
  return report;
}

function renameWithRetry(src, dest, opts = {}) {
  const maxAttempts = opts.maxAttempts || 5;
  const delays = opts.delays || [300, 600, 1200, 2000, 3000];
  const attempts = [];
  for (let i = 0; i < maxAttempts; i++) {
    try {
      if (fs.existsSync(dest) && opts.removeDestFirst) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      fs.renameSync(src, dest);
      attempts.push({ attempt: i + 1, ok: true, delayMs: i > 0 ? delays[i - 1] : 0 });
      return { ok: true, attempts };
    } catch (e) {
      const code = e.code || "UNKNOWN";
      attempts.push({
        attempt: i + 1,
        ok: false,
        code,
        message: String(e.message || e),
        operation: "rename",
        src,
        dest,
        delayMs: delays[i] || 0,
      });
      if (i < maxAttempts - 1 && (code === "EBUSY" || code === "EPERM")) {
        spawnSync("ping", ["-n", "2", "127.0.0.1"], { shell: true, windowsHide: true });
        if (opts.installDir && opts.repoRoot) {
          spawnSync(
            process.execPath,
            [path.join(opts.repoRoot, "scripts/package/install-quiescence.cjs"), "--stop-only"],
            {
              env: { ...process.env, SCIOS_INSTALL_DIR: opts.installDir },
              encoding: "utf8",
              windowsHide: true,
              timeout: 20000,
            }
          );
        }
      } else {
        return { ok: false, attempts, error: code, detail: e };
      }
    }
  }
  return { ok: false, attempts, error: "MAX_RETRIES" };
}

async function main() {
  if (process.argv.includes("--stop-only")) {
    const installDir =
      process.env.SCIOS_INSTALL_DIR ||
      path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
    const r = await stopSciOwnedProcesses(installDir);
    console.log(JSON.stringify(r));
    process.exit(0);
  }
  const installDir =
    process.env.SCIOS_INSTALL_DIR ||
    path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
  const r = await quiesceForInstall({ installDir });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.quiescent ? 0 : 2);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  quiesceForInstall,
  renameWithRetry,
  listSciOwnedLocalAppProcesses,
  stopSciOwnedProcesses,
  classifySciProcess,
};
