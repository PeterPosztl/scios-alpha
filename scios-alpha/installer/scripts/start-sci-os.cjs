"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync, spawn } = require("child_process");
const { resolveAppRoot } = require("./startup/resolve-app-root.cjs");
const { resolveNodeRuntime } = require("./startup/resolve-node-runtime.cjs");
const { resolveRuntimeEntries } = require("./startup/resolve-runtime-entries.cjs");
const { isPackagedLayout } = require("./startup/packaged-mode.cjs");
const { validateConfig, loadDotEnv, loadPackagedConfig } = require("./startup/validate-config.cjs");
const { classifyDocker } = require("./startup/classify-docker.cjs");
const { ensurePostgres } = require("./startup/ensure-postgres.cjs");
const { ensureRedis } = require("./startup/ensure-redis.cjs");
const { migrationGate } = require("./startup/migration-gate.cjs");
const { resolvePort } = require("./startup/resolve-port.cjs");
const {
  acquireProcessLock,
  releaseProcessLock,
  lockPath,
} = require("./startup/process-lock.cjs");
const { ProcessSupervisor } = require("./startup/process-supervisor.cjs");
const { projectHostTwin } = require("./host/digital-twin.cjs");
const { RecoveryIntelligence } = require("./host/recovery-intelligence.cjs");
const { HostEventProvider } = require("./host/event-provider.cjs");
const { healthGate } = require("./startup/health-gate.cjs");
const { assessWorkerReadiness } = require("./startup/worker-readiness.cjs");
const {
  writeStartupReport,
  writeJson,
  buildStartupReport,
} = require("./startup/startup-report.cjs");
const { createStartupLogger } = require("./startup/startup-logger.cjs");
const { createSupportBundle } = require("./startup/support-bundle.cjs");
const { enrichBlockers, describeFailure } = require("./startup/failure-catalog.cjs");
const { TransactionalBoot } = require("./startup/transactional-boot.cjs");
const {
  buildDesiredState,
  reconcileDesiredActual,
  writeReconcileEvidence,
} = require("./startup/desired-state.cjs");
const {
  exitCodeForVerdict,
  SHUTDOWN_REASONS,
} = require("./startup/exit-contract.cjs");

