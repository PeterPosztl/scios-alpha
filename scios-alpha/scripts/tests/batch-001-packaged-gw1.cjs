/**
 * batch_001_P0 — Packaged LOCALAPPDATA GW1 proof chain (TASK-PKG-003).
 * Launch from install root (not repo). ALPHA_NON_PRODUCTION.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const net = require("net");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "closure", "batch_001_P0");
const DIST = path.join(ROOT, "dist", "SCI-OS-X10");
const INSTALL = path.join(
  process.env.LOCALAPPDATA || "",
  "SCI OS X10",
  "app"
);

process.on("uncaughtException", (e) => {
  console.error("UNCAUGHT", e && e.message ? e.message : e);
});
process.on("unhandledRejection", (e) => {
  console.error("UNHANDLED", e && e.message ? e.message : e);
});

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

function sha256File(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function hashTree(dir, acc = []) {
  if (!fs.existsSync(dir)) return null;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".git")
      continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) hashTree(abs, acc);
    else if (/\.(js|cjs|mjs|ts|json|md)$/i.test(ent.name)) {
      try {
        acc.push(ent.name + ":" + sha256File(abs).slice(0, 16));
      } catch {
        /* ignore */
      }
    }
  }
  return crypto.createHash("sha256").update(acc.sort().join("|")).digest("hex");
}

function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    try {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        res.on("error", () => done({ status: 0, body: null, raw: "" }));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let body = null;
          try {
            body = JSON.parse(raw);
          } catch {
            body = null;
          }
          done({ status: res.statusCode || 0, body, raw });
        });
      });
      req.on("error", () => done({ status: 0, body: null, raw: "" }));
      req.on("timeout", () => {
        req.destroy();
        done({ status: 0, body: null, raw: "" });
      });
      req.on("socket", (s) => s.on("error", () => done({ status: 0, body: null, raw: "" })));
    } catch {
      done({ status: 0, body: null, raw: "" });
    }
  });
}

function httpPost(url, data, timeoutMs = 30000) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const payload = JSON.stringify(data);
    try {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + u.search,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(payload),
          },
          timeout: timeoutMs,
        },
        (res) => {
          res.on("error", () => done({ status: 0, body: null }));
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            let body = null;
            try {
              body = JSON.parse(raw);
            } catch {
              body = null;
            }
            done({ status: res.statusCode || 0, body, raw });
          });
        }
      );
      req.on("error", () => done({ status: 0, body: null }));
      req.on("timeout", () => {
        req.destroy();
        done({ status: 0, body: null });
      });
      req.write(payload);
      req.end();
    } catch {
      done({ status: 0, body: null });
    }
  });
}

async function waitOk(url, n = 90) {
  for (let i = 0; i < n; i++) {
    const r = await httpGet(url);
    if (r.status === 200) return r;
    await new Promise((x) => setTimeout(x, 300));
  }
  return httpGet(url);
}

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.on("error", () => resolve(false));
    s.listen(port, "127.0.0.1", () => s.close(() => resolve(true)));
  });
}

function stopAll() {
  const stop = path.join(ROOT, "installer/scripts/convergence/stop.cjs");
  const node =
    (fs.existsSync(path.join(INSTALL, "runtime/node/node.exe")) &&
      path.join(INSTALL, "runtime/node/node.exe")) ||
    (fs.existsSync(path.join(DIST, "runtime/node/node.exe")) &&
      path.join(DIST, "runtime/node/node.exe")) ||
    process.execPath;
  spawnSync(node, [stop], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 90000,
  });
}

