#!/usr/bin/env node
"use strict";

/**
 * BEFORE Windows reboot — stage packaged install, persist known-good, clean shutdown.
 *   node scripts/package/reboot-certification.cjs --pre
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync, execSync } = require("child_process");

const REPO = path.resolve(__dirname, "../..");
const OUT = path.join(REPO, "diagnostics-export", "reboot-certification");
const DIST = path.join(REPO, "dist", "SCI-OS-X10");
const STAGE = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local"),
  "SCI OS X10",
  "app"
);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(dir, name, obj) {
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2) + "\n");
}

function sha256File(abs) {
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  } catch {
    return null;
  }
}

function copyDir(src, dst) {
  ensureDir(dst);
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else {
      ensureDir(path.dirname(d));
      fs.copyFileSync(s, d);
    }
  }
}

function listSciProcesses() {
  try {
    const ps1 = path.join(OUT, "_list-sci-owned.ps1");
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
        "  ) -and ($_.CommandLine -notmatch 'reboot-cert') -and ($_.CommandLine -notmatch '_cleanup-leftovers')",
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
        const [ProcessId, Name] = line.split("|");
        return { ProcessId, Name };
      });
  } catch {
    return [];
  }
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

function main() {
  ensureDir(OUT);

  const known = {
    finalProduct: "diagnostics-export/final-closure/final-product-signoff.json",
    startupSignoff:
      "diagnostics-export/startup-reconciliation/final-startup-signoff.json",
    startupReport: "diagnostics-export/startup-report.json",
  };
  const persisted = {};
  for (const [k, rel] of Object.entries(known)) {
    const p = path.join(REPO, rel);
    if (fs.existsSync(p)) {
      const dest = path.join(OUT, `known-good-${k}.json`);
      fs.copyFileSync(p, dest);
      persisted[k] = dest.replace(/\\/g, "/");
    }
  }

  const syncFiles = [
    "installer/scripts/start-sci-os.cjs",
    "installer/scripts/bootstrap-capsule.cjs",
    "installer/scripts/startup/resolve-node-runtime.cjs",
    "installer/scripts/startup/validate-config.cjs",
    "installer/scripts/startup/packaged-mode.cjs",
    "sci-os.manifest.json",
  ];
  const synced = [];
  if (!fs.existsSync(DIST)) {
    write(OUT, "pre-reboot-state.json", {
      at: new Date().toISOString(),
      readyForReboot: false,
      blockersIfNotReady: ["dist/SCI-OS-X10 missing — run package build first"],
    });
    console.log(JSON.stringify({ ok: false, error: "DIST_MISSING" }, null, 2));
    process.exit(2);
  }

  for (const rel of syncFiles) {
    const src = path.join(REPO, rel);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(DIST, rel);
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
    synced.push(rel);
  }

  // Ensure packaged config + CMD open shell
  const packagedCfg = {
    schema: "sci-os-packaged-config/v1",
    profile: "PACKAGED",
    env: {
      SCIOS_RUNTIME_MODE: "PACKAGED",
      SCIOS_PACKAGED: "1",
      SCI_RUNTIME_PROFILE: "packaged",
      SCIOS_API_PORT: "3000",
      SCIOS_COCKPIT_PORT: "4000",
      PORT: "3000",
      EXECUTION_MODE: "SIMULATION_ONLY",
      AUTH_MODE: "local-packaged",
      TELEMETRY_MODE: "local",
      GOVERNANCE_MODE: "embedded-foundation",
    },
    bundledRuntime: {
      nodeVersion: "20.18.1",
      acceptMajor: [18, 20],
      path: "runtime/node/node.exe",
      systemNodeFallback: false,
    },
    userFacingUrl: "http://127.0.0.1:4000/",
    controlPlaneUrl: "http://127.0.0.1:3000/",
    userDataHint: "%LOCALAPPDATA%\\SCI OS X10\\data",
    note: "No developer .env in PACKAGED mode",
  };
  write(path.join(DIST, "config"), "packaged.json", packagedCfg);

  const cmd = `@echo off
setlocal
set "INSTALL_ROOT=%~dp0"
set "SCIOS_APP_ROOT=%INSTALL_ROOT%"
set "SCIOS_RUNTIME_MODE=PACKAGED"
set "SCIOS_PACKAGED=1"
set "SCI_RUNTIME_PROFILE=packaged"
set "SCIOS_BOOT_SERVE=1"
set "NODE=%INSTALL_ROOT%runtime\\node\\node.exe"
if not exist "%NODE%" (
  echo Bundled Node runtime missing: %NODE%
  echo Class: BUNDLED_RUNTIME
  pause
  exit /b 1
)
"%NODE%" "%INSTALL_ROOT%installer\\scripts\\start-sci-os.cjs" --serve --packaged
set EXITCODE=%ERRORLEVEL%
if %EXITCODE% EQU 0 (
  start "" "http://127.0.0.1:4000/"
)
if %EXITCODE% NEQ 0 (
  echo Startup failed. See diagnostics-export\\startup-report.json
  pause
)
exit /b %EXITCODE%
`;
  fs.writeFileSync(path.join(DIST, "SCI-OS-X10.cmd"), cmd);
  fs.writeFileSync(path.join(DIST, "SCI OS X10.cmd"), cmd);

  console.log(JSON.stringify({ step: "stage_to_localappdata", STAGE }));
  copyDir(DIST, STAGE);

  // Post cert script into staged installer
  const postSrc = path.join(__dirname, "reboot-cert-post.cjs");
  const postDst = path.join(STAGE, "installer", "scripts", "reboot-cert-post.cjs");
  ensureDir(path.dirname(postDst));
  fs.copyFileSync(postSrc, postDst);
  fs.copyFileSync(postSrc, path.join(DIST, "installer", "scripts", "reboot-cert-post.cjs"));

  const certifyCmd = `@echo off
setlocal
cd /d "%~dp0"
set "SCIOS_APP_ROOT=%~dp0"
set "SCIOS_PACKAGED=1"
set "SCIOS_RUNTIME_MODE=PACKAGED"
set "NODE=%~dp0runtime\\node\\node.exe"
if not exist "%NODE%" (
  echo BUNDLED_RUNTIME missing
  pause
  exit /b 1
)
echo Running post-reboot certification with bundled Node only...
"%NODE%" "%~dp0installer\\scripts\\reboot-cert-post.cjs"
echo.
echo See diagnostics-export\\reboot-certification\\final-reboot-certification.json
pause
exit /b %ERRORLEVEL%
`;
  fs.writeFileSync(path.join(STAGE, "REBOOT-CERTIFY-AFTER.cmd"), certifyCmd);
  fs.writeFileSync(path.join(DIST, "REBOOT-CERTIFY-AFTER.cmd"), certifyCmd);

  // Desktop shortcut instruction file
  write(path.join(STAGE, "diagnostics-export", "reboot-certification"), "HOW-TO-AFTER-REBOOT.json", {
    steps: [
      "Reboot Windows",
      "Do not open Cursor/VS Code/terminal/pnpm",
      "Double-click SCI-OS-X10.cmd in this folder (or Desktop shortcut pointing here)",
      "Wait for Home at http://127.0.0.1:4000/",
      "Run Search AAPL → Analyze in the Shell",
      "Double-click REBOOT-CERTIFY-AFTER.cmd",
    ],
    installRoot: STAGE.replace(/\\/g, "/"),
  });

  const bundledNode = path.join(STAGE, "runtime", "node", "node.exe");
  let nodeVer = null;
  if (fs.existsSync(bundledNode)) {
    nodeVer = String(
      spawnSync(bundledNode, ["--version"], { encoding: "utf8" }).stdout || ""
    ).trim();
  }

  let gitSha = "UNAVAILABLE";
  try {
    gitSha = execSync("git rev-parse HEAD", { cwd: REPO, encoding: "utf8" }).trim();
  } catch {
    /* */
  }

  console.log(JSON.stringify({ step: "shutdown" }));
  spawnSync("pnpm", ["sci:stop"], {
    cwd: REPO,
    shell: true,
    stdio: "inherit",
    encoding: "utf8",
  });
  if (fs.existsSync(bundledNode)) {
    spawnSync(
      bundledNode,
      [path.join(STAGE, "installer/scripts/convergence/stop.cjs")],
      {
        cwd: STAGE,
        encoding: "utf8",
        env: {
          ...process.env,
          SCIOS_APP_ROOT: STAGE,
          SCIOS_PACKAGED: "1",
          SCIOS_RUNTIME_MODE: "PACKAGED",
        },
      }
    );
  }

  // brief wait
  spawnSync(process.execPath, ["-e", "setTimeout(()=>{},2000)"], {
    encoding: "utf8",
  });
  const remaining = listSciProcesses();
  const listening = portsListening();
  const shutdownClean = remaining.length === 0 && listening.length === 0;

  const launcher = path.join(STAGE, "SCI-OS-X10.cmd");
  const pre = {
    at: new Date().toISOString(),
    schema: "sci-os-pre-reboot-state/v1",
    label: "ALPHA_NON_PRODUCTION",
    phase: "BEFORE_REBOOT",
    installerBuild: {
      distPresent: true,
      stagedInstallRoot: STAGE.replace(/\\/g, "/"),
      stagedOutsideRepo: !/scios-alpha/i.test(STAGE),
      gitSha,
      packageName: "sci-os-x10",
      bundledNodeVersionExpected: "20.18.1",
      bundledNodeVersionActual: nodeVer,
      launcherHash: sha256File(launcher),
    },
    canonicalLauncher: launcher.replace(/\\/g, "/"),
    installRoot: STAGE.replace(/\\/g, "/"),
    bundledNodePath: bundledNode.replace(/\\/g, "/"),
    supervisorEntry: "installer/scripts/startup/process-supervisor.cjs",
    bootstrapEntry: "installer/scripts/start-sci-os.cjs --packaged",
    shellEndpoint: "http://127.0.0.1:4000/",
    controlPlaneEndpoint: "http://127.0.0.1:3000/",
    syncedStartupFiles: synced,
    knownGoodPersisted: persisted,
    shutdown: {
      attempted: true,
      remainingSciLikeProcesses: remaining.length,
      remaining,
      portsListening: listening,
      clean: shutdownClean,
    },
    afterRebootInstructions: [
      "1. Reboot Windows now.",
      "2. Do NOT open Cursor / VS Code / terminal / pnpm / system Node workflows.",
      `3. Start ONLY: ${launcher}`,
      "4. Confirm Shell Home opens (http://127.0.0.1:4000/).",
      "5. In Shell: Search AAPL → Analyze (optional manual; cert also runs API GW1).",
      `6. Run: ${path.join(STAGE, "REBOOT-CERTIFY-AFTER.cmd")}`,
      "7. Read: diagnostics-export/reboot-certification/final-reboot-certification.json",
    ],
    readyForReboot: !!nodeVer && shutdownClean && !/scios-alpha/i.test(STAGE),
    blockersIfNotReady: [
      !nodeVer ? "BUNDLED_RUNTIME missing in staged install" : null,
      !shutdownClean ? "SCI OS processes or ports still active after stop" : null,
      /scios-alpha/i.test(STAGE)
        ? "INSTALL_ROOT still under developer repo"
        : null,
    ].filter(Boolean),
  };

  write(OUT, "pre-reboot-state.json", pre);
  write(
    path.join(STAGE, "diagnostics-export", "reboot-certification"),
    "pre-reboot-state.json",
    pre
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "PRE_REBOOT",
        readyForReboot: pre.readyForReboot,
        installRoot: pre.installRoot,
        bundledNode: pre.bundledNodePath,
        nodeVer,
        shutdownClean: pre.shutdown.clean,
        out: "diagnostics-export/reboot-certification/pre-reboot-state.json",
      },
      null,
      2
    )
  );
  process.exit(pre.readyForReboot ? 0 : 2);
}

if (process.argv.includes("--pre")) {
  main();
} else {
  console.log(
    JSON.stringify({
      usage: "node scripts/package/reboot-certification.cjs --pre",
      afterReboot: "REBOOT-CERTIFY-AFTER.cmd in %LOCALAPPDATA%\\SCI OS X10\\app",
    })
  );
  process.exit(2);
}
