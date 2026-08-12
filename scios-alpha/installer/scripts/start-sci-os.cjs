"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync, spawn } = require("child_process");
const { resolveAppRoot } = require("./startup/resolve-app-root.cjs");
const { resolveNodeRuntime } = require("./startup/resolve-node-runtime.cjs");
const { resolveRuntimeEntries } = require("./startup/resolve-runtime-entries.cjs");
const { validateConfig, loadDotEnv } = require("./startup/validate-config.cjs");
const { classifyDocker } = require("./startup/classify-docker.cjs");
const { ensurePostgres } = require("./startup/ensure-postgres.cjs");
const { ensureRedis } = require("./startup/ensure-redis.cjs");
const { migrationGate } = require("./startup/migration-gate.cjs");
const { resolvePort } = require("./startup/resolve-port.cjs");
const {
  acquireProcessLock,
  releaseProcessLock,
} = require("./startup/process-lock.cjs");
const { ProcessSupervisor } = require("./startup/process-supervisor.cjs");
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

function parseArgs(argv) {
  const out = { mode: "normal", serve: false, open: true };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--mode=")) out.mode = a.slice(7);
    else if (a === "--serve" || a === "SCIOS_BOOT_SERVE=1") out.serve = true;
    else if (a === "--no-open") out.open = false;
    else if (["normal", "repair", "safe", "proof"].includes(a)) out.mode = a;
  }
  if (process.env.SCIOS_BOOT_SERVE === "1") out.serve = true;
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
    process.exit(1);
  }

  const appRoot = rootRes.appRoot;
  loadDotEnv(appRoot);
  const logger = createStartupLogger(appRoot, correlationId);
  const diagDir = logger.diagDir;
  logger.info("startup_begin", { mode: args.mode });

  const node = resolveNodeRuntime(appRoot);
  if (!node.usable) {
    blockers.push(node.failureClass || "RUNTIME_MISSING");
  }

  const entries = resolveRuntimeEntries(appRoot);
  if (!entries.ok) blockers.push("BUILD_ENTRY_MISSING");

  const config = validateConfig(appRoot);
  warnings.push(...config.warnings);
  if (!config.valid) blockers.push("CONFIG_INVALID");

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

  // Repair mode: run leaf alpha boot repair (fixtures/install/build) — not sci:start
  if (args.mode === "repair" && node.usable) {
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

  const supervisor = node.usable ? new ProcessSupervisor(appRoot, node.path) : null;
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
    const r = spawnSync(
      process.execPath,
      [path.join(appRoot, "scripts/boot/index.mjs"), "safe"],
      { cwd: appRoot, encoding: "utf8", shell: false }
    );
    recoveryAttempts.push({ action: "leaf-boot-safe", exitCode: r.status });
    if (r.status !== 0) blockers.push("SAFE_MODE_FAILED");
  } else if (canStart && supervisor) {
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
      supervisor.start(name, "pnpm", ["--filter", filterPkg, "start"], {
        shell: true,
        env,
      });
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

    // vertical slice smoke (readiness of prediction spine)
    const smoke = spawnSync("pnpm", ["--filter", "@scios/vertical-slice", "smoke"], {
      cwd: appRoot,
      encoding: "utf8",
      shell: true,
    });
    recoveryAttempts.push({ action: "vertical-slice-smoke", exitCode: smoke.status });
    if (smoke.status !== 0) blockers.push("VERTICAL_SLICE_SMOKE_FAILED");

    desktop.url = `http://127.0.0.1:${cockpitPort}/`;
    desktop.status = "HTTP_COCKPIT";
    if (args.open && health && health.ready) {
      openBrowser(desktop.url);
      desktop.opened = true;
    }

    services = supervisor.snapshot();
  }

  const workers = assessWorkerReadiness({ redis });

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
    },
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

  const shutdown = async () => {
    if (supervisor) await supervisor.stopAll();
    releaseProcessLock(appRoot);
    writeJson(diagDir, "shutdown-report.json", {
      correlationId,
      at: new Date().toISOString(),
      verdict: "SHUTDOWN_COMPLETE",
    });
    process.exit(verdict === "NO_GO" ? 1 : 0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  if (args.serve && verdict !== "NO_GO" && args.mode !== "safe") {
    logger.info("supervising");
    setInterval(() => {}, 1 << 30);
  } else {
    process.exit(verdict === "NO_GO" ? 1 : 0);
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
  process.exit(1);
});
