/**
 * Cockpit-facing system health + startup readiness.
 * Native http (no Express). Live probes only — never hardcode READY.
 */
import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { get as httpGet, request as httpRequest } from "node:http";
import type { ServerResponse } from "node:http";
import { can } from "@scios/governance-engine";
import { getPersistenceStateMatrix, getPersistenceHealth } from "@scios/vertical-slice";
import { getTlsHealth } from "../tlsHealth.js";
import { getOtelHealth } from "../otelHealth.js";
import { getObservabilityHealth } from "../observabilityHealth.js";
import type { JsonSender } from "./verticalSlice.js";

export type ComponentStatus = "READY" | "DEGRADED" | "UNHEALTHY" | "STOPPED" | "UNKNOWN";

export type SystemHealthResponse = {
  backend: ComponentStatus;
  worker: ComponentStatus;
  cockpit: ComponentStatus;
  infra: ComponentStatus;
  timestamp: string;
  evidence?: {
    backendReady: boolean;
    workerHeartbeatAgeMs: number | null;
    cockpitHealthz: number;
    postgresTcp: boolean;
    redisPing: boolean;
    label: "ALPHA_NON_PRODUCTION";
  };
};

export type ReadinessDetail = "PASS" | "FAIL" | "UNKNOWN";

export type StartupReadinessResponse = {
  overall: "READY" | "DEGRADED" | "NO_GO";
  score: number;
  maxScore: number;
  details: Record<
    | "root"
    | "manifest"
    | "profile"
    | "config"
    | "infraProfile"
    | "runtime"
    | "supervisor"
    | "capsule"
    | "readiness"
    | "proof"
    | "recovery",
    ReadinessDetail
  >;
  timestamp: string;
  blockers?: string[];
};

export type FoundationWorkerState = {
  name: string;
  online: boolean;
  lastHeartbeatAt: string;
  lastJobId: string | null;
  lastJobStatus: string | null;
  jobsCompleted: number;
};

export type SystemRouteDeps = {
  foundationWorker: FoundationWorkerState;
  executionMode: string;
  runtimeProfile: string;
  apiPort: number;
};

const CHECK_WEIGHTS: Array<{
  key: keyof StartupReadinessResponse["details"];
  points: number;
}> = [
  { key: "root", points: 17 },
  { key: "manifest", points: 17 },
  { key: "profile", points: 17 },
  { key: "config", points: 17 },
  { key: "infraProfile", points: 16 },
  { key: "runtime", points: 16 },
  { key: "supervisor", points: 16 },
  { key: "capsule", points: 16 },
  { key: "readiness", points: 16 },
  { key: "proof", points: 16 },
  { key: "recovery", points: 16 },
];

function resolveAppRoot(): string {
  const canonical =
    process.env.SCIOS_APP_ROOT ||
    process.env.SCI_OS_APP_ROOT; // temporary compatibility only
  if (canonical && existsSync(join(canonical, "package.json"))) return canonical;

  // Packaged CJS bundle must NOT use import.meta.url (empty after esbuild).
  if (
    process.env.SCIOS_PACKAGED === "1" ||
    process.env.SCIOS_RUNTIME_MODE === "PACKAGED"
  ) {
    return process.cwd() || ".";
  }

  try {
    // Guard: esbuild CJS leaves import.meta.url undefined — fileURLToPath(undefined) throws.
    const metaUrl =
      typeof import.meta !== "undefined" && import.meta && import.meta.url
        ? import.meta.url
        : undefined;
    if (metaUrl) {
      let dir = dirname(fileURLToPath(metaUrl));
      for (let i = 0; i < 8; i++) {
        const pkgPath = join(dir, "package.json");
        if (existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
            if (pkg.name === "sci-os-x10" || pkg.name === "scios-alpha") return dir;
          } catch {
            /* continue walk */
          }
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }
  } catch {
    /* bundled CJS may not have import.meta */
  }

  const cwd = process.cwd();
  if (cwd && existsSync(join(cwd, "backend", "server.cjs"))) return cwd;
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const installed = join(localAppData, "SCI OS X10");
    if (existsSync(join(installed, "backend", "server.cjs"))) return installed;
    const installedApp = join(installed, "app");
    if (existsSync(join(installedApp, "backend", "server.cjs"))) return installedApp;
  }
  return cwd || ".";
}