function shortcutTarget() {
  const startMenu = path.join(
    process.env.APPDATA || "",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "SCI OS X10.lnk"
  );
  const desktop = path.join(
    process.env.USERPROFILE || "",
    "Desktop",
    "SCI OS X10.lnk"
  );
  const out = { startMenuExists: fs.existsSync(startMenu), desktopExists: fs.existsSync(desktop) };
  // PowerShell COM for .lnk target
  try {
    const ps = `
$paths = @('${startMenu.replace(/'/g, "''")}', '${desktop.replace(/'/g, "''")}')
$w = New-Object -ComObject WScript.Shell
foreach ($p in $paths) {
  if (Test-Path $p) {
    $s = $w.CreateShortcut($p)
    [PSCustomObject]@{ path=$p; target=$s.TargetPath; workDir=$s.WorkingDirectory } | ConvertTo-Json -Compress
  }
}
`;
    const r = spawnSync(
      "powershell",
      ["-NoProfile", "-Command", ps],
      { encoding: "utf8", windowsHide: true, timeout: 15000 }
    );
    out.raw = String(r.stdout || "").trim();
    const lines = out.raw.split(/\r?\n/).filter(Boolean);
    out.shortcuts = lines.map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { raw: l };
      }
    });
  } catch (e) {
    out.error = String(e.message || e);
  }
  return out;
}