function parseArgs(argv) {
  const out = { mode: "normal", serve: false, open: true, packaged: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--mode=")) out.mode = a.slice(7);
    else if (a === "--serve" || a === "SCIOS_BOOT_SERVE=1") out.serve = true;
    else if (a === "--no-open") out.open = false;
    else if (a === "--packaged") out.packaged = true;
    else if (["normal", "repair", "safe", "proof"].includes(a)) out.mode = a;
  }
  if (process.env.SCIOS_BOOT_SERVE === "1") out.serve = true;
  if (process.env.SCIOS_PACKAGED === "1" || process.env.SCIOS_RUNTIME_MODE === "PACKAGED") {
    out.packaged = true;
  }
  return out;
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

function readBuildIdentity(appRoot) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(appRoot, "manifests", "build-identity.json"), "utf8")
    );
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const correlationId = crypto.randomUUID();
  const started = Date.now();
  const startedAt = new Date().toISOString();
  const repairActions = [];
  const recoveryAttempts = [];
  const warnings = [];
  const blockers = [];

  const rootRes = resolveAppRoot();
  if (!rootRes.ok) {
    const report = buildStartupReport({
      correlationId,
      timestamp: startedAt,
      durationMs: Date.now() - started,
      verdict: "NO_GO",
      blockers: ["ROOT_RESOLUTION_FAILED"],
      blockerDetails: [describeFailure("ROOT_RESOLUTION_FAILED")],
      appRoot: null,
      nextAction: "Launch from SCI OS repository root or set SCIOS_APP_ROOT",
      layout: null,
    });
    report.searchedPaths = rootRes.searchedPaths;
    try {
      const diag = path.join(process.cwd(), "diagnostics-export");
      writeStartupReport(diag, report);
      createSupportBundle(process.cwd(), correlationId);
    } catch {
      /* ignore */
    }
    console.log(JSON.stringify(report, null, 2));
    process.exit(
      exitCodeForVerdict({
        verdict: "NO_GO",
        blockers: ["ROOT_RESOLUTION_FAILED"],
        shutdownReason: SHUTDOWN_REASONS.STARTUP_FAILURE,
      })
    );
  }

  const appRoot = rootRes.appRoot;
  const packagedRuntime =
    args.packaged || rootRes.layout === "installed" || isPackagedLayout(appRoot);
  if (packagedRuntime) {
    process.env.SCIOS_PACKAGED = "1";
    process.env.SCIOS_RUNTIME_MODE = process.env.SCIOS_RUNTIME_MODE || "PACKAGED";
    try {
      loadPackagedConfig(appRoot);
    } catch (e) {
      blockers.push(e.code || "PACKAGED_CONFIG_MISSING");
    }
  } else {
    loadDotEnv(appRoot);
  }
  const logger = createStartupLogger(appRoot, correlationId);
  const diagDir = logger.diagDir;
  logger.info("startup_begin", { mode: args.mode, packaged: packagedRuntime });

  const txBoot = new TransactionalBoot({ correlationId, appRoot, diagDir });
  txBoot.begin("PRE_FLIGHT", { mode: args.mode, packaged: packagedRuntime });
  txBoot.pass({ argv: process.argv.slice(2) });

  txBoot.begin("RESOLVE_APP_ROOT", { layout: rootRes.layout });
  txBoot.pass({ appRoot });

  const node = resolveNodeRuntime(appRoot, { packaged: packagedRuntime });
  txBoot.begin("RESOLVE_RUNTIME", {
    packaged: packagedRuntime,
    path: node.path,
    source: node.source,
  });
  if (!node.usable) {
    txBoot.fail(node.failureClass || "RUNTIME_MISSING", { node });
    blockers.push(node.failureClass || "RUNTIME_MISSING");
  } else {
    txBoot.pass({
      usable: true,
      bundledPreferred: !!node.bundled || String(node.source || "").includes("bundled"),
      contractStatus: node.contractStatus,
    });
  }
  if (node.usable && node.contractStatus === "DEGRADED_OUTSIDE_ENGINES") {
    warnings.push(
      `Node contract: ${node.contractWarning || "outside package.json engines"} (path=${node.path})`
    );
  }

  const entries = resolveRuntimeEntries(appRoot, { packaged: packagedRuntime });
  if (!entries.ok) blockers.push("BUILD_ENTRY_MISSING");

  const config = validateConfig(appRoot, { packaged: packagedRuntime });
  txBoot.begin("VALIDATE_CONFIG", {});
  warnings.push(...config.warnings);
  if (!config.valid) {
    txBoot.fail("CONFIG_INVALID", { config });
    blockers.push("CONFIG_INVALID");
  } else {
    txBoot.pass({ runtimeMode: config.redactedConfig?.runtimeMode });
  }

  let docker = { status: "SKIPPED_SAFE" };
  let postgres = ensurePostgres();
  let redis = { classification: "SKIPPED" };
  let migrations = migrationGate();

  if (args.mode !== "safe") {
    docker = classifyDocker();
    if (docker.status !== "AVAILABLE") {
      warnings.push(`Docker: ${docker.status}`);
    }
    redis = await ensureRedis();
    if (redis.configured && !redis.reachable) {
      warnings.push("Redis configured but unreachable — queues disabled");
    }
  } else {
    warnings.push("Safe Mode: skipped Docker/Redis mutations");
  }

  if (postgres.configured && postgres.failureClass) {
    warnings.push(postgres.note || postgres.failureClass);
  }

  const apiPort = config.redactedConfig.apiPort;
  const cockpitPort = config.redactedConfig.cockpitPort;
  const apiPortState = await resolvePort(apiPort, "/healthz");
  const cockpitPortState = await resolvePort(cockpitPort, "/healthz");

  if (apiPortState.state === "OCCUPIED_FOREIGN") {
    blockers.push("PORT_CONFLICT");
  }
  if (cockpitPortState.state === "OCCUPIED_FOREIGN") {
    warnings.push(`Cockpit port ${cockpitPort} occupied by foreign process`);
  }

  let lock = { ok: true };
  if (args.mode !== "safe") {
    lock = acquireProcessLock(appRoot, {
      runtimeMode: config.redactedConfig.runtimeMode,
      apiPort,
      mode: args.mode,
    });
    if (lock.repairedStaleLock) {
      repairActions.push({
        problem: "stale process lock",
        action: "remove_stale_lock",
        result: "ok",
        residualRisk: "none",
      });
    }
    if (!lock.ok) {
      blockers.push("PROCESS_LOCKED");
    }
  }

  txBoot.begin("CLAIM_RESOURCES", { apiPort, cockpitPort });
  if (blockers.includes("PORT_CONFLICT") || blockers.includes("PROCESS_LOCKED")) {
    txBoot.fail("CLAIM_FAILED", { lock, apiPortState, cockpitPortState });
  } else {
    txBoot.pass({ lockOk: lock.ok, apiPort, cockpitPort });
  }

  // Repair mode: DEVELOPMENT leaf boot only — PACKAGED must not require source scripts/boot
  if (args.mode === "repair" && node.usable && !packagedRuntime) {
    const r = spawnSync(
      process.execPath,
      [path.join(appRoot, "scripts/boot/index.mjs"), "repair"],
      { cwd: appRoot, encoding: "utf8", shell: false }
    );
    repairActions.push({
      problem: "known alpha repairs",
      action: "scripts/boot repair",
      result: r.status === 0 ? "ok" : "failed",
      detail: (r.stdout || "").slice(-400),
      residualRisk: "low",
    });
    if (r.status !== 0) blockers.push("REPAIR_FAILED");
  } else if (args.mode === "repair" && packagedRuntime) {
    repairActions.push({
      problem: "packaged repair",
      action: "skip_source_leaf_boot",
      result: "ok",
      residualRisk: "use SCI-OS-Repair.bat / repair-sci-os.cjs",
    });
  }

  // Proof mode: startup convergence proof (local-foundation). CI feature gate is advisory.
  let proofGate = null;
  if (args.mode === "proof" && node.usable) {
    const r = spawnSync(
      process.execPath,
      [path.join(appRoot, "installer/scripts/convergence/startup-proof.cjs")],
      {
        cwd: appRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          SCI_RUNTIME_PROFILE: process.env.SCI_RUNTIME_PROFILE || "local-foundation",
          EXECUTION_MODE: process.env.EXECUTION_MODE || "SIMULATION_ONLY",
        },
      }
    );
    proofGate = { exitCode: r.status, ok: r.status === 0, kind: "startup-convergence" };
    if (r.status !== 0) blockers.push("PROOF_GATE_FAILED");
  }

  const supervisor = node.usable
    ? new ProcessSupervisor(appRoot, node.path, {
        bootId: correlationId,
        runId: correlationId,
        buildId: (readBuildIdentity(appRoot) && readBuildIdentity(appRoot).buildId) || null,
        startedAt,
        ports: { "control-plane": apiPort, cockpit: cockpitPort },
      })
    : null;
  if (supervisor) {
    const hostInit = await supervisor.initHostLayer();
    recoveryAttempts.push({
      action: "whi-001-job-object-init",
      ok: !!(hostInit && hostInit.ok !== false),
      status: hostInit && hostInit.data && hostInit.data.status,
      degraded: hostInit && hostInit.degraded === true,
    });
  }
  let services = {};
  let health = null;
  let desktop = {
    kind: "http-cockpit",
    electron: false,
    url: null,
    opened: false,
    status: "ABSENT_ELECTRON",
  };

  const canStart =
    args.mode !== "safe" &&
    node.usable &&
    entries.ok &&
    lock.ok &&
    !blockers.includes("PORT_CONFLICT") &&
    apiPortState.state !== "OCCUPIED_FOREIGN";

  if (args.mode === "safe") {
    if (packagedRuntime) {
      const recoveryEntry =
        (entries.entries.recovery && entries.entries.recovery.path) ||
        path.join(appRoot, "recovery", "server.cjs");
      if (!fs.existsSync(recoveryEntry)) {
        blockers.push("RECOVERY_ARTIFACT_MISSING");
        recoveryAttempts.push({
          action: "packaged-safe-recovery",
          ok: false,
          detail: recoveryEntry,
        });
      } else {
        const r = spawnSync(node.path, [recoveryEntry], {
          cwd: appRoot,
          encoding: "utf8",
          shell: false,
          env: {
            ...process.env,
            SCIOS_APP_ROOT: appRoot,
            SCIOS_PACKAGED: "1",
            SCIOS_RUNTIME_MODE: "PACKAGED",
            PORT: process.env.SCIOS_RECOVERY_PORT || "5299",
          },
          timeout: 8000,
        });
        recoveryAttempts.push({
          action: "packaged-safe-recovery",
          exitCode: r.status,
        });
        // Recovery shell may stay detached separately; non-zero start attempt is soft for safe.
        if (r.error) blockers.push("SAFE_MODE_FAILED");
      }
    } else {
      const r = spawnSync(
        process.execPath,
        [path.join(appRoot, "scripts/boot/index.mjs"), "safe"],
        { cwd: appRoot, encoding: "utf8", shell: false }
      );
      recoveryAttempts.push({ action: "leaf-boot-safe", exitCode: r.status });
      if (r.status !== 0) blockers.push("SAFE_MODE_FAILED");
    }
  } else if (canStart && supervisor) {
    txBoot.begin("START_CORE", { apiPort });
    async function ensureService(name, port, filterPkg, env, prior) {
      if (prior.action === "reuse") {
        const again = await resolvePort(port, "/healthz");
        if (again.state === "SCI_OS_HEALTHY") {
          repairActions.push({
            problem: `${name} already healthy`,
            action: `reuse_${name}`,
            result: "ok",
          });
          return true;
        }
        warnings.push(`${name} looked healthy then failed — restarting`);
        recoveryAttempts.push({ action: `restart_${name}`, prior: again });
      }

      if (packagedRuntime) {
        const entryKey = name === "control-plane" ? "backend" : "cockpit";
        const entryPath =
          (entries.entries[entryKey] && entries.entries[entryKey].path) ||
          entries[entryKey];
        if (!entryPath) {
          blockers.push("BUILD_ENTRY_MISSING");
          recoveryAttempts.push({
            action: `packaged_start_${name}`,
            ok: false,
            detail: `missing entry ${entryKey}`,
          });
          return false;
        }
        // PACKAGED: bundled Node → artifact. Never pnpm/tsx/system toolchain.
        // Parent-owned when --serve so failed boot / shutdown can stop the tree.
        await supervisor.start(name, node.path, [entryPath], {
          shell: false,
          cwd: appRoot,
          detached: !args.serve,
          expectedPort: port,
          env: {
            ...env,
            SCIOS_APP_ROOT: appRoot,
            SCIOS_PACKAGED: "1",
            SCIOS_RUNTIME_MODE: "PACKAGED",
          },
        });
      } else {
        const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
        await supervisor.start(name, pnpmBin, ["--filter", filterPkg, "start"], {
          shell: false,
          detached: !args.serve,
          expectedPort: port,
          env,
        });
      }
      const wait = await supervisor.waitHealthy(
        name,
        `http://127.0.0.1:${port}/healthz`,
        25000
      );
      if (!wait.ok) {
        blockers.push(wait.failureClass || "HEALTH_TIMEOUT");
        recoveryAttempts.push(wait);
        return false;
      }
      return true;
    }

    await ensureService(
      "control-plane",
      apiPort,
      "@scios/control-plane-api",
      { PORT: String(apiPort) },
      apiPortState
    );
    if (blockers.includes("BACKEND_CRASHED") || blockers.includes("HEALTH_TIMEOUT")) {
      txBoot.fail("START_CORE_FAILED", { blockers: [...blockers] });
    } else {
      txBoot.pass({ controlPlane: true });
    }

    txBoot.begin("START_EXPERIENCE", { cockpitPort });
    if (!blockers.includes("BACKEND_CRASHED") && !blockers.includes("HEALTH_TIMEOUT")) {
      await ensureService(
        "cockpit",
        cockpitPort,
        "@scios/cockpit-ui",
        {
          PORT: String(cockpitPort),
          CONTROL_URL: `http://127.0.0.1:${apiPort}`,
        },
        cockpitPortState
      );
    }
    if (blockers.includes("HEALTH_TIMEOUT") || blockers.includes("BACKEND_CRASHED")) {
      txBoot.fail("START_EXPERIENCE_FAILED", { blockers: [...blockers] });
    } else {
      txBoot.pass({ cockpit: true });
    }

    health = await healthGate([
      {
        name: "control-plane",
        url: `http://127.0.0.1:${apiPort}/healthz`,
        required: true,
      },
      {
        name: "cockpit",
        url: `http://127.0.0.1:${cockpitPort}/healthz`,
        required: true,
      },
    ]);
    if (!health.ready) {
      // one bounded retry
      await new Promise((r) => setTimeout(r, 1000));
      health = await healthGate([
        {
          name: "control-plane",
          url: `http://127.0.0.1:${apiPort}/healthz`,
          required: true,
        },
        {
          name: "cockpit",
          url: `http://127.0.0.1:${cockpitPort}/healthz`,
          required: true,
        },
      ]);
    }
    if (health.blockers?.length) {
      for (const b of health.blockers) blockers.push(`HEALTH:${b}`);
    }

    txBoot.begin("VERIFY_CORE", { healthReady: !!(health && health.ready) });
    if (health && health.ready) {
      txBoot.pass({ health });
    } else {
      txBoot.fail("VERIFY_CORE_FAILED", { health });
    }

    // vertical slice smoke — PACKAGED must not require pnpm/dev toolchain
    if (packagedRuntime) {
      const smokeHttp = await (async () => {
        try {
          const payload = JSON.stringify({});
          const res = await new Promise((resolve) => {
            const req = require("http").request(
              {
                hostname: "127.0.0.1",
                port: apiPort,
                path: "/v1/foundation/worker-smoke",
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "content-length": Buffer.byteLength(payload),
                },
                timeout: 8000,
              },
              (r) => {
                const chunks = [];
                r.on("data", (c) => chunks.push(c));
                r.on("end", () =>
                  resolve({ status: r.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") })
                );
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
          return res.status === 200;
        } catch {
          return false;
        }
      })();
      recoveryAttempts.push({
        action: "packaged-worker-smoke-http",
        ok: smokeHttp,
      });
      if (!smokeHttp) blockers.push("VERTICAL_SLICE_SMOKE_FAILED");
    } else {
      const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
      const smoke = spawnSync(
        pnpmBin,
        ["--filter", "@scios/vertical-slice", "smoke"],
        {
          cwd: appRoot,
          encoding: "utf8",
          shell: false,
          windowsHide: true,
        }
      );
      recoveryAttempts.push({
        action: "vertical-slice-smoke",
        exitCode: smoke.status,
      });
      if (smoke.status !== 0) blockers.push("VERTICAL_SLICE_SMOKE_FAILED");
    }

    desktop.url = `http://127.0.0.1:${cockpitPort}/`;
    desktop.status = "HTTP_COCKPIT";
    // Transactional rule: no browser handoff before VERIFY_HOME PASS.
    const homeGate = await txBoot.verifyHome({ cockpitPort, apiPort });
    if (!homeGate.ok) {
      blockers.push("HOME_NOT_READY");
      desktop.opened = false;
      desktop.status = "HOME_VERIFY_FAILED";
    } else if (args.open && health && health.ready && desktop.url) {
      openBrowser(desktop.url);
      desktop.opened = true;
    }

    services = supervisor.snapshot();
    try {
      await projectHostTwin({
        appRoot,
        packaged: packagedRuntime,
        expectedLifecycle: "RUNNING",
        correlationId,
        runContext: supervisor.runContext,
        supervisor: supervisor.hostSnapshot(),
        apiPort,
        cockpitPort,
      });
    } catch (e) {
      warnings.push(`host-digital-twin: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      const twinPath = path.join(appRoot, "diagnostics-export", "host", "digital-twin.json");
      if (fs.existsSync(twinPath)) {
        const hostTwin = JSON.parse(fs.readFileSync(twinPath, "utf8"));
        const ri = new RecoveryIntelligence({ appRoot });
        const riResult = ri.evaluate(hostTwin, supervisor.runContext, supervisor.hostSnapshot());
        if (riResult.incidents && riResult.incidents.length > 0) {
          recoveryAttempts.push({
            action: "whi-010-recovery-intelligence",
            incidents: riResult.incidents.length,
            suppressed: riResult.suppressed || false,
            driftDetected: true,
          });
        }
        writeJson(diagDir, "recovery-intelligence.json", {
          schema: "sci-os-recovery-intelligence-boot/v1",
          at: new Date().toISOString(),
          ...riResult,
          snapshot: ri.snapshot(),
        });
      }
    } catch (e) {
      warnings.push(`recovery-intelligence: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      const hep = new HostEventProvider({
        appRoot,
        sciContext: { installRoot: appRoot, exeName: "SCI-OS-X10.exe", pids: [...supervisor.children.values()].map((c) => c.pid).filter(Boolean) },
        runContext: { buildId: supervisor.runContext.buildId, bootId: supervisor.runContext.bootId, runId: supervisor.runContext.runId, startedAt },
      });
      const hepResult = hep.query({ relevanceFilter: true, maxAgeMinutes: 30 });
      const twinProj = hep.twinProjection();
      writeJson(diagDir, "host-event-snapshot.json", {
        schema: "sci-os-host-event-boot/v1", at: new Date().toISOString(),
        signalState: twinProj.hostEventSignalState,
        recentRelevant: twinProj.recentRelevantHostEvents,
        perf: hepResult.perf || null,
      });
    } catch (e) {
      warnings.push(`host-event-provider: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const workers = assessWorkerReadiness({ redis });

  // Desired vs Actual reconciliation BEFORE transactional COMMIT (B02)
  const desired = buildDesiredState({
    packaged: packagedRuntime,
    apiPort,
    cockpitPort,
    profile: process.env.SCI_RUNTIME_PROFILE || "local-foundation",
  });
  let reconcile = null;
  const lockHeld = !!(lock && lock.ok && args.mode !== "safe");
  try {
    reconcile = await reconcileDesiredActual(desired, {
      node,
      health,
      appRoot,
      packaged: packagedRuntime,
      claimedReady: false,
      unknownMandatoryDeps: [],
      bootFailed: blockers.length > 0,
      lockReleased: false, // lock still held by this process until finalize
      lock: {
        acquired: lockHeld,
        ownerPid: process.pid,
        path: lockPath(appRoot),
        released: false,
      },
    });
    writeReconcileEvidence(diagDir, reconcile);
    if (reconcile && !reconcile.ok) {
      for (const g of reconcile.gaps || []) {
        if (g.severity === "P0" && g.id && !blockers.includes(`DESIRED:${g.id}`)) {
          if (
            String(g.id).startsWith("PACKAGED_") ||
            g.id === "PORT_COLLISION" ||
            g.id === "READY_WITH_MANDATORY_UNKNOWN" ||
            g.id === "CORE_NOT_READY" ||
            g.id === "SHELL_NOT_READY" ||
            g.id === "HOME_NOT_READY"
          ) {
            blockers.push(`DESIRED:${g.id}`);
          }
        }
      }
    }
  } catch (e) {
    warnings.push(`desired-state reconcile failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // COMMIT only after mandatory reconcile has no P0 blockers
  if (blockers.length) {
    txBoot.markRolledBack("MANDATORY_BLOCKERS_BEFORE_COMMIT", {
      blockers: [...blockers],
      reconcileOk: !!(reconcile && reconcile.ok),
    });
    txBoot.writeEvidence();
  } else {
    txBoot.commit({
      mode: args.mode,
      desktopOpened: desktop.opened,
      packaged: packagedRuntime,
      reconcileOk: !!(reconcile && reconcile.ok),
    });
    txBoot.writeEvidence();
  }

  // Verdict
  let verdict = "READY";
  if (blockers.length) verdict = "NO_GO";
  else if (
    warnings.length ||
    config.disabledSubsystems.includes("postgresql") ||
    config.disabledSubsystems.includes("redis") ||
    config.disabledSubsystems.includes("electron-desktop") ||
    workers.degraded ||
    (docker && docker.status && docker.status !== "AVAILABLE" && args.mode === "normal")
  ) {
    verdict = "DEGRADED";
  }
  if (args.mode === "safe" && blockers.length === 0) verdict = "DEGRADED";
  if (health && !health.ready && args.mode !== "safe") verdict = "NO_GO";

  const nextAction =
    verdict === "READY"
      ? "Use cockpit"
      : verdict === "DEGRADED"
        ? "Core cockpit usable; optional PG/Redis/Electron/Docker limited — see warnings"
        : blockers.includes("PROCESS_LOCKED")
          ? "sci:shutdown or use existing instance"
          : blockers.includes("PORT_CONFLICT")
            ? "Free port or change SCIOS_API_PORT"
            : "Open diagnostics-export/startup-report.json and Retry / Repair";

  const blockerDetails = enrichBlockers(blockers, path.join(diagDir, "startup-report.json"));

  const report = buildStartupReport({
    correlationId,
    timestamp: startedAt,
    durationMs: Date.now() - started,
    appRoot,
    layout: rootRes.layout,
    runtimeMode: config.redactedConfig.runtimeMode,
    mode: args.mode,
    node,
    entries: entries.entries,
    configuration: config,
    docker,
    postgres,
    redis,
    migrations,
    ports: { api: apiPortState, cockpit: cockpitPortState },
    processLock: lock,
    services,
    workers,
    health,
    readiness: health
      ? { ready: health.ready, degraded: health.degraded || workers.degraded }
      : { ready: false, degraded: args.mode === "safe" },
    desktop,
    safeMode: {
      active: args.mode === "safe",
      allows: [
        "diagnostics",
        "platform-status",
        "config-inspect",
        "contract-read",
        "slice-smoke-if-built",
      ],
      denies: [
        "workflow-writes-without-db",
        "queue-jobs",
        "real-execution",
        "model-promotion",
        "policy-modification",
        "destructive-migrations",
      ],
    },
    repairActions,
    recoveryAttempts,
    warnings,
    blockers,
    blockerDetails,
    nextAction,
    diagnostics: {
      startupLog: logger.logFile,
      report: path.join(diagDir, "startup-report.json"),
      transactionalBoot: path.join(diagDir, "transactional-boot.json"),
    },
    transactionalBoot: txBoot.snapshot(),
    desiredStateReconcile: reconcile,
    proofGate,
    verdict,
  });

  const reportPath = writeStartupReport(diagDir, report);
  if (args.mode === "proof") {
    writeJson(diagDir, "startup-proof.json", {
      gate: "prove-sci-os-startup",
      at: new Date().toISOString(),
      correlationId,
      verdict,
      executed: {
        appRoot: true,
        nodeRuntime: node.usable,
        entries: entries.ok,
        config: config.valid,
        diagnosticsWrite: true,
        dockerClassify: args.mode !== "safe",
        postgres: postgres.classification,
        redis: redis.classification,
        migrations: migrations.status,
        ports: true,
        processLock: args.mode !== "safe",
        backendHealth: !!(
          (health && health.components["control-plane"]) ||
          (health && health.components.controlPlane)
        ),
        cockpitHealth: !!(health && health.components.cockpit),
        workerReadiness: workers.status,
        verticalSliceSmoke: !blockers.includes("VERTICAL_SLICE_SMOKE_FAILED"),
        ciPredictionFoundation: proofGate,
        electronDesktop: false,
      },
      rule: "No evidence means UNKNOWN, never PASS",
      enterpriseClaim: false,
    });
  }

  let supportBundle = null;
  if (verdict === "NO_GO") {
    supportBundle = createSupportBundle(appRoot, correlationId);
    report.diagnostics.supportBundle = supportBundle;
    writeStartupReport(diagDir, report);
  }

  logger.info("startup_end", { verdict, blockers: blockers.length });

  console.log(
    JSON.stringify(
      {
        correlationId,
        mode: args.mode,
        verdict,
        nextAction,
        cockpit: desktop.url,
        diagnostics: reportPath,
        supportBundle: supportBundle && (supportBundle.zipPath || supportBundle.bundleDir),
        blockers,
        warnings: warnings.slice(0, 8),
      },
      null,
      2
    )
  );

  // Canonical exit contract (0 / 2 / 3) — see startup/exit-contract.cjs
  const startupExitCode = exitCodeForVerdict({
    verdict,
    blockers,
    blockerDetails: enrichBlockers(blockers),
    shutdownReason: null,
  });

  const shutdownRequestPath = path.join(diagDir, ".sci-os-shutdown-request.json");

  async function finalizeAndExit(shutdownReason) {
    const code = exitCodeForVerdict({
      verdict,
      blockers,
      blockerDetails: enrichBlockers(blockers),
      shutdownReason,
    });
    const cleanup = {
      at: new Date().toISOString(),
      reason: shutdownReason,
      shutdownReason,
      verdict,
      startupAccepted: verdict === "READY" || verdict === "DEGRADED",
      startupExitCode,
      stopAll: null,
      lockReleased: false,
      classification:
        verdict === "READY" || verdict === "DEGRADED"
          ? "STARTUP_PASS_SHUTDOWN_PASS"
          : "STARTUP_FAILURE",
    };
    try {
      if (supervisor) {
        cleanup.stopAll = await supervisor.stopAll();
        cleanup.hostLayer = await supervisor.closeHostLayer();
        try {
          await projectHostTwin({
            appRoot,
            packaged: packagedRuntime,
            expectedLifecycle: "STOPPED",
            correlationId,
            runContext: supervisor.runContext,
            supervisor: supervisor.hostSnapshot(),
          });
        } catch {
          /* observe-only */
        }
      }
    } catch (e) {
      cleanup.stopAllError = String(e.message || e);
    }
    try {
      releaseProcessLock(appRoot);
      cleanup.lockReleased = true;
    } catch (e) {
      cleanup.lockReleaseError = String(e.message || e);
    }
    try {
      if (fs.existsSync(shutdownRequestPath)) {
        fs.unlinkSync(shutdownRequestPath);
      }
    } catch {
      /* ignore */
    }
    try {
      writeJson(
        diagDir,
        code === 0 || cleanup.startupAccepted
          ? "shutdown-report.json"
          : "failure-finalize.json",
        {
          correlationId,
          ...cleanup,
          exitCode: code,
        }
      );
    } catch {
      /* ignore */
    }
    process.exit(code);
  }

  let shuttingDown = false;
  const requestShutdown = (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    void finalizeAndExit(reason);
  };

  process.on("SIGINT", () => {
    requestShutdown(SHUTDOWN_REASONS.SIGNAL_SHUTDOWN);
  });
  process.on("SIGTERM", () => {
    requestShutdown(SHUTDOWN_REASONS.SIGNAL_SHUTDOWN);
  });

  if (args.serve && verdict !== "NO_GO" && args.mode !== "safe") {
    logger.info("supervising", { verdict, exitCode: startupExitCode });
    // Graceful stop: stop.cjs writes this request → exit 0 after DEGRADED/READY.
    // Avoid Windows forced-kill exit 1 being mistaken for startup failure.
    setInterval(() => {
      try {
        if (!fs.existsSync(shutdownRequestPath)) return;
        let req = {};
        try {
          req = JSON.parse(fs.readFileSync(shutdownRequestPath, "utf8"));
        } catch {
          req = {};
        }
        const reason =
          req.reason && Object.values(SHUTDOWN_REASONS).includes(req.reason)
            ? req.reason
            : SHUTDOWN_REASONS.CONVERGENCE_STOP;
        requestShutdown(reason);
      } catch {
        /* ignore */
      }
    }, 400);
    setInterval(() => {}, 1 << 30);
  } else if (verdict === "NO_GO") {
    // B04: every mandatory failed boot must cleanup owned processes + lock
    await finalizeAndExit(SHUTDOWN_REASONS.NO_GO_FINALIZE);
  } else {
    process.exit(startupExitCode);
  }
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      verdict: "NO_GO",
      failureClass: "UNKNOWN_STARTUP_FAILURE",
      error: err instanceof Error ? err.message : String(err),
    })
  );
  process.exit(2);
});