function parseUrlHostPort(
  raw: string | undefined,
  fallbackHost: string,
  fallbackPort: number
): { host: string; port: number; configured: boolean } {
  if (!raw) return { host: fallbackHost, port: fallbackPort, configured: false };
  try {
    const u = new URL(raw);
    const host = u.hostname || fallbackHost;
    const port = u.port ? Number(u.port) : fallbackPort;
    return { host, port, configured: true };
  } catch {
    return { host: fallbackHost, port: fallbackPort, configured: false };
  }
}

function cockpitBaseUrl(apiPort: number): string {
  const fromEnv = process.env.COCKPIT_URL ?? process.env.CONTROL_COCKPIT_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const port = Number(process.env.SCIOS_COCKPIT_PORT ?? process.env.COCKPIT_PORT ?? 4000);
  return `http://127.0.0.1:${port}`;
}

function probeHttp(url: string, timeoutMs = 2500): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const req = httpGet(url, { timeout: timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body: unknown = raw;
        try {
          body = JSON.parse(raw) as unknown;
        } catch {
          /* text */
        }
        resolve({ status: res.statusCode ?? 0, body });
      });
    });
    req.on("error", () => resolve({ status: 0, body: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: null });
    });
  });
}

function tcpOpen(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function redisPing(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port }, () => {
      socket.write("*1\r\n$4\r\nPING\r\n");
    });
    let buf = "";
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      if (buf.includes("+PONG")) {
        socket.end();
        resolve(true);
      }
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function workerFresh(foundationWorker: FoundationWorkerState): boolean {
  const age = Date.now() - Date.parse(foundationWorker.lastHeartbeatAt);
  return foundationWorker.online && Number.isFinite(age) && age < 30_000;
}

function backendReady(deps: SystemRouteDeps): boolean {
  const riskControl =
    can("operator", "execution:submit") || can("admin", "execution:submit");
  return (
    workerFresh(deps.foundationWorker) &&
    riskControl &&
    deps.executionMode === "SIMULATION_ONLY"
  );
}

function detail(
  ok: boolean | null | undefined,
  unknownWhenFalse = false
): ReadinessDetail {
  if (ok === true) return "PASS";
  if (ok === false) return unknownWhenFalse ? "UNKNOWN" : "FAIL";
  return "UNKNOWN";
}

async function probeInfra(): Promise<{ postgres: boolean; redis: boolean }> {
  const db = parseUrlHostPort(process.env.DATABASE_URL, "127.0.0.1", 5432);
  const redis = parseUrlHostPort(process.env.REDIS_URL, "127.0.0.1", 6379);
  // Only probe when configured — do not invent localhost readiness for absent optional infra
  const [postgresOk, redisOk] = await Promise.all([
    db.configured ? tcpOpen(db.host, db.port) : Promise.resolve(false),
    redis.configured ? redisPing(redis.host, redis.port) : Promise.resolve(false),
  ]);
  return { postgres: postgresOk, redis: redisOk };
}

function infraStatus(infra: { postgres: boolean; redis: boolean }): ComponentStatus {
  const dbRequired = !!process.env.DATABASE_URL && process.env.REQUIRE_DATABASE === "1";
  const redisRequired = process.env.REQUIRE_REDIS === "1";
  if (infra.postgres && infra.redis) return "READY";
  if (
    (dbRequired && !infra.postgres) ||
    (redisRequired && !infra.redis)
  ) {
    return "UNHEALTHY";
  }
  if (!infra.postgres || !infra.redis) return "DEGRADED";
  return "UNKNOWN";
}