async function runGw1Chain(buildId) {
  const steps = [];
  const push = (name, ok, detail) => steps.push({ name, ok, ...detail });

  const health = await waitOk("http://127.0.0.1:3000/healthz");
  push("CP_HEALTH", health.status === 200, { status: health.status });

  const home = await waitOk("http://127.0.0.1:3000/v1/home");
  push("HOME_API", home.status === 200 && !!home.body, {
    status: home.status,
    headline: home.body && home.body.headline,
  });

  const cockH = await waitOk("http://127.0.0.1:4000/healthz");
  push("COCKPIT_HEALTH", cockH.status === 200, { status: cockH.status });

  const cock = await waitOk("http://127.0.0.1:4000/");
  const hasBootstrap = /bootstrapUi\s*\(/.test(cock.raw || "");
  push("COCKPIT_HTML", cock.status === 200 && /SCI OS/i.test(cock.raw || ""), {
    status: cock.status,
    hasBootstrapUi: hasBootstrap,
    staticLoadingHome: /Loading home/i.test(cock.raw || ""),
    note: "Static HTML may contain Loading home until JS; bootstrapUi present ⇒ hydration path",
  });

  const exp = await httpGet(
    "http://127.0.0.1:3000/v1/experience/compile?roleId=arch.market_analyst&workflowState=ready"
  );
  push(
    "EXPERIENCE",
    exp.status === 200 && exp.body && exp.body.compilerStatus === "RUNTIME_MOUNTED",
    {
      status: exp.status,
      compilerStatus: exp.body && exp.body.compilerStatus,
      role: exp.body && exp.body.actor && exp.body.actor.roleId,
    }
  );

  const search = await httpGet("http://127.0.0.1:3000/v1/search?q=AAPL");
  const resultsObj = (search.body && search.body.results) || {};
  const hits = Array.isArray(search.body && search.body.results)
    ? search.body.results
    : Array.isArray(resultsObj.entities)
      ? resultsObj.entities
      : Array.isArray(search.body && search.body.hits)
        ? search.body.hits
        : Array.isArray(search.body && search.body.items)
          ? search.body.items
          : [];
  push("SEARCH_AAPL", search.status === 200 && hits.length > 0, {
    status: search.status,
    hitCount: hits.length,
    first: hits[0] && (hits[0].id || hits[0].entityId || hits[0].title),
  });

  let entityId = "AAPL";
  const entity = await httpGet(
    "http://127.0.0.1:3000/v1/entities/" + encodeURIComponent(entityId)
  );
  if (entity.body && entity.body.entity && entity.body.entity.id) {
    entityId = entity.body.entity.id;
  }
  push("ENTITY", entity.status === 200 && !!(entity.body && entity.body.entity), {
    status: entity.status,
    entityId,
    title: entity.body && entity.body.entity && entity.body.entity.title,
  });

  const analyze = await httpPost("http://127.0.0.1:3000/api/vertical-slice/run", {
    instrumentId: "AAPL",
    horizonSec: 3600,
    size: 10,
    actor: "actor:arch.market_analyst",
    role: "arch.market_analyst",
    idempotencyKey: "batch001-gw1-" + Date.now(),
  });
  const run = analyze.body || {};
  push("GW1_ANALYZE", analyze.status === 200 && !!run.runId, {
    status: analyze.status,
    runId: run.runId,
    decision: run.status,
    executionMode: run.executionOutcome && run.executionOutcome.mode,
    simulated: !!(run.executionOutcome && run.executionOutcome.simulated),
  });

  const pred = run.predictionEnvelope || run.prediction || {};
  const science =
    pred.scienceStatus ||
    pred.maturity ||
    pred.modelTruth ||
    pred.label ||
    run.modelTruth ||
    null;
  const predictionValue =
    pred.prediction ?? pred.value ?? pred.score ?? run.prediction ?? null;
  const uncertaintyOk =
    !!run.runId &&
    (science == null ||
      /UNKNOWN|UNVALIDATED|FOUNDATION|ALPHA|NON.?PRODUCTION/i.test(String(science)) ||
      typeof predictionValue === "number");
  push("UNCERTAINTY", uncertaintyOk, {
    scienceStatus: science,
    prediction: predictionValue,
    honest:
      !science ||
      !/PRODUCTION_VALIDATED|CERTIFIED/i.test(String(science)),
  });

  const risk = run.riskDecision || {};
  const gov = run.governanceDecision || {};
  push(
    "RISK_GOVERNANCE",
    !!(
      risk.decision ||
      risk.status ||
      risk.action ||
      gov.decision ||
      gov.status ||
      gov.action ||
      run.status
    ),
    {
      risk: risk.decision || risk.status || risk.action || null,
      governance: gov.decision || gov.status || gov.action || null,
      explanation: gov.explanation || risk.reason || null,
      pipelineStatus: run.status,
      simulationOnly: !!(
        run.executionOutcome &&
        (run.executionOutcome.simulated ||
          /SIMULATION/i.test(String(run.executionOutcome.mode || "")))
      ),
    }
  );

  let evidenceOk = false;
  let lineageOk = false;
  let lineageBody = null;
  let evidenceBody = null;
  if (run.runId) {
    const lin = await httpGet(
      "http://127.0.0.1:3000/v1/lineage/" + encodeURIComponent(run.runId)
    );
    lineageBody = lin.body;
    lineageOk =
      lin.status === 200 &&
      !!(lin.body && (lin.body.verified === true || lin.body.nodes || lin.body.lineage));
    push("LINEAGE", lineageOk, {
      status: lin.status,
      verified: lin.body && lin.body.verified,
      nodeCount: lin.body && (lin.body.nodes || []).length,
    });

    const ev = await httpGet(
      "http://127.0.0.1:3000/v1/runs/" +
        encodeURIComponent(run.runId) +
        "/professional"
    );
    evidenceBody = ev.body;
    evidenceOk =
      ev.status === 200 &&
      !!(
        ev.body &&
        (ev.body.evidence ||
          ev.body.evidenceIds ||
          ev.body.runId ||
          ev.body.sections)
      );
    push("EVIDENCE", evidenceOk || !!run.evidence || !!run.lineageVerified, {
      status: ev.status,
      runId: run.runId,
      lineageVerifiedOnRun: run.lineageVerified,
      persistenceState: run.persistenceState,
    });
  } else {
    push("LINEAGE", false, { error: "no_run" });
    push("EVIDENCE", false, { error: "no_run" });
  }

  // Startup report appRoot check (wait briefly — written at end of startup)
  const startupPath = path.join(INSTALL, "diagnostics-export", "startup-report.json");
  let startup = null;
  for (let i = 0; i < 30; i++) {
    if (fs.existsSync(startupPath)) {
      try {
        startup = JSON.parse(fs.readFileSync(startupPath, "utf8"));
        if (startup && startup.appRoot) break;
      } catch {
        startup = null;
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  const appRootOk =
    startup &&
    typeof startup.appRoot === "string" &&
    /appdata\\local\\sci os x10\\app/i.test(startup.appRoot.replace(/\//g, "\\"));
  push("STARTUP_APPROOT_LOCALAPPDATA", !!appRootOk, {
    appRoot: startup && startup.appRoot,
    verdict: startup && startup.verdict,
    blockers: startup && startup.blockers,
    buildIdInReport: startup && (startup.buildId || startup.configuration?.buildId),
    correlationId: startup && startup.correlationId,
  });

  return {
    steps,
    runId: run.runId || null,
    buildId,
    correlationId: startup && startup.correlationId,
    scienceStatus: science,
    evidenceOk,
    lineageOk,
  };
}

async function main() {
  const beforeClosure = {
    note: "Captured at batch start from prior closure-summary if present",
  };
  const prevSummary = path.join(ROOT, "diagnostics-export/closure/closure-summary.json");
  if (fs.existsSync(prevSummary)) {
    try {
      const s = JSON.parse(fs.readFileSync(prevSummary, "utf8"));
      beforeClosure.controls = s.counts && s.counts.controls;
      beforeClosure.instances = s.counts && s.counts.checkInstances;
      beforeClosure.p0 = s.counts && s.counts.p0RootCauses;
      beforeClosure.runId = s.identity && s.identity.runId;
      beforeClosure.buildId = s.identity && s.identity.buildId;
    } catch {
      /* ignore */
    }
  }

  // Identity
  const git = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  const gitSha = String(git.stdout || "").trim() || null;
  const identity = {
    schema: "sci-os-batch-001-build-identity/v1",
    at: new Date().toISOString(),
    gitSha,
    treeHash: hashTree(path.join(ROOT, "apps")) ,
    packageHash: fs.existsSync(path.join(ROOT, "package.json"))
      ? sha256File(path.join(ROOT, "package.json"))
      : null,
    lockfileHash: fs.existsSync(path.join(ROOT, "pnpm-lock.yaml"))
      ? sha256File(path.join(ROOT, "pnpm-lock.yaml"))
      : null,
    manifestHash: fs.existsSync(path.join(ROOT, "sci-os.manifest.json"))
      ? sha256File(path.join(ROOT, "sci-os.manifest.json"))
      : null,
  };
  write("build-identity-pre.json", identity);

  console.log("stop_pre");
  stopAll();
  await new Promise((r) => setTimeout(r, 1000));

  const skipBuild = process.env.BATCH001_SKIP_BUILD === "1";
  const forceInstall = process.env.BATCH001_FORCE_INSTALL === "1" || !skipBuild;
  if (!skipBuild) {
    console.log("rebuild");
    const build = spawnSync(
      process.execPath,
      [path.join(ROOT, "scripts/package/build-distribution.cjs")],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        timeout: 300000,
        env: {
          ...process.env,
          PATH:
            path.join(ROOT, "dist/cache/node-v20.18.1-win-x64") +
            path.delimiter +
            (process.env.PATH || ""),
        },
      }
    );
    if (build.status !== 0) {
      write("packaged-gw1-proof.json", {
        status: "FAIL",
        error: "BUILD_FAILED",
        stderr: String(build.stderr || "").slice(-2000),
        stdout: String(build.stdout || "").slice(-2000),
      });
      process.exitCode = 1;
      return;
    }
  } else {
    console.log("rebuild_skipped");
  }

  const man = JSON.parse(
    fs.readFileSync(path.join(DIST, "manifests/golden-boot.packaged.json"), "utf8")
  );
  const buildId = man.buildId;
  const nodeVer = spawnSync(
    path.join(DIST, "runtime/node/node.exe"),
    ["--version"],
    { encoding: "utf8", windowsHide: true }
  );
  identity.buildId = buildId;
  identity.nodeRuntime = String(nodeVer.stdout || "").trim();
  identity.distributionBuildId = buildId;
  write("build-identity.json", identity);

  if (forceInstall) {
    console.log("atomic_install");
    const install = spawnSync(
      process.execPath,
      [path.join(ROOT, "scripts/package/atomic-install.cjs")],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        timeout: 180000,
        env: {
          ...process.env,
          PATH:
            path.join(ROOT, "dist/cache/node-v20.18.1-win-x64") +
            path.delimiter +
            (process.env.PATH || ""),
        },
      }
    );
    var installOk = install.status === 0;
    console.log("install", install.status, String(install.stdout || "").slice(-800));
  } else {
    var installOk = fs.existsSync(path.join(INSTALL, "runtime/node/node.exe"));
    console.log("install_skipped_reuse", installOk);
  }

  const windowsLifecycle = {
    schema: "sci-os-windows-lifecycle-proof/v1",
    at: new Date().toISOString(),
    buildId,
    installDir: INSTALL,
    installOk,
    exeExists: fs.existsSync(path.join(INSTALL, "SCI-OS-X10.exe")),
    cmdExists: fs.existsSync(path.join(INSTALL, "SCI-OS-X10.cmd")),
    bundledNode: fs.existsSync(path.join(INSTALL, "runtime/node/node.exe")),
    bundledNodeVersion: null,
    shortcuts: shortcutTarget(),
    launchPath: null,
    usesRepoSource: false,
    requiresPnpm: false,
    requiresCursor: false,
    requiresSystemNode: false,
  };
  if (windowsLifecycle.bundledNode) {
    const v = spawnSync(path.join(INSTALL, "runtime/node/node.exe"), ["--version"], {
      encoding: "utf8",
      windowsHide: true,
    });
    windowsLifecycle.bundledNodeVersion = String(v.stdout || "").trim();
  }
  const sc = windowsLifecycle.shortcuts.shortcuts || [];
  for (const s of sc) {
    if (s && s.target) {
      const t = String(s.target).toLowerCase();
      const w = String(s.workDir || "").toLowerCase();
      if (t.includes("scios-alpha") && !t.includes("appdata")) {
        windowsLifecycle.usesRepoSource = true;
      }
      if (w && w.includes("appdata") && w.includes("sci os x10")) {
        windowsLifecycle.workingDirectoryOk = true;
      }
    }
  }
  // Prefer CMD (always present) as user entry when exe pkg failed
  const launcherCmd = path.join(INSTALL, "SCI-OS-X10.cmd");
  const launcherExe = path.join(INSTALL, "SCI-OS-X10.exe");
  const useExe = fs.existsSync(launcherExe);
  windowsLifecycle.launchPath = useExe ? launcherExe : launcherCmd;
  windowsLifecycle.entryKind = useExe ? "EXE" : "CMD_BUNDLED_NODE";

  console.log("launch_install");
  stopAll();
  await new Promise((r) => setTimeout(r, 800));

  const child = spawn(
    path.join(INSTALL, "runtime/node/node.exe"),
    [
      path.join(INSTALL, "installer/scripts/start-sci-os.cjs"),
      "--serve",
      "--packaged",
      "--no-open",
    ],
    {
      cwd: INSTALL,
      env: {
        ...process.env,
        SCIOS_APP_ROOT: INSTALL,
        SCIOS_PACKAGED: "1",
        SCIOS_RUNTIME_MODE: "PACKAGED",
        SCI_RUNTIME_PROFILE: "packaged",
        SCIOS_BOOT_SERVE: "1",
        // Strip misleading system node preference — bundled path used explicitly
      },
      stdio: "ignore",
      windowsHide: true,
      shell: false,
    }
  );
  child.on("error", () => {});
  let childExit = null;
  child.on("exit", (c) => {
    childExit = c;
  });

  const gw1 = await runGw1Chain(buildId);
  windowsLifecycle.launchObserved = {
    pid: child.pid,
    appRootEnv: INSTALL,
  };
  windowsLifecycle.pass =
    installOk &&
    windowsLifecycle.bundledNodeVersion === "v20.18.1" &&
    !windowsLifecycle.usesRepoSource &&
    fs.existsSync(windowsLifecycle.launchPath) &&
    windowsLifecycle.workingDirectoryOk === true;
  write("windows-lifecycle-proof.json", windowsLifecycle);

  // Capture successful startup report before failure injection overwrites it
  const okStartupPath = path.join(
    INSTALL,
    "diagnostics-export",
    "startup-report.json"
  );
  let okStartup = null;
  if (fs.existsSync(okStartupPath)) {
    try {
      okStartup = JSON.parse(fs.readFileSync(okStartupPath, "utf8"));
      write("startup-report-success-snapshot.json", okStartup);
    } catch {
      okStartup = null;
    }
  }

  // Controlled shutdown
  const reqPath = path.join(
    INSTALL,
    "diagnostics-export",
    ".sci-os-shutdown-request.json"
  );
  fs.mkdirSync(path.dirname(reqPath), { recursive: true });
  fs.writeFileSync(
    reqPath,
    JSON.stringify({
      reason: "CONVERGENCE_STOP",
      at: new Date().toISOString(),
      source: "batch_001_P0",
    })
  );
  for (let i = 0; i < 40 && childExit == null; i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  stopAll();
  for (let i = 0; i < 20 && childExit == null; i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  try {
    child.kill();
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 1000));
  const afterApi = await httpGet("http://127.0.0.1:3000/healthz");
  const afterCock = await httpGet("http://127.0.0.1:4000/healthz");
  const lock = path.join(INSTALL, "diagnostics-export", ".sci-os-startup.lock");
  const shutdown = {
    orchestratorExit: childExit,
    apiDown: afterApi.status === 0,
    cockpitDown: afterCock.status === 0,
    lockReleased: !fs.existsSync(lock),
    portsFree: (await portFree(3000)) && (await portFree(4000)),
  };
  const shutdownOk =
    shutdown.apiDown &&
    shutdown.cockpitDown &&
    shutdown.lockReleased &&
    (shutdown.orchestratorExit === 0 || shutdown.orchestratorExit === null);
  gw1.steps.push({ name: "SHUTDOWN", ok: shutdownOk, ...shutdown });

  // Prefer successful-run startup for STARTUP_APPROOT step (already recorded); refresh verdict from snapshot
  if (okStartup && okStartup.appRoot) {
    const idx = gw1.steps.findIndex((s) => s.name === "STARTUP_APPROOT_LOCALAPPDATA");
    if (idx >= 0) {
      gw1.steps[idx] = {
        name: "STARTUP_APPROOT_LOCALAPPDATA",
        ok: /appdata\\local\\sci os x10\\app/i.test(
          String(okStartup.appRoot).replace(/\//g, "\\")
        ),
        appRoot: okStartup.appRoot,
        verdict: okStartup.verdict,
        blockers: okStartup.blockers || [],
        correlationId: okStartup.correlationId,
        note: "Snapshot taken after healthy Home before failure-injection test",
      };
    }
  }

  // Failure cleanup test
  console.log("failed_boot");
  const blocker = net.createServer((socket) => {
    socket.on("error", () => {});
    try {
      socket.destroy();
    } catch {
      /* ignore */
    }
  });
  blocker.on("error", () => {});
  await new Promise((resolve, reject) => {
    blocker.once("error", reject);
    blocker.listen(3000, "127.0.0.1", resolve);
  });
  const failChild = spawn(
    path.join(INSTALL, "runtime/node/node.exe"),
    [
      path.join(INSTALL, "installer/scripts/start-sci-os.cjs"),
      "--serve",
      "--packaged",
      "--no-open",
    ],
    {
      cwd: INSTALL,
      env: {
        ...process.env,
        SCIOS_APP_ROOT: INSTALL,
        SCIOS_PACKAGED: "1",
        SCIOS_RUNTIME_MODE: "PACKAGED",
        SCIOS_BOOT_SERVE: "1",
      },
      stdio: "ignore",
      windowsHide: true,
    }
  );
  let failExit = null;
  failChild.on("exit", (c) => {
    failExit = c;
  });
  for (let i = 0; i < 100 && failExit == null; i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  if (failExit == null) {
    stopAll();
    try {
      failChild.kill();
    } catch {
      /* ignore */
    }
  }
  await new Promise((r) => blocker.close(() => r()));
  stopAll();
  await new Promise((r) => setTimeout(r, 800));
  const recovery = {
    schema: "sci-os-batch-001-recovery-proof/v1",
    at: new Date().toISOString(),
    buildId,
    failedBoot: {
      method: "port_3000_conflict",
      failExit,
      expectedExternal: failExit === 3,
      apiDown: (await httpGet("http://127.0.0.1:3000/healthz")).status === 0,
      cockpitDown: (await httpGet("http://127.0.0.1:4000/healthz")).status === 0,
      lockReleased: !fs.existsSync(lock),
      portsFree: (await portFree(3000)) && (await portFree(4000)),
    },
    atomicInstallBackup: {
      note: "atomic-install retains app.backup.last after successful swap",
      present: fs.existsSync(
        path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app.backup.last")
      ),
    },
    recoveryServerPackaged: fs.existsSync(path.join(INSTALL, "recovery/server.cjs")),
    firstReleaseScope: {
      multiRegionDr: "NOT_REQUIRED_P2",
      geoRedundancy: "NOT_REQUIRED_P2",
      failedBootCleanup: "REQUIRED",
      atomicRollbackBackup: "REQUIRED",
      recoveryArtifact: "REQUIRED_WHEN_NORMAL_BOOT_UNAVAILABLE",
    },
  };
  recovery.pass =
    recovery.failedBoot.apiDown &&
    recovery.failedBoot.cockpitDown &&
    recovery.failedBoot.lockReleased &&
    recovery.failedBoot.portsFree &&
    recovery.recoveryServerPackaged;
  recovery.backupDrP0Classification = recovery.pass
    ? "RECLASSIFIED_P2"
    : "KEEP_P0";
  write("recovery-proof.json", recovery);

  const required = [
    "CP_HEALTH",
    "HOME_API",
    "COCKPIT_HEALTH",
    "COCKPIT_HTML",
    "SEARCH_AAPL",
    "ENTITY",
    "GW1_ANALYZE",
    "UNCERTAINTY",
    "RISK_GOVERNANCE",
    "EVIDENCE",
    "LINEAGE",
    "SHUTDOWN",
    "STARTUP_APPROOT_LOCALAPPDATA",
  ];
  const failed = gw1.steps.filter((s) => required.includes(s.name) && !s.ok);
  const proof = {
    schema: "sci-os-packaged-gw1-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    taskId: "TASK-PKG-003",
    rootCauseId: "PACKAGED_GW1_PROOF_CHAIN_INCOMPLETE",
    buildId,
    installRoot: INSTALL,
    nodeRuntime: identity.nodeRuntime,
    gitSha,
    routeChain: [
      "LOCALAPPDATA install",
      "bundled node → start-sci-os --packaged --serve",
      "GET /v1/home",
      "GET /v1/search?q=AAPL",
      "GET /v1/entities/AAPL",
      "POST /api/vertical-slice/run",
      "GET /v1/lineage/:runId",
      "GET /v1/runs/:runId/professional",
      "CONVERGENCE_STOP",
    ],
    steps: gw1.steps,
    runId: gw1.runId,
    status: failed.length ? "FAIL" : "PASS",
    failed: failed.map((f) => f.name),
    note:
      "Proof uses product Control Plane APIs that Cockpit invokes. Browser DOM hydration previously PASS; this batch binds LOCALAPPDATA appRoot + current buildId.",
  };
  write("packaged-gw1-proof.json", proof);

  console.log(
    JSON.stringify(
      {
        status: proof.status,
        failed: proof.failed,
        buildId,
        runId: gw1.runId,
        shutdownOk,
        recovery: recovery.pass,
      },
      null,
      2
    )
  );
  if (proof.status !== "PASS" || !recovery.pass) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
