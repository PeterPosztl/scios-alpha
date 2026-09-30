"use strict";

/**
 * SCI OS ×10 — Startup Convergence (P0 last-mile)
 * Freezes optional enterprise scope; invents no new intelligence planes.
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");
const { resolveAppRoot } = require("../startup/resolve-app-root.cjs");
const { resolveNodeRuntime } = require("../startup/resolve-node-runtime.cjs");
const { validateConfig } = require("../startup/validate-config.cjs");

const OUT = "diagnostics-export/convergence";

function writeJson(appRoot, name, data) {
  const dir = path.join(appRoot, OUT);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

function httpGet(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body = raw;
        try {
          body = JSON.parse(raw);
        } catch {
          /* text */
        }
        resolve({ status: res.statusCode || 0, body, raw });
      });
    });
    req.on("error", (e) => resolve({ status: 0, body: null, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: null, error: "timeout" });
    });
  });
}

/**
 * Discover SCI OS processes belonging to one installation.
 *
 * appRoot is required to see an installed instance: installed command lines
 * carry the install path ("SCI OS X10\app"), never the dev folder name, so a
 * 'scios-alpha' filter alone is blind to every packaged process and leaves
 * orphans behind after shutdown.
 */
function listSciosAlphaProcesses(appRoot) {
  if (process.platform !== "win32") return [];
  const needles = ["scios-alpha"];
  if (appRoot) {
    needles.push(path.resolve(appRoot));
    // Installed launcher chains also appear under the install parent directory.
    needles.push(path.dirname(path.resolve(appRoot)));
  }
  const literals = [...new Set(needles)]
    .map((n) => "'" + String(n).replace(/'/g, "''") + "'")
    .join(",");
  const ps = `
$needles = @(${literals})
Get-CimInstance Win32_Process |
  Where-Object {
    $cmd = $_.CommandLine
    $exe = $_.ExecutablePath
    if (-not $cmd -and -not $exe) { return $false }
    foreach ($n in $needles) {
      if ($cmd -and $cmd.IndexOf($n, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return $true }
      if ($exe -and $exe.IndexOf($n, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return $true }
    }
    return $false
  } |
  Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine |
  ConvertTo-Json -Compress
`;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.status !== 0 || !r.stdout) return [];
  try {
    const parsed = JSON.parse(r.stdout);
    return (Array.isArray(parsed) ? parsed : [parsed]).filter(Boolean);
  } catch {
    return [];
  }
}

function classifyProcess(p, portsByPid) {
  const cmd = p.CommandLine || "";
  let component = "unknown";
  if (cmd.includes("control-plane-api") && cmd.includes("server.ts"))
    component = "control-plane-api";
  else if (cmd.includes("cockpit-ui")) component = "cockpit-ui";
  else if (cmd.includes("master.ts") || cmd.includes("alpha-loop"))
    component = "alpha-loop-noncanonical";
  else if (cmd.includes("sci-os-x10-launcher") || cmd.includes("start-sci-os"))
    component = "startup-orchestrator";
  else if (cmd.includes("meta-recovery")) component = "meta-recovery";
  else if (cmd.includes("esbuild")) component = "esbuild-helper";
  else if (cmd.includes("job-object-keeper")) component = "host-job-keeper";
  else if (/SCI-OS-X10\.(exe|cmd)|SCI OS X10\.(exe|cmd)/i.test(cmd))
    component = "installed-launcher";
  else if (cmd.includes("nodemon") || cmd.includes("tsx")) component = "node-helper";

  const ports = portsByPid[String(p.ProcessId)] || [];
  const canonical =
    component === "control-plane-api" || component === "cockpit-ui";
  return {
    pid: p.ProcessId,
    parentPid: p.ParentProcessId,
    executable: p.ExecutablePath || "node",
    commandLine: cmd.slice(0, 400),
    workingDirectory: null,
    listeningPorts: ports,
    component,
    health: "unknown",
    reusable: canonical,
    duplicate: false,
    safeToStop: component === "alpha-loop-noncanonical",
    note:
      component === "alpha-loop-noncanonical"
        ? "Not part of canonical sci:start path"
        : null,
  };
}

function listeningPortsMap() {
  if (process.platform !== "win32") return {};
  const ps = `
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 3000,4000,5200,5230,5299,5432,6379 } |
  Select-Object LocalPort,OwningProcess |
  ConvertTo-Json -Compress
`;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
    windowsHide: true,
  });
  const map = {};
  try {
    const parsed = JSON.parse(r.stdout || "[]");
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    for (const row of arr) {
      if (!row) continue;
      const k = String(row.OwningProcess);
      if (!map[k]) map[k] = [];
      map[k].push(row.LocalPort);
    }
  } catch {
    /* empty */
  }
  return map;
}