export async function buildSystemHealth(
  deps: SystemRouteDeps
): Promise<SystemHealthResponse> {
  const cockpitUrl = cockpitBaseUrl(deps.apiPort);
  const [cockpitProbe, infra] = await Promise.all([
    probeHttp(`${cockpitUrl}/healthz`),
    probeInfra(),
  ]);

  const ready = backendReady(deps);
  const workerOk = workerFresh(deps.foundationWorker);
  const heartbeatAgeMs = workerOk
    ? Date.now() - Date.parse(deps.foundationWorker.lastHeartbeatAt)
    : null;

  let backend: ComponentStatus = "READY";
  if (!ready) backend = workerOk ? "DEGRADED" : "UNHEALTHY";

  let worker: ComponentStatus = "STOPPED";
  if (workerOk && ready) worker = "READY";
  else if (workerOk) worker = "DEGRADED";
  else if (deps.foundationWorker.online) worker = "UNHEALTHY";

  let cockpit: ComponentStatus = "STOPPED";
  if (cockpitProbe.status === 200) cockpit = "READY";
  else if (cockpitProbe.status > 0) cockpit = "UNHEALTHY";

  return {
    backend,
    worker,
    cockpit,
    infra: infraStatus(infra),
    timestamp: new Date().toISOString(),
    evidence: {
      backendReady: ready,
      workerHeartbeatAgeMs: heartbeatAgeMs,
      cockpitHealthz: cockpitProbe.status,
      postgresTcp: infra.postgres,
      redisPing: infra.redis,
      label: "ALPHA_NON_PRODUCTION",
    },
  };
}

async function workerSmokeOk(apiPort: number): Promise<boolean> {
  return new Promise((resolve) => {
    const data = JSON.stringify({});
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port: apiPort,
        path: "/v1/foundation/worker-smoke",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(data),
        },
        timeout: 5000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
              status?: string;
            };
            resolve(res.statusCode === 200 && body.status === "completed");
          } catch {
            resolve(false);
          }
        });
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.write(data);
    req.end();
  });
}

function readProofVerdict(appRoot: string): string | null {
  const candidates = [
    join(appRoot, "diagnostics-export", "startup-proof.json"),
    join(
      appRoot,
      "diagnostics-export",
      "convergence",
      "startup-convergence-proof.json"
    ),
    join(appRoot, "diagnostics-export", "startup-report.json"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const doc = JSON.parse(readFileSync(p, "utf8")) as {
        verdict?: string;
        readiness?: { verdict?: string };
      };
      return doc.verdict ?? doc.readiness?.verdict ?? null;
    } catch {
      /* try next */
    }
  }
  return null;
}

function isPackagedRuntime(): boolean {
  return (
    process.env.SCIOS_PACKAGED === "1" ||
    process.env.SCIOS_RUNTIME_MODE === "PACKAGED"
  );
}

