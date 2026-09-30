#!/usr/bin/env node
"use strict";

/**
 * FINAL Windows reboot certification — PREP ONLY.
 * Writes 00-pre-reboot-state.json + 01-pre-reboot-shutdown-proof.json
 * Does NOT claim post-reboot PASS. Does NOT modify product features.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync, execSync } = require("child_process");

const REPO = path.resolve(__dirname, "../..");
const OUT = path.join(REPO, "diagnostics-export", "reboot-certification");
const STAGE = path.join(
  process.env.LOCALAPPDATA || "",
  "SCI OS X10",
  "app"
);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(name, obj) {
  ensureDir(OUT);
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  return p;
}

function sha256File(abs) {
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  } catch {
    return null;
  }
}

function hashConfig() {
  const parts = [];
  for (const rel of [
    "sci-os.manifest.json",
    "installer/golden-boot.manifest.json",
    "package.json",
    path.join(STAGE, "config", "packaged.json"),
    path.join(STAGE, "SCI-OS-X10.cmd"),
  ]) {
    const abs = path.isAbsolute(rel) ? rel : path.join(REPO, rel);
    if (fs.existsSync(abs)) {
      parts.push(rel.replace(/\\/g, "/") + ":" + sha256File(abs));
    }
  }
  return crypto.createHash("sha256").update(parts.join("\n")).digest("hex");
}

function windowsBootIdentity() {
  try {
    const out = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString(\\"o\\"); (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToFileTimeUtc()"',
      { encoding: "utf8", timeout: 15000 }
    );
    const lines = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      lastBootUpTime: lines[0] || null,
      lastBootFileTimeUtc: lines[1] || null,
    };
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

function listOwned() {
  const ps1 = path.join(OUT, "_pre-reboot-list.ps1");
  ensureDir(OUT);
  fs.writeFileSync(
    ps1,
    [
      "$procs = Get-CimInstance Win32_Process | Where-Object {",
      "  $_.CommandLine -and (",
      "    $_.CommandLine -match 'start-sci-os\\.cjs' -or",
      "    $_.CommandLine -match 'bootstrap-capsule\\.cjs' -or",
      "    $_.CommandLine -match 'control-plane-api' -or",
      "    $_.CommandLine -match 'cockpit-ui' -or",
      "    $_.CommandLine -match 'SCI OS X10\\\\app\\\\runtime\\\\node\\\\node\\.exe'",
      "  ) -and ($_.CommandLine -notmatch 'reboot-cert|final-reboot-prep|prove-reboot')",
      "}",
      "foreach ($p in $procs) { Write-Output ($p.ProcessId.ToString() + '|' + $p.Name) }",
    ].join("\n")
  );
  const r = spawnSync("powershell", ["-NoProfile", "-File", ps1], {
    encoding: "utf8",
  });
  return String(r.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const [pid, name] = line.split("|");
      return { pid: Number(pid), name };
    });
}

function portsListening() {
  try {
    const net = execSync("netstat -ano", { encoding: "utf8" });
    return net
      .split(/\r?\n/)
      .filter((l) => /:3000|:4000/.test(l) && /LISTENING/.test(l));
  } catch {
    return [];
  }
}

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO, encoding: "utf8" }).trim();
  } catch {
    return "UNAVAILABLE";
  }
}

function persistKnownGood() {
  const map = {
    "known-good-finalProduct.json":
      "diagnostics-export/final-closure/final-product-signoff.json",
    "known-good-startupSignoff.json":
      "diagnostics-export/startup-reconciliation/final-startup-signoff.json",
    "known-good-firstRelease.json":
      "diagnostics-export/release-reconciliation/first-release-status.json",
    "known-good-releaseSummary.json":
      "diagnostics-export/release-reconciliation/reconciliation-summary.json",
    "known-good-startupReport.json": "diagnostics-export/startup-report.json",
  };
  const out = {};
  for (const [dest, srcRel] of Object.entries(map)) {
    const src = path.join(REPO, srcRel);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(OUT, dest));
      out[dest] = path.join(OUT, dest).replace(/\\/g, "/");
    }
  }
  return out;
}

function main() {
  ensureDir(OUT);
  const boot = windowsBootIdentity();
  const beforeProcs = listOwned();
  const beforePorts = portsListening();
  const launcher = path.join(STAGE, "SCI-OS-X10.cmd");
  const bundledNode = path.join(STAGE, "runtime", "node", "node.exe");
  let nodeVer = null;
  if (fs.existsSync(bundledNode)) {
    nodeVer = String(
      spawnSync(bundledNode, ["--version"], { encoding: "utf8" }).stdout || ""
    ).trim();
  }

  const knownGood = persistKnownGood();

  const pre = {
    at: new Date().toISOString(),
    schema: "sci-os-00-pre-reboot-state/v1",
    label: "ALPHA_NON_PRODUCTION",
    phase: "BEFORE_REBOOT_FREEZE",
    certificationOnly: true,
    noFeatureChanges: true,
    build: {
      gitSha: gitSha(),
      packageName: "sci-os-x10",
      engines: ">=20.18.0 <21",
      bundledNodeExpected: "20.18.1",
      bundledNodeActual: nodeVer,
      configHash: hashConfig(),
      launcherHash: fs.existsSync(launcher) ? sha256File(launcher) : null,
      goldenBootManifest: "installer/golden-boot.manifest.json",
      sciOsManifest: "sci-os.manifest.json",
    },
    windowsBootIdentityBefore: boot,
    canonicalLauncher: fs.existsSync(launcher)
      ? launcher.replace(/\\/g, "/")
      : null,
    installRoot: STAGE.replace(/\\/g, "/"),
    installRootOutsideRepo: !/scios-alpha/i.test(STAGE),
    bundledNodePath: fs.existsSync(bundledNode)
      ? bundledNode.replace(/\\/g, "/")
      : null,
    supervisor: "installer/scripts/startup/process-supervisor.cjs",
    bootstrap: "installer/scripts/start-sci-os.cjs --packaged",
    controlPlaneEndpoint: "http://127.0.0.1:3000/",
    shellEndpoint: "http://127.0.0.1:4000/",
    processesBeforeShutdown: beforeProcs,
    portsBeforeShutdown: beforePorts,
    knownGoodPersisted: knownGood,
    postRebootProofCommand: "pnpm package:prove-reboot",
    postRebootLauncherOnly: launcher.replace(/\\/g, "/"),
    postRebootCertifyCmd: path
      .join(STAGE, "REBOOT-CERTIFY-AFTER.cmd")
      .replace(/\\/g, "/"),
    readyForHumanReboot:
      !!nodeVer &&
      fs.existsSync(launcher) &&
      !/scios-alpha/i.test(STAGE),
  };
  write("00-pre-reboot-state.json", pre);
  // also keep legacy name for older tooling
  write("pre-reboot-state.json", pre);

  // Mirror into staged install
  if (fs.existsSync(STAGE)) {
    ensureDir(path.join(STAGE, "diagnostics-export", "reboot-certification"));
    fs.copyFileSync(
      path.join(OUT, "00-pre-reboot-state.json"),
      path.join(STAGE, "diagnostics-export", "reboot-certification", "00-pre-reboot-state.json")
    );
  }

  console.log(JSON.stringify({ step: "shutdown", via: "pnpm sci:stop" }));
  spawnSync("pnpm", ["sci:stop"], {
    cwd: REPO,
    shell: true,
    stdio: "inherit",
    encoding: "utf8",
  });
  if (fs.existsSync(bundledNode)) {
    const stopScript = path.join(STAGE, "installer/scripts/convergence/stop.cjs");
    if (fs.existsSync(stopScript)) {
      spawnSync(bundledNode, [stopScript], {
        cwd: STAGE,
        encoding: "utf8",
        env: {
          ...process.env,
          SCIOS_APP_ROOT: STAGE,
          SCIOS_PACKAGED: "1",
          SCIOS_RUNTIME_MODE: "PACKAGED",
        },
      });
    }
  }

  spawnSync(process.execPath, ["-e", "setTimeout(()=>{},2500)"], {
    encoding: "utf8",
  });

  const afterProcs = listOwned();
  const afterPorts = portsListening();
  const lockPath = path.join(REPO, "diagnostics-export", ".sci-os-startup.lock");
  const stagedLock = path.join(STAGE, "diagnostics-export", ".sci-os-startup.lock");
  const shutdown = {
    at: new Date().toISOString(),
    schema: "sci-os-01-pre-reboot-shutdown-proof/v1",
    controlPlaneStopped: !afterPorts.some((l) => /:3000/.test(l)),
    shellStopped: !afterPorts.some((l) => /:4000/.test(l)),
    ownedProcessesRemaining: afterProcs.length,
    remainingProcesses: afterProcs,
    portsListening: afterPorts,
    repoLockPresent: fs.existsSync(lockPath),
    stagedLockPresent: fs.existsSync(stagedLock),
    note: "Process lock files may be cleared on next start; must not leave RUNNING services",
    clean: afterProcs.length === 0 && afterPorts.length === 0,
  };
  write("01-pre-reboot-shutdown-proof.json", shutdown);

  // Placeholder post artifacts — NOT a pass claim
  write("09-final-reboot-certification.json", {
    at: new Date().toISOString(),
    schema: "sci-os-09-final-reboot-certification/v1",
    phase: "AWAITING_HOST_REBOOT",
    verdict: "NOT_YET — human Windows reboot required",
    pass: false,
    note: "Do not claim FIRST RELEASE — READY until post-reboot proof after real reboot",
  });

  const gate = {
    ok: true,
    phase: "PRE_REBOOT_COMPLETE",
    readyForWindowsReboot: pre.readyForHumanReboot && shutdown.clean,
    installRoot: pre.installRoot,
    launcher: pre.canonicalLauncher,
    bundledNode: pre.bundledNodePath,
    nodeVer,
    shutdownClean: shutdown.clean,
    windowsBootBefore: boot.lastBootUpTime,
    outDir: "diagnostics-export/reboot-certification",
  };
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.readyForWindowsReboot ? 0 : 2);
}

main();
