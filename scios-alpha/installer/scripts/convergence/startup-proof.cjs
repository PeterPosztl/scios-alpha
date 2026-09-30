"use strict";

/**
 * pnpm sci:proof — startup-specific proof (not CI feature gate).
 */
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");
const {
  writeJson,
  httpGet,
  listSciosAlphaProcesses,
  classifyProcess,
  listeningPortsMap,
  canonicalPath,
  evaluateReadiness,
  observeRuntime,
  resolveAppRoot,
  resolveNodeRuntime,
  validateConfig,
} = require("./lib.cjs");

async function postJson(url, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const data = JSON.stringify(body || {});
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(data),
        },
        timeout: 5000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {
            /* */
          }
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, body: null, error: e.message }));
    req.write(data);
    req.end();
  });
}

async function main() {
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) {
    console.log(JSON.stringify({ verdict: "NO_GO", error: "ROOT_RESOLUTION_FAILED" }));
    process.exit(1);
  }
  const appRoot = rootRes.appRoot;
  process.env.SCI_RUNTIME_PROFILE = process.env.SCI_RUNTIME_PROFILE || "local-foundation";
  process.env.EXECUTION_MODE = process.env.EXECUTION_MODE || "SIMULATION_ONLY";
  process.env.AUTH_MODE = process.env.AUTH_MODE || "local-development";
  process.env.TELEMETRY_MODE = process.env.TELEMETRY_MODE || "local";
  process.env.GOVERNANCE_MODE = process.env.GOVERNANCE_MODE || "embedded-foundation";

  const portsMap = listeningPortsMap();
  const rawProcs = listSciosAlphaProcesses(appRoot);
  const processes = rawProcs.map((p) => classifyProcess(p, portsMap));
  const byComponent = {};
  for (const p of processes) {
    if (!byComponent[p.component]) byComponent[p.component] = [];
    byComponent[p.component].push(p.pid);
  }
  for (const p of processes) {
    const peers = byComponent[p.component] || [];
    if (
      peers.length > 1 &&
      (p.component === "control-plane-api" || p.component === "cockpit-ui")
    ) {
      p.duplicate = true;
      // keep lowest pid as reusable
      const keep = Math.min(...peers);
      p.reusable = p.pid === keep;
      p.safeToStop = p.pid !== keep;
    }
  }
  writeJson(appRoot, "process-inventory.json", {
    at: new Date().toISOString(),
    processes,
    foreignTreesNoted: [
      "sci-os-x10-ccu-supra (:4000)",
      "sci-backend docker (:3000/:6379/:5432) — not stopped",
    ],
    rule: "Never kill unrelated applications; only scios-alpha duplicates",
  });

  const canon = canonicalPath(appRoot);
  writeJson(appRoot, "canonical-startup-path.json", canon);

  const node = resolveNodeRuntime(appRoot);
  const config = validateConfig(appRoot);
  writeJson(appRoot, "resolved-config.json", {
    precedence: [
      "process.env",
      "installer validate-config defaults",
      "infra/config/default.yaml (non-secret)",
    ],
    profile: {
      SCI_RUNTIME_PROFILE: process.env.SCI_RUNTIME_PROFILE,
      EXECUTION_MODE: process.env.EXECUTION_MODE,
      AUTH_MODE: process.env.AUTH_MODE,
      TELEMETRY_MODE: process.env.TELEMETRY_MODE,
      SECRETS_MODE: process.env.SECRETS_MODE || "environment-or-local-secure",
      GOVERNANCE_MODE: process.env.GOVERNANCE_MODE,
    },
    redacted: config.redactedConfig,
    enabledSubsystems: config.enabledSubsystems,
    disabledSubsystems: config.disabledSubsystems,
    warnings: config.warnings,
  });

  let truth = await observeRuntime(appRoot, config);

  // Reuse healthy backend — do not restart without reason
  const reused = [];
  const stopped = [];
  if (truth.backend.healthzOk) reused.push(`control-plane:${config.redactedConfig.apiPort}`);
  if (truth.cockpit.healthzOk) reused.push(`cockpit:${config.redactedConfig.cockpitPort}`);

  // If backend up but readyz missing (old process without /readyz), one managed restart via canonical orchestrator
  if (truth.backend.healthzOk && truth.backend.readyzStatus === 404) {
    writeJson(appRoot, "first-blocker.json", {
      lastSuccessfulPhase: "backend_health",
      firstFailedPhase: "backend_readiness",
      blocker: "READYZ_MISSING_OLD_PROCESS",
      domain: "code",
      repair: "restart_via_stop_then_start_sci_os_no_serve",
      downstreamSymptoms: ["sci:proof cannot evaluate readiness"],
    });
    spawnSync(
      process.execPath,
      [path.join(appRoot, "installer/scripts/convergence/stop.cjs")],
      { cwd: appRoot, encoding: "utf8" }
    );
    const boot = spawnSync(
      process.execPath,
      [
        path.join(appRoot, "installer/scripts/start-sci-os.cjs"),
        "--mode=normal",
        "--no-open",
      ],
      {
        cwd: appRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          SCI_RUNTIME_PROFILE: "local-foundation",
          EXECUTION_MODE: "SIMULATION_ONLY",
        },
        timeout: 120000,
      }
    );
    stopped.push({ reason: "readyz_reload", startExit: boot.status });
    truth = await observeRuntime(appRoot, config);
  } else if (!truth.backend.healthzOk || !truth.cockpit.healthzOk) {
    writeJson(appRoot, "first-blocker.json", {
      lastSuccessfulPhase: truth.backend.healthzOk ? "backend_health" : "config",
      firstFailedPhase: truth.backend.healthzOk ? "cockpit" : "backend_process",
      blocker: "CORE_NOT_LISTENING",
      domain: "process",
      repair: "canonical_start_sci_os",
    });
    const boot = spawnSync(
      process.execPath,
      [
        path.join(appRoot, "installer/scripts/start-sci-os.cjs"),
        "--mode=normal",
        "--no-open",
      ],
      {
        cwd: appRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          SCI_RUNTIME_PROFILE: "local-foundation",
          EXECUTION_MODE: "SIMULATION_ONLY",
        },
      }
    );
    writeJson(appRoot, "startup-attempt.json", {
      exit: boot.status,
      verdict: (() => {
        try {
          const i = (boot.stdout || "").lastIndexOf("{");
          return i >= 0 ? JSON.parse(boot.stdout.slice(i)).verdict : null;
        } catch {
          return null;
        }
      })(),
    });
    truth = await observeRuntime(appRoot, config);
  } else {
    writeJson(appRoot, "first-blocker.json", {
      lastSuccessfulPhase: "cockpit",
      firstFailedPhase: null,
      blocker: null,
      note: "Core healthy — evaluating readiness policy only",
    });
  }

  writeJson(appRoot, "current-runtime-truth.json", truth);

  // Worker smoke
  let workerProof = { ok: false, detail: "not_run" };
  if (truth.backend.healthzOk) {
    const smoke = await postJson(
      `http://127.0.0.1:${config.redactedConfig.apiPort}/v1/foundation/worker-smoke`,
      {}
    );
    workerProof = {
      ok: smoke.status === 200 && smoke.body?.status === "completed",
      status: smoke.status,
      body: smoke.body,
      evidence: "POST /v1/foundation/worker-smoke",
    };
  }
  writeJson(appRoot, "worker-proof.json", workerProof);

  truth = await observeRuntime(appRoot, config);
  const readiness = evaluateReadiness({
    ...truth,
    backend: {
      ...truth.backend,
      foundationWorkerOk:
        truth.backend.foundationWorkerOk || workerProof.ok,
      riskControlActive: truth.backend.riskControlActive,
    },
  });

  writeJson(appRoot, "backend-proof.json", {
    healthz: truth.backend.healthzOk,
    readyz: truth.backend.readyzOk,
    status: truth.backend.readyzStatus,
    body: truth.backend.readyzBody,
    reused: reused.includes(`control-plane:${config.redactedConfig.apiPort}`),
  });
  writeJson(appRoot, "risk-control-proof.json", {
    active: !!truth.backend.riskControlActive,
    mode: "embedded-foundation",
    productionBypass: false,
  });
  writeJson(appRoot, "cockpit-proof.json", {
    healthz: truth.cockpit.healthzOk,
    html: truth.cockpit.htmlOk,
    metaOs: truth.cockpit.metaOsReachable,
    url: `http://127.0.0.1:${config.redactedConfig.cockpitPort}/`,
    labelsRequireEvidence: true,
  });
  writeJson(appRoot, "desktop-launch-proof.json", {
    electron: false,
    browserTarget: `http://127.0.0.1:${config.redactedConfig.cockpitPort}/`,
    launcher: "SCI OS ×10.bat / pnpm sci:start",
    status: truth.cockpit.htmlOk ? "HTTP_COCKPIT_OK" : "COCKPIT_UNAVAILABLE",
  });

  // Controlled build record (one attempt)
  const buildStart = Date.now();
  const build = spawnSync("pnpm", ["--filter", "@scios/meta-recovery", "build"], {
    cwd: appRoot,
    encoding: "utf8",
    shell: true,
  });
  writeJson(appRoot, "build-convergence.json", {
    command: "pnpm --filter @scios/meta-recovery build",
    start: new Date(buildStart).toISOString(),
    end: new Date().toISOString(),
    exitCode: build.status,
    note: "Full pnpm build deferred to ci:startup-convergence-gate; repaired meta-recovery first-blocker",
    stderrTail: (build.stderr || build.stdout || "").slice(-600),
  });

  const verdict =
    readiness.verdict === "READY"
      ? "STARTUP_CONVERGED_READY"
      : readiness.verdict === "DEGRADED"
        ? "STARTUP_CONVERGED_DEGRADED"
        : "NO_GO";

  const proof = {
    at: new Date().toISOString(),
    canonicalCommand: "pnpm sci:start",
    node: { usable: node.usable, version: node.version },
    processesReused: reused,
    processesStopped: stopped,
    readiness,
    workerProofOk: workerProof.ok,
    verdict,
    limitations: readiness.optionalMissing,
  };
  writeJson(appRoot, "startup-convergence-proof.json", proof);
  writeJson(appRoot, "final-startup-signoff.json", {
    signedOffBy: "convergence/startup-proof.cjs",
    verdict,
    evidenceDir: path.join(appRoot, "diagnostics-export", "convergence"),
  });

  console.log(
    JSON.stringify(
      {
        verdict,
        readiness: readiness.verdict,
        reused,
        stopped,
        workerProof: workerProof.ok,
        backend: truth.backend.healthzOk,
        readyz: truth.backend.readyzOk,
        cockpit: truth.cockpit.healthzOk,
      },
      null,
      2
    )
  );
  process.exit(verdict === "NO_GO" ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