export async function buildDevelopmentReadiness(
  deps: SystemRouteDeps
): Promise<StartupReadinessResponse> {
  const appRoot = resolveAppRoot();
  const manifestPath = join(appRoot, "sci-os.manifest.json");
  const envPath = join(appRoot, ".env");
  const infraCompose = join(appRoot, "infra", "docker", "docker-compose.infra.yml");
  const orchestrator = join(appRoot, "installer", "scripts", "start-sci-os.cjs");
  const capsule = join(appRoot, "installer", "scripts", "bootstrap-capsule.cjs");
  const recoveryDir = join(appRoot, "packages", "meta-recovery");
  const recoveryShell = join(appRoot, "apps", "meta-recovery-control-plane");

  const [cockpitProbe, infra, smokeOk] = await Promise.all([
    probeHttp(`${cockpitBaseUrl(deps.apiPort)}/healthz`),
    probeInfra(),
    workerSmokeOk(deps.apiPort),
  ]);

  const ready = backendReady(deps);
  const proofVerdict = readProofVerdict(appRoot);

  let manifestOk = false;
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        id?: string;
      };
      manifestOk = manifest.id === "SCI_OS_X10";
    } catch {
      manifestOk = false;
    }
  }

  const profileOk =
    (process.env.SCI_RUNTIME_PROFILE ?? deps.runtimeProfile) === "local-foundation";
  const configOk =
    existsSync(envPath) &&
    Number.isFinite(deps.apiPort) &&
    deps.apiPort > 0;
  const runtimeOk = ready && cockpitProbe.status === 200;
  const readinessOk = ready;
  const proofOk =
    smokeOk ||
    proofVerdict === "READY" ||
    proofVerdict === "DEGRADED" ||
    proofVerdict === "STARTUP_CONVERGED_READY" ||
    proofVerdict === "STARTUP_CONVERGED_DEGRADED";

  const checks: StartupReadinessResponse["details"] = {
    root: detail(existsSync(join(appRoot, "package.json"))),
    manifest: detail(manifestOk),
    profile: detail(profileOk),
    config: detail(configOk),
    infraProfile: detail(existsSync(infraCompose)),
    runtime: detail(runtimeOk),
    supervisor: detail(existsSync(orchestrator)),
    capsule: detail(existsSync(capsule)),
    readiness: detail(readinessOk),
    proof: detail(proofOk, !smokeOk && !proofVerdict),
    recovery: detail(existsSync(recoveryDir) && existsSync(recoveryShell)),
  };

  let score = 0;
  for (const row of CHECK_WEIGHTS) {
    if (checks[row.key] === "PASS") score += row.points;
  }

  const blockers: string[] = [];
  if (checks.runtime === "FAIL") blockers.push("RUNTIME_NOT_READY");
  if (checks.readiness === "FAIL") blockers.push("READINESS_FAILED");
  if (checks.config === "FAIL") blockers.push("CONFIG_INVALID");
  if (!infra.postgres || !infra.redis) {
    blockers.push("INFRA_OPTIONAL_DOWN");
  }

  let overall: StartupReadinessResponse["overall"] = "NO_GO";
  if (blockers.includes("RUNTIME_NOT_READY") || blockers.includes("READINESS_FAILED")) {
    overall = "NO_GO";
  } else if (score === CHECK_WEIGHTS.reduce((n, r) => n + r.points, 0)) {
    overall = infra.postgres && infra.redis ? "READY" : "DEGRADED";
  } else if (score >= CHECK_WEIGHTS.reduce((n, r) => n + r.points, 0) * 0.7) {
    overall = "DEGRADED";
  }

  return {
    overall,
    score,
    maxScore: CHECK_WEIGHTS.reduce((n, r) => n + r.points, 0),
    details: checks,
    timestamp: new Date().toISOString(),
    blockers: blockers.length ? blockers : undefined,
  };
}

