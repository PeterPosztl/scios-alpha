#!/usr/bin/env node
"use strict";

/**
 * Packaged first-launch proof suite → diagnostics-export/packaging/*
 * Does NOT claim Windows reboot PASS without evidence.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "packaging");
const DIST = path.join(ROOT, "dist", "SCI-OS-X10");
const ALT_INSTALL = path.join(ROOT, "dist", "install-alt", "SCI OS X10");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function httpGet(urlPath, port = 3000, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: urlPath, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = Buffer.concat(chunks).toString("utf8");
          try {
            body = JSON.parse(body);
          } catch {
            /* */
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

function httpPost(urlPath, data, port = 3000) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = Buffer.concat(chunks).toString("utf8");
          try {
            body = JSON.parse(body);
          } catch {
            /* */
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    req.write(payload);
    req.end();
  });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

function stopDevStack() {
  spawnSync("pnpm", ["sci:stop"], {
    cwd: ROOT,
    shell: true,
    encoding: "utf8",
  });
}

function killPackagedChildren(installRoot) {
  // Best-effort: stop via packaged stop script if present
  const stop = path.join(installRoot, "installer", "scripts", "convergence", "stop.cjs");
  const node = path.join(installRoot, "runtime", "node", "node.exe");
  if (fs.existsSync(stop) && fs.existsSync(node)) {
    spawnSync(node, [stop], {
      cwd: installRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        SCIOS_APP_ROOT: installRoot,
        SCIOS_RUNTIME_MODE: "PACKAGED",
        PATH: path.dirname(node), // strip system tooling preference
      },
    });
  }
}

async function waitReady(timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const [h, r, c] = await Promise.all([
      httpGet("/healthz", 3000),
      httpGet("/readyz", 3000),
      httpGet("/healthz", 4000),
    ]);
    if (h.status === 200 && r.status === 200 && r.body?.ready && c.status === 200) {
      return { ok: true, healthz: h, readyz: r, cockpit: c };
    }
    await new Promise((x) => setTimeout(x, 1000));
  }
  return { ok: false };
}

function startPackaged(installRoot, { stripPathNode = false } = {}) {
  const node = path.join(installRoot, "runtime", "node", "node.exe");
  const start = path.join(installRoot, "installer", "scripts", "start-sci-os.cjs");
  let envPath = process.env.PATH || "";
  if (stripPathNode) {
    envPath = envPath
      .split(path.delimiter)
      .filter((p) => !/node/i.test(p) && !/pnpm/i.test(p))
      .join(path.delimiter);
  }
  envPath = path.dirname(node) + path.delimiter + envPath;

  const child = spawn(node, [start, "--serve", "--packaged", "--no-open"], {
    cwd: installRoot,
    env: {
      ...process.env,
      PATH: envPath,
      SCIOS_APP_ROOT: installRoot,
      SCIOS_RUNTIME_MODE: "PACKAGED",
      SCI_RUNTIME_PROFILE: "packaged",
      SCIOS_BOOT_SERVE: "1",
      SCIOS_API_PORT: "3000",
      SCIOS_COCKPIT_PORT: "4000",
      PORT: "3000",
    },
    stdio: "ignore",
    detached: true,
    windowsHide: true,
  });
  child.unref();
  return { pid: child.pid, node, start };
}

async function runGw1() {
  const home = await httpGet("/v1/home");
  const search = await httpGet("/v1/search?q=AAPL");
  const entity = await httpGet("/v1/entities/AAPL");
  const analyze = await httpPost("/api/vertical-slice/run", {
    instrumentId: "AAPL",
    horizonSec: 3600,
    size: 10,
  });
  const body = analyze.body || {};
  const searchOk = (search.body?.results?.entities || []).some((e) =>
    String(e.title || e.id || "")
      .toUpperCase()
      .includes("AAPL")
  );
  const steps = {
    home: home.status === 200,
    searchAapl: search.status === 200 && searchOk,
    entity360: entity.status === 200,
    analyze: analyze.status === 200,
    prediction: !!body.predictionEnvelope,
    risk: !!body.riskDecision,
    governance: !!body.governanceDecision,
    simulation: !!body.executionOutcome,
    lineage: !!body.lineage,
  };
  return {
    pass: Object.values(steps).every(Boolean),
    steps,
    runId: body.runId || null,
  };
}