function canonicalPath(appRoot) {
  return {
    at: new Date().toISOString(),
    profile: "local-foundation",
    selections: {
      repositoryRoot: {
        selected: appRoot,
        evidence: "resolve-app-root + package.json name sci-os-x10|scios-alpha",
        rejected: ["sci-os-10", "sci-os-x10-ccu-supra"],
        owner: "bootstrap-kernel",
        healthProbe: null,
      },
      packageManager: {
        selected: "pnpm@9.15.0",
        evidence: "package.json packageManager field",
        rejected: ["npm", "yarn"],
        owner: "root",
      },
      lockfile: {
        selected: "pnpm-lock.yaml",
        evidence: "exists at repo root",
        rejected: ["package-lock.json", "yarn.lock"],
        owner: "root",
      },
      nodeRuntime: {
        selected: "bundled Node (PACKAGED) or system Node contract-checked (DEVELOPMENT)",
        evidence: "resolve-node-runtime.cjs",
        rejected: ["silent system Node in PACKAGED", "electron as node"],
        owner: "bootstrap-kernel",
      },
      backendEntry: {
        selected: "apps/control-plane-api/src/server.ts",
        evidence: "resolve-runtime-entries",
        rejected: ["src/master.ts", "packages/alpha-loop"],
        aliases: ["pnpm --filter @scios/control-plane-api start"],
        owner: "process-supervisor",
        healthProbe: "http://127.0.0.1:3000/healthz",
        readinessProbe: "http://127.0.0.1:3000/readyz",
      },
      workerEntry: {
        selected: "embedded-foundation-worker (control-plane)",
        evidence: "no BullMQ package; local-foundation uses in-process smoke worker",
        rejected: ["external FastAPI engines as required"],
        owner: "control-plane-api",
        healthProbe: "http://127.0.0.1:3000/readyz",
      },
      riskControlEntry: {
        selected: "packages/governance-engine (embedded)",
        evidence: "control-plane imports @scios/governance-engine",
        rejected: ["external production governance SaaS"],
        owner: "control-plane-api",
        healthProbe: "http://127.0.0.1:3000/readyz",
      },
      cockpitEntry: {
        selected: "apps/cockpit-ui/src/index.js",
        evidence: "resolve-runtime-entries",
        rejected: ["Vite on :4000 from other trees", "control-plane / as UI"],
        aliases: ["pnpm --filter @scios/cockpit-ui start"],
        owner: "process-supervisor",
        healthProbe: "http://127.0.0.1:4000/healthz",
      },
      desktopEntry: {
        selected: "HTTP Shell open via start-sci-os → cockpitUrl :4000",
        evidence: "no apps/desktop; userFacingUrl = cockpit",
        rejected: ["Electron placeholder", "open control-plane :3000 as product UI"],
        owner: "start-sci-os",
        healthProbe: "http://127.0.0.1:4000/",
      },
      configLoader: {
        selected: "installer/scripts/startup/validate-config.cjs",
        evidence: "canonical config",
        rejected: ["per-package silent .env without precedence"],
        owner: "startup-pack",
      },
      migrationCommand: {
        selected: "SKIPPED (no DATABASE_URL in local-foundation)",
        evidence: "migration-gate.cjs",
        rejected: [],
        owner: "migration-gate",
      },
      startupOrchestrator: {
        selected: "installer/scripts/start-sci-os.cjs",
        evidence: "canonical; pnpm sci:start",
        rejected: ["scripts/boot as user launcher", "meta-recovery as primary start"],
        aliases: ["SCI OS ×10.bat → cascade may wrap"],
        owner: "startup-recovery-pack",
      },
      repairOrchestrator: {
        selected: "installer/scripts/repair-sci-os.cjs",
        evidence: "pnpm sci:repair",
        rejected: [],
        owner: "startup-recovery-pack",
      },
      startupProofCommand: {
        selected: "installer/scripts/convergence/startup-proof.cjs",
        evidence: "pnpm sci:proof — startup-specific, not CI feature gate",
        rejected: ["ci:prediction-foundation-gate as sole startup proof"],
        owner: "convergence",
      },
      healthEndpoint: {
        selected: "/healthz",
        evidence: "control-plane + cockpit",
        rejected: [],
        owner: "apps",
      },
      readinessEndpoint: {
        selected: "/readyz",
        evidence: "control-plane local-foundation readiness",
        rejected: [],
        owner: "control-plane-api",
      },
      ports: {
        api: 3000,
        cockpit: 4000,
        note: "Canonical from sci-os.manifest.json — user opens :4000 Shell; :3000 is Control Plane API only",
        optionalEngines: { prediction: 5201, risk: 5202, execution: 5210 },
        legacyRejectedDefaults: [5200, 5230],
      },
    },
    optionalFrozen: [
      "production OIDC",
      "live OpenTelemetry backend",
      "production HSM",
      "external secrets manager",
      "broker/bookmaker adapters",
      "real-money execution",
      "cloud-only integrations",
    ],
  };
}