/** Packaged readiness — never require source-tree .env / apps / packages. */
export async function buildPackagedReadiness(
  deps: SystemRouteDeps
): Promise<StartupReadinessResponse> {
  const appRoot = resolveAppRoot();
  const packagedCfg = join(appRoot, "config", "packaged.json");
  const golden = join(appRoot, "manifests", "golden-boot.packaged.json");
  const backend = join(appRoot, "backend", "server.cjs");
  const cockpitMjs = join(appRoot, "cockpit", "index.mjs");
  const cockpitJs = join(appRoot, "cockpit", "index.js");
  const recovery = join(appRoot, "recovery", "server.cjs");
  const nodeExe = join(appRoot, "runtime", "node", "node.exe");
  const orchestrator = join(appRoot, "installer", "scripts", "start-sci-os.cjs");
  const capsule = join(appRoot, "installer", "scripts", "bootstrap-capsule.cjs");

  const [cockpitProbe, homeProbe, infra, smokeOk] = await Promise.all([
    probeHttp(`${cockpitBaseUrl(deps.apiPort)}/healthz`),
    probeHttp(`${cockpitBaseUrl(deps.apiPort)}/`),
    probeInfra(),
    workerSmokeOk(deps.apiPort),
  ]);

  const ready = backendReady(deps);
  const cockpitArtifact = existsSync(cockpitMjs) || existsSync(cockpitJs);
  let sciOsLayout = false;
  try {
    const pkg = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8")) as {
      sciOs?: { layout?: string };
    };
    sciOsLayout = pkg.sciOs?.layout === "PACKAGED";
  } catch {
    sciOsLayout = false;
  }

  const runtimeOk =
    ready &&
    cockpitProbe.status === 200 &&
    (cockpitProbe.body as { ok?: boolean; shell?: boolean } | null)?.ok === true;

  const checks: StartupReadinessResponse["details"] = {
    root: detail(sciOsLayout || existsSync(packagedCfg)),
    manifest: detail(existsSync(golden)),
    profile: detail(process.env.SCIOS_RUNTIME_MODE === "PACKAGED"),
    config: detail(existsSync(packagedCfg)),
    infraProfile: detail(true), // optional infra — not source compose
    runtime: detail(runtimeOk && existsSync(backend) && existsSync(nodeExe)),
    supervisor: detail(existsSync(orchestrator)),
    capsule: detail(existsSync(capsule)),
    readiness: detail(ready),
    proof: detail(smokeOk || homeProbe.status === 200, !smokeOk),
    recovery: detail(existsSync(recovery), !existsSync(recovery)),
  };

  let score = 0;
  for (const row of CHECK_WEIGHTS) {
    if (checks[row.key] === "PASS") score += row.points;
  }

  const blockers: string[] = [];
  if (!existsSync(backend)) blockers.push("BACKEND_ARTIFACT_MISSING");
  if (!cockpitArtifact) blockers.push("COCKPIT_ARTIFACT_MISSING");
  if (!existsSync(nodeExe)) blockers.push("BUNDLED_NODE_MISSING");
  if (checks.runtime === "FAIL") blockers.push("RUNTIME_NOT_READY");
  if (checks.readiness === "FAIL") blockers.push("READINESS_FAILED");
  if (!infra.postgres && process.env.DATABASE_URL) blockers.push("INFRA_OPTIONAL_DOWN");
  if (!infra.redis && process.env.REDIS_URL) blockers.push("INFRA_OPTIONAL_DOWN");

  let overall: StartupReadinessResponse["overall"] = "DEGRADED";
  if (
    blockers.includes("RUNTIME_NOT_READY") ||
    blockers.includes("READINESS_FAILED") ||
    blockers.includes("BACKEND_ARTIFACT_MISSING") ||
    blockers.includes("COCKPIT_ARTIFACT_MISSING") ||
    blockers.includes("BUNDLED_NODE_MISSING")
  ) {
    overall = "NO_GO";
  } else if (
    score >= CHECK_WEIGHTS.reduce((n, r) => n + r.points, 0) * 0.85 &&
    infra.postgres &&
    infra.redis
  ) {
    overall = "READY";
  }

  return {
    overall,
    score,
    maxScore: CHECK_WEIGHTS.reduce((n, r) => n + r.points, 0),
    details: checks,
    timestamp: new Date().toISOString(),
    blockers: blockers.length ? blockers : undefined,
  };
}

export async function buildStartupReadiness(
  deps: SystemRouteDeps
): Promise<StartupReadinessResponse> {
  if (isPackagedRuntime()) return buildPackagedReadiness(deps);
  return buildDevelopmentReadiness(deps);
}

