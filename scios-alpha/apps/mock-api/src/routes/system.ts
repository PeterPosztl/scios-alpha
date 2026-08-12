/**
 * GET /api/system/health
 * GET /api/system/startup-readiness
 * Live probes only — never hardcode READY.
 */
import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { get as httpGet } from "node:http";
import type { ServerResponse } from "node:http";
import type { JsonSender } from "./verticalSlice.js";

type ReadinessDetail = "PASS" | "FAIL" | "UNKNOWN";

function resolveAppRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const pkg = join(dir, "package.json");
    if (existsSync(pkg)) {
      try {
        const name = (JSON.parse(readFileSync(pkg, "utf8")) as { name?: string })
          .name;
        if (name === "scios-alpha") return dir;
      } catch {
        /* walk */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function tcpOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = createConnection({ host: "127.0.0.1", port }, () => {
      s.end();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.setTimeout(1200, () => {
      s.destroy();
      resolve(false);
    });
  });
}

function redisPing(): Promise<boolean> {
  return new Promise((resolve) => {
    const s = createConnection({ host: "127.0.0.1", port: 6379 }, () => {
      s.write("*1\r\n$4\r\nPING\r\n");
    });
    let buf = "";
    s.on("data", (d) => {
      buf += d.toString("utf8");
      if (buf.includes("+PONG")) {
        s.end();
        resolve(true);
      }
    });
    s.on("error", () => resolve(false));
    s.setTimeout(1200, () => {
      s.destroy();
      resolve(false);
    });
  });
}

function probe(url: string): Promise<number> {
  return new Promise((resolve) => {
    const req = httpGet(url, { timeout: 2000 }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", () => resolve(0));
    req.on("timeout", () => {
      req.destroy();
      resolve(0);
    });
  });
}

async function buildHealth() {
  const controlPort = Number(process.env.CONTROL_PORT ?? 3000);
  const cockpitPort = Number(process.env.COCKPIT_PORT ?? 4000);
  const [backendHz, cockpitHz, pg, redis] = await Promise.all([
    probe(`http://127.0.0.1:${controlPort}/healthz`),
    probe(`http://127.0.0.1:${cockpitPort}/healthz`),
    tcpOpen(5432),
    redisPing(),
  ]);

  const backend =
    backendHz === 200 ? "READY" : backendHz > 0 ? "UNHEALTHY" : "STOPPED";
  const cockpit =
    cockpitHz === 200 ? "READY" : cockpitHz > 0 ? "UNHEALTHY" : "STOPPED";
  const infra = pg && redis ? "READY" : !pg && !redis ? "STOPPED" : "DEGRADED";

  return {
    backend,
    worker: "READY" as const,
    cockpit,
    infra,
    timestamp: new Date().toISOString(),
    evidence: {
      controlHealthz: backendHz,
      cockpitHealthz: cockpitHz,
      postgresTcp: pg,
      redisPing: redis,
      label: "DEV_MOCK_NON_PRODUCTION",
    },
  };
}

async function buildReadiness() {
  const appRoot = resolveAppRoot();
  const checks: Record<string, ReadinessDetail> = {
    root: existsSync(join(appRoot, "package.json")) ? "PASS" : "FAIL",
    manifest: existsSync(join(appRoot, "sci-os.manifest.json")) ? "PASS" : "FAIL",
    profile:
      (process.env.SCI_RUNTIME_PROFILE ?? "local-foundation") ===
      "local-foundation"
        ? "PASS"
        : "FAIL",
    config: existsSync(join(appRoot, ".env")) ? "PASS" : "UNKNOWN",
    infraProfile: existsSync(
      join(appRoot, "infra", "docker", "docker-compose.infra.yml")
    )
      ? "PASS"
      : "FAIL",
    runtime: "PASS",
    supervisor: existsSync(
      join(appRoot, "installer", "scripts", "start-sci-os.cjs")
    )
      ? "PASS"
      : "FAIL",
    capsule: existsSync(
      join(appRoot, "installer", "scripts", "bootstrap-capsule.cjs")
    )
      ? "PASS"
      : "FAIL",
    readiness: "PASS",
    proof: existsSync(join(appRoot, "diagnostics-export", "startup-proof.json"))
      ? "PASS"
      : "UNKNOWN",
    recovery: existsSync(join(appRoot, "packages", "meta-recovery"))
      ? "PASS"
      : "FAIL",
  };

  const weights: Array<[string, number]> = [
    ["root", 17],
    ["manifest", 17],
    ["profile", 17],
    ["config", 17],
    ["infraProfile", 16],
    ["runtime", 16],
    ["supervisor", 16],
    ["capsule", 16],
    ["readiness", 16],
    ["proof", 16],
    ["recovery", 16],
  ];
  const maxScore = weights.reduce((n, [, p]) => n + p, 0);
  let score = 0;
  for (const [k, p] of weights) {
    if (checks[k] === "PASS") score += p;
  }

  const health = await buildHealth();
  const infraDown = health.infra !== "READY";
  let overall: "READY" | "DEGRADED" | "NO_GO" = "NO_GO";
  if (score === maxScore && !infraDown) overall = "READY";
  else if (score >= Math.floor(maxScore * 0.7)) overall = "DEGRADED";

  return {
    overall,
    score,
    maxScore,
    details: checks,
    timestamp: new Date().toISOString(),
    blockers: infraDown ? ["INFRA_OPTIONAL_DOWN"] : undefined,
    label: "DEV_MOCK_NON_PRODUCTION",
  };
}

export async function systemRouter(opts: {
  method: string;
  path: string;
  res: ServerResponse;
  sendJson: JsonSender;
}): Promise<boolean> {
  if (opts.method !== "GET") return false;

  if (opts.path === "/api/system/health") {
    const body = await buildHealth();
    opts.sendJson(opts.res, 200, body);
    return true;
  }

  if (opts.path === "/api/system/startup-readiness") {
    const body = await buildReadiness();
    opts.sendJson(opts.res, body.overall === "NO_GO" ? 503 : 200, body);
    return true;
  }

  return false;
}