function evaluateReadiness(truth) {
  const profile = process.env.SCI_RUNTIME_PROFILE || "local-foundation";
  const required = {
    runtime: true,
    config: true,
    backendLive: !!truth.backend?.healthzOk,
    backendReady: !!truth.backend?.readyzOk,
    cockpit: !!truth.cockpit?.healthzOk,
    riskControl: !!truth.backend?.riskControlActive,
    foundationWorker: !!truth.backend?.foundationWorkerOk,
  };

  const dbRequired = process.env.DATABASE_URL && process.env.REQUIRE_DATABASE === "1";
  const redisRequired = process.env.REQUIRE_REDIS === "1";

  const blockers = [];
  if (!required.backendLive) blockers.push("BACKEND_NOT_HEALTHY");
  if (!required.cockpit) blockers.push("COCKPIT_NOT_HEALTHY");
  if (!required.riskControl) blockers.push("RISK_CONTROL_UNAVAILABLE");
  if (!required.foundationWorker) blockers.push("FOUNDATION_WORKER_UNAVAILABLE");
  if (dbRequired && !truth.database?.ok) blockers.push("DATABASE_REQUIRED_UNAVAILABLE");
  if (redisRequired && !truth.redis?.ok) blockers.push("REDIS_REQUIRED_UNAVAILABLE");

  const optionalMissing = [];
  if (!truth.database?.configured) optionalMissing.push("postgresql");
  if (!truth.redis?.configured || !process.env.REQUIRE_REDIS)
    optionalMissing.push("bullmq-queue-workers");
  optionalMissing.push("electron-desktop", "oidc-production", "otel-saas");

  let verdict = "READY";
  if (blockers.length) verdict = "NO_GO";
  else if (optionalMissing.length) verdict = "DEGRADED";

  return {
    profile,
    required,
    blockers,
    optionalMissing,
    verdict,
    policy:
      "local-foundation: DB/Redis/OIDC/OTel/HSM optional unless REQUIRE_* set; embedded risk + foundation worker required",
  };
}

async function observeRuntime(appRoot, config) {
  const apiPort = config.redactedConfig.apiPort;
  const cockpitPort = config.redactedConfig.cockpitPort;
  const healthz = await httpGet(`http://127.0.0.1:${apiPort}/healthz`);
  const readyz = await httpGet(`http://127.0.0.1:${apiPort}/readyz`);
  const cockpit = await httpGet(`http://127.0.0.1:${cockpitPort}/healthz`);
  const cockpitHtml = await httpGet(`http://127.0.0.1:${cockpitPort}/`);
  const meta = await httpGet(`http://127.0.0.1:${apiPort}/v1/meta`);

  const redisConfigured = !!process.env.REDIS_URL;
  let redisOk = false;
  if (redisConfigured) {
    // TCP only — no redis-cli required
    const net = require("net");
    redisOk = await new Promise((resolve) => {
      const s = net.connect(6379, "127.0.0.1", () => {
        s.end();
        resolve(true);
      });
      s.on("error", () => resolve(false));
      setTimeout(() => {
        s.destroy();
        resolve(false);
      }, 1500);
    });
  }

  const body = readyz.body && typeof readyz.body === "object" ? readyz.body : {};
  return {
    at: new Date().toISOString(),
    apiPort,
    cockpitPort,
    backend: {
      healthzStatus: healthz.status,
      healthzOk: healthz.status === 200,
      healthzBody: healthz.body,
      readyzStatus: readyz.status,
      readyzOk: readyz.status === 200,
      readyzBody: body,
      riskControlActive: body.riskControl === true || body.components?.riskControl === true,
      foundationWorkerOk:
        body.foundationWorker === true || body.components?.foundationWorker === true,
    },
    cockpit: {
      healthzStatus: cockpit.status,
      healthzOk: cockpit.status === 200,
      htmlStatus: cockpitHtml.status,
      htmlOk: cockpitHtml.status === 200,
      metaOsReachable: meta.status === 200,
    },
    database: {
      configured: !!process.env.DATABASE_URL,
      ok: !process.env.DATABASE_URL, // optional absent = ok for local-foundation
      mode: process.env.DATABASE_URL ? "external" : "in-memory-alpha",
    },
    redis: {
      configured: redisConfigured,
      ok: !redisConfigured || redisOk,
      tcp: redisOk,
    },
    note: "Verified rather than recreated; healthy listeners reused",
  };
}

module.exports = {
  writeJson,
  httpGet,
  listSciosAlphaProcesses,
  classifyProcess,
  listeningPortsMap,
  canonicalPath,
  evaluateReadiness,
  observeRuntime,
  OUT,
  resolveAppRoot,
  resolveNodeRuntime,
  validateConfig,
};