/** Product readiness ≠ service /readyz — Shell + Home + experience path. */
export async function buildProductReadiness(deps: SystemRouteDeps): Promise<{
  schema: string;
  label: string;
  liveness: "PASS" | "FAIL";
  serviceReady: "PASS" | "FAIL" | "UNKNOWN";
  coreReady: "PASS" | "FAIL" | "UNKNOWN";
  productReady: "PASS" | "FAIL" | "DEGRADED" | "UNKNOWN";
  releaseReady: "UNKNOWN";
  details: Record<string, string>;
}> {
  const cockpitUrl = cockpitBaseUrl(deps.apiPort);
  const [hz, home, apiHome] = await Promise.all([
    probeHttp(`${cockpitUrl}/healthz`),
    probeHttp(`${cockpitUrl}/`),
    probeHttp(`http://127.0.0.1:${deps.apiPort}/v1/home`),
  ]);
  const live = backendReady(deps);
  const shellOk =
    hz.status === 200 &&
    (hz.body as { shell?: boolean } | null)?.shell === true;
  const homeHtml = home.status === 200;
  const homeApi = apiHome.status === 200;
  const core = live && shellOk && homeHtml && homeApi;
  return {
    schema: "sci-os-product-readiness/v1",
    label: "ALPHA_NON_PRODUCTION",
    liveness: live ? "PASS" : "FAIL",
    serviceReady: live ? "PASS" : "FAIL",
    coreReady: core ? "PASS" : "FAIL",
    productReady: core ? "DEGRADED" : "FAIL",
    releaseReady: "UNKNOWN",
    details: {
      note: "/readyz is service-internal; this endpoint is product/core readiness",
      shellHealthz: String(hz.status),
      homeHtml: String(home.status),
      homeApi: String(apiHome.status),
    },
  };
}

export async function handleSystemHealth(
  deps: SystemRouteDeps,
  res: ServerResponse,
  sendJson: JsonSender
): Promise<void> {
  const body = await buildSystemHealth(deps);
  const httpStatus =
    body.backend === "UNHEALTHY" || body.worker === "UNHEALTHY"
      ? 503
      : 200;
  sendJson(res, httpStatus, body);
}

export async function handleStartupReadiness(
  deps: SystemRouteDeps,
  res: ServerResponse,
  sendJson: JsonSender
): Promise<void> {
  try {
    const body = await buildStartupReadiness(deps);
    const httpStatus = body.overall === "NO_GO" ? 503 : 200;
    sendJson(res, httpStatus, body);
  } catch (err) {
    sendJson(res, 500, {
      overall: "NO_GO",
      verdict: "NO_GO",
      score: 0,
      maxScore: 0,
      details: {
        error: err instanceof Error ? err.message : String(err),
      },
      timestamp: new Date().toISOString(),
      blockers: ["STARTUP_READINESS_INTERNAL_ERROR"],
    });
  }
}

/**
 * Express-style router mount for system health / readiness paths.
 * Returns true when the request was handled.
 */
export async function systemRouter(opts: {
  method: string;
  path: string;
  deps: SystemRouteDeps;
  res: ServerResponse;
  sendJson: JsonSender;
}): Promise<boolean> {
  if (opts.method !== "GET") return false;

  if (
    opts.path === "/api/system/health" ||
    opts.path === "/v1/system/health"
  ) {
    await handleSystemHealth(opts.deps, opts.res, opts.sendJson);
    return true;
  }

  if (
    opts.path === "/api/system/startup-readiness" ||
    opts.path === "/v1/system/startup-readiness"
  ) {
    await handleStartupReadiness(opts.deps, opts.res, opts.sendJson);
    return true;
  }

  if (opts.path === "/v1/persistence/health") {
    const health = await getPersistenceHealth();
    opts.sendJson(opts.res, 200, health);
    return true;
  }

  if (opts.path === "/v1/tls/health") {
    const health = getTlsHealth();
    opts.sendJson(opts.res, health.status === "READY" ? 200 : 503, health);
    return true;
  }

  if (opts.path === "/v1/otel/health") {
    const health = await getOtelHealth();
    opts.sendJson(opts.res, health.status === "READY" ? 200 : 503, health);
    return true;
  }

  if (opts.path === "/v1/observability/health") {
    const health = await getObservabilityHealth();
    opts.sendJson(opts.res, health.status === "READY" ? 200 : 503, health);
    return true;
  }

  if (
    opts.path === "/api/system/persistence-matrix" ||
    opts.path === "/v1/system/persistence-matrix"
  ) {
    opts.sendJson(opts.res, 200, getPersistenceStateMatrix());
    return true;
  }

  if (opts.path === "/v1/product/readiness") {
    const body = await buildProductReadiness(opts.deps);
    const httpStatus = body.coreReady === "PASS" ? 200 : 503;
    opts.sendJson(opts.res, httpStatus, body);
    return true;
  }

  return false;
}