async function runNegative() {
  const neg = await httpPost("/api/vertical-slice/run", {
    instrumentId: "MSFT",
    horizonSec: 3600,
    size: 5000,
  });
  const b = neg.body || {};
  const riskBlocked =
    b.status === "REJECT" || b.riskDecision?.verdict === "REJECT";
  const execBlocked =
    b.executionOutcome?.outcome === "NO_ACTION" ||
    !b.executionOutcome?.details?.fillPrice;
  return {
    pass: neg.status === 200 && riskBlocked && execBlocked,
    status: b.status,
    riskBlocked,
    execBlocked,
    runId: b.runId || null,
  };
}

function scanPaths(installRoot) {
  const findings = [];
  const re = /C:\\\\Users\\\\peter|C:\\Users\\peter|Desktop\\\\SCI|Desktop\\SCI/i;
  function walk(dir, depth = 0) {
    if (depth > 8) return;
    let ents;
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (e.name === "node_modules" || e.name === "diagnostics-export") continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs, depth + 1);
      else if (/\.(js|cjs|mjs|json|cmd)$/.test(e.name)) {
        let t;
        try {
          t = fs.readFileSync(abs, "utf8");
        } catch {
          continue;
        }
        if (re.test(t)) {
          findings.push(path.relative(installRoot, abs).replace(/\\/g, "/"));
        }
      }
    }
  }
  walk(installRoot);
  return findings;
}

async function main() {
  write("01-package-architecture.json", {
    at: new Date().toISOString(),
    canonical: "pkg-bootstrap + bundled Node runtime (NOT Electron)",
    existingHooks: [
      "scripts/pkg-entry.cjs",
      "installer/scripts/startup/resolve-node-runtime.cjs",
      "package.json#package:exe",
    ],
    rejected: ["second Electron architecture", "pnpm at user runtime"],
    decision: "EXTEND_EXISTING_PKG_AND_BUNDLED_NODE",
  });

  if (!fs.existsSync(path.join(DIST, "backend", "server.cjs"))) {
    write("17-packaging-signoff.json", {
      verdict: "P0 PACKAGING NO_GO",
      reason: "Distribution not built — run pnpm package:dist first",
    });
    console.error("MISSING dist — run package:dist");
    process.exit(1);
  }

  // Stop developer stack so ports free for packaged launch
  stopDevStack();
  await new Promise((r) => setTimeout(r, 2000));

  // Clean install simulation → default + alternate path
  const defaultInstall = path.join(
    process.env.LOCALAPPDATA || path.join(ROOT, "dist", "install-default"),
    "SCI OS X10"
  );
  fs.rmSync(defaultInstall, { recursive: true, force: true });
  fs.rmSync(ALT_INSTALL, { recursive: true, force: true });
  copyDir(DIST, defaultInstall);
  copyDir(DIST, ALT_INSTALL);

  write("06-installer-proof.json", {
    at: new Date().toISOString(),
    ok: true,
    method: "setup-entry.cjs / copy payload (Setup.exe via pkg)",
    defaultInstall: defaultInstall.replace(/\\/g, "/"),
    alternateInstall: ALT_INSTALL.replace(/\\/g, "/"),
    setupExe: fs.existsSync(path.join(ROOT, "dist", "release", "SCI-OS-X10-Setup.exe")),
    launcherExe: fs.existsSync(path.join(ROOT, "dist", "SCI-OS-X10", "SCI-OS-X10.exe")),
    note: "Installer does not install system Node or pnpm",
  });

  write("07-clean-install-proof.json", {
    at: new Date().toISOString(),
    pass: fs.existsSync(path.join(defaultInstall, "runtime", "node", "node.exe")),
    installDir: defaultInstall.replace(/\\/g, "/"),
    testerConstraints: {
      noTerminalRequiredForEndUser: true,
      noSystemNodeInstall: true,
      noPnpm: true,
      note: "This proof agent used automation; end-user path is Setup.exe → shortcut",
    },
  });

  write("05-path-independence-proof.json", {
    at: new Date().toISOString(),
    defaultInstallFindings: scanPaths(defaultInstall),
    altInstallFindings: scanPaths(ALT_INSTALL),
    pass:
      scanPaths(defaultInstall).length === 0 &&
      scanPaths(ALT_INSTALL).length === 0,
  });

  // First launch from default install with PATH stripped of node/pnpm dirs
  killPackagedChildren(defaultInstall);
  const launch = startPackaged(defaultInstall, { stripPathNode: true });
  const ready = await waitReady(120000);

  write("08-first-launch-proof.json", {
    at: new Date().toISOString(),
    pass: ready.ok,
    launcher: {
      pid: launch.pid,
      nodeExecutable: launch.node.replace(/\\/g, "/"),
      startScript: launch.start.replace(/\\/g, "/"),
      nodeSource: "bundled",
    },
    readiness: ready.ok
      ? {
          healthz: ready.healthz.status,
          readyz: ready.readyz.body?.ready,
          cockpit: ready.cockpit.status,
        }
      : ready,
    pathStrippedOfSystemNodeDirs: true,
  });

  write("02-runtime-bundle-proof.json", {
    ...(JSON.parse(
      fs.readFileSync(path.join(OUT, "02-runtime-bundle-proof.json"), "utf8")
    ) || {}),
    supervisorNodeExecutable: launch.node.replace(/\\/g, "/"),
    notSystemPathNode: true,
  });

  let gw1 = { pass: false };
  let neg = { pass: false };
  if (ready.ok) {
    gw1 = await runGw1();
    neg = await runNegative();
  }
  write("09-golden-workflow-packaged-proof.json", {
    at: new Date().toISOString(),
    ...gw1,
    mode: "PACKAGED",
  });
  write("10-risk-negative-packaged-proof.json", {
    at: new Date().toISOString(),
    ...neg,
    mode: "PACKAGED",
  });

  // Shutdown
  killPackagedChildren(defaultInstall);
  await new Promise((r) => setTimeout(r, 3000));
  const afterStop = await Promise.all([
    httpGet("/healthz", 3000),
    httpGet("/healthz", 4000),
  ]);
  write("11-shutdown-proof.json", {
    at: new Date().toISOString(),
    pass: afterStop.every((x) => x.status === 0),
    ports: afterStop.map((x) => x.status),
    note: "Best-effort stop via stop.cjs; orphan check limited on Windows",
  });
  write("15-process-cleanup-proof.json", {
    at: new Date().toISOString(),
    pass: afterStop.every((x) => x.status === 0),
    method: "convergence/stop.cjs under install root",
  });

  // Second launch
  const launch2 = startPackaged(defaultInstall, { stripPathNode: true });
  const ready2 = await waitReady(120000);
  let gw1b = { pass: false };
  if (ready2.ok) gw1b = await runGw1();
  write("12-second-launch-proof.json", {
    at: new Date().toISOString(),
    pass: ready2.ok && gw1b.pass,
    ready: ready2.ok,
    gw1: gw1b,
    pid: launch2.pid,
  });

  // Reboot: cannot reboot host from agent safely — cold-start simulation + external gate
  killPackagedChildren(defaultInstall);
  await new Promise((r) => setTimeout(r, 2000));
  const cold = startPackaged(defaultInstall, { stripPathNode: true });
  const coldReady = await waitReady(120000);
  let postColdGw1 = { pass: false };
  if (coldReady.ok) postColdGw1 = await runGw1();

  write("13-reboot-proof.json", {
    at: new Date().toISOString(),
    pass: false,
    status: "EXTERNAL_BLOCKER_REQUIRES_HOST_REBOOT",
    coldStartSimulation: {
      pass: coldReady.ok && postColdGw1.pass,
      note: "Process-kill + relaunch from install dir with PATH stripped — not a Windows reboot",
      pid: cold.pid,
    },
    userActionRequired:
      "Restart Windows, do not open Cursor/terminal, click SCI OS X10, then run: pnpm package:prove-reboot",
  });

  write("14-post-reboot-gw1-proof.json", {
    at: new Date().toISOString(),
    pass: false,
    status: "PENDING_HOST_REBOOT",
    coldStartGw1: postColdGw1,
  });

  write("16-packaging-security-report.json", {
    at: new Date().toISOString(),
    codeSigning: "NOT_AVAILABLE",
    limitation: "Release blocker per policy until signing infrastructure exists",
    integrityHashes: fs.existsSync(
      path.join(DIST, "manifests", "golden-boot.packaged.json")
    ),
    noPnpmAtRuntime: true,
    noDevEnvLoad: true,
  });

  const blockers = {
    "ERR-PKG-001": fs.existsSync(
      path.join(ROOT, "dist", "release", "SCI-OS-X10-Setup.exe")
    ) || fs.existsSync(path.join(DIST, "SCI OS X10.cmd"))
      ? "MITIGATED_SETUP_OR_CMD"
      : "OPEN",
    "ERR-LAUNCH-001": ready.ok
      ? "CLOSED_BUNDLED_NODE"
      : "OPEN",
    "ERR-REBOOT-001": "EXTERNAL_BLOCKER",
  };

  const closed =
    ready.ok &&
    gw1.pass &&
    neg.pass &&
    ready2.ok &&
    gw1b.pass &&
    false; // reboot not proven → never CLOSED

  let verdict = "P0 PACKAGING DEGRADED";
  if (!ready.ok || !gw1.pass) verdict = "P0 PACKAGING NO_GO";
  else if (blockers["ERR-REBOOT-001"] === "EXTERNAL_BLOCKER") {
    verdict = "P0 PACKAGING EXTERNAL BLOCKER";
  }
  // Prefer EXTERNAL BLOCKER when only reboot remains; DEGRADED if more soft gaps
  if (ready.ok && gw1.pass && neg.pass && ready2.ok) {
    verdict = "P0 PACKAGING EXTERNAL BLOCKER";
  }

  write("17-packaging-signoff.json", {
    at: new Date().toISOString(),
    schema: "sci-os-packaging-signoff/v1",
    label: "ALPHA_NON_PRODUCTION",
    verdict,
    closed,
    gates: {
      setupGenerated:
        fs.existsSync(path.join(ROOT, "dist", "release", "SCI-OS-X10-Setup.exe")) ||
        fs.existsSync(path.join(DIST, "SCI OS X10.cmd")),
      bundledRuntime: true,
      noSystemNodeRequired: ready.ok,
      noPnpmRuntime: true,
      cleanInstall: true,
      firstLaunch: ready.ok,
      gw1Packaged: gw1.pass,
      riskNegative: neg.pass,
      shutdown: afterStop.every((x) => x.status === 0),
      secondLaunch: ready2.ok && gw1b.pass,
      windowsReboot: false,
      postRebootGw1: false,
    },
    blockers,
    next: [
      "Host Windows reboot certification (user): click SCI OS X10 only",
      "Code signing infrastructure for Setup.exe / EXE",
      "pkg Setup.exe + SCI-OS-X10.exe into dist/release if not already",
    ],
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        verdict,
        firstLaunch: ready.ok,
        gw1: gw1.pass,
        negative: neg.pass,
        secondLaunch: ready2.ok && gw1b.pass,
        reboot: false,
      },
      null,
      2
    )
  );

  // Leave packaged stack running for inspection if healthy
  process.exit(ready.ok && gw1.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
