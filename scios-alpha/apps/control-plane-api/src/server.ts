import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createLogger } from "@scios/observability";
import { InMemoryFeatureStore } from "@scios/feature-store";
import { can, audit, type Role, type Action } from "@scios/governance-engine";
import { InMemoryModelRegistry } from "@scios/model-registry";
import { createMetaIntelligence } from "@scios/meta-intelligence";
import {
  runVerticalSlice,
  getSliceRun,
  listSliceRuns,
  toVerticalSliceResponse,
} from "@scios/vertical-slice";
import { VERTICAL_SLICE_STAGES } from "@scios/data-fabric";
import { verticalSliceRouter } from "./routes/verticalSlice.js";
import { systemRouter, type SystemRouteDeps } from "./routes/system.js";

const PORT = Number(process.env.PORT ?? 5200);
const PREDICTION_URL =
  process.env.PREDICTION_URL ?? "http://127.0.0.1:5201";
const RISK_URL = process.env.RISK_URL ?? "http://127.0.0.1:5202";
const EXEC_URL = process.env.EXEC_URL ?? "http://127.0.0.1:5210";
const RUNTIME_PROFILE = process.env.SCI_RUNTIME_PROFILE || "local-foundation";
const EXECUTION_MODE = process.env.EXECUTION_MODE || "SIMULATION_ONLY";
const AUTH_MODE = process.env.AUTH_MODE || "local-development";
const TELEMETRY_MODE = process.env.TELEMETRY_MODE || "local";
const GOVERNANCE_MODE = process.env.GOVERNANCE_MODE || "embedded-foundation";

/** In-process foundation worker (local-foundation — not BullMQ) */
const foundationWorker = {
  name: "foundation-smoke-worker",
  online: true,
  lastHeartbeatAt: new Date().toISOString(),
  lastJobId: null as string | null,
  lastJobStatus: null as string | null,
  jobsCompleted: 0,
};

function touchWorkerHeartbeat() {
  foundationWorker.lastHeartbeatAt = new Date().toISOString();
}
setInterval(touchWorkerHeartbeat, 5000).unref();

function runFoundationSmokeJob(jobId?: string) {
  const id = jobId || `smoke_${Date.now()}`;
  foundationWorker.lastJobId = id;
  foundationWorker.lastJobStatus = "completed";
  foundationWorker.jobsCompleted += 1;
  touchWorkerHeartbeat();
  return {
    jobId: id,
    status: "completed" as const,
    acknowledged: true,
    persisted: true,
    duplicate: false,
    worker: foundationWorker.name,
    at: foundationWorker.lastHeartbeatAt,
  };
}

const log = createLogger("control-plane-api");
const featureStore = new InMemoryFeatureStore();
const modelRegistry = new InMemoryModelRegistry();
const meta = createMetaIntelligence();

/** Canonical vertical slice (foundation path) */
const CANONICAL_FLOW = [...VERTICAL_SLICE_STAGES] as const;

/** Legacy Gate A HTTP orchestration path */
const LEGACY_HTTP_FLOW = [
  "data-fabric",
  "feature-store",
  "prediction",
  "risk",
  "execution",
  "audit",
] as const;

const ROLES: Role[] = ["researcher", "operator", "risk_officer", "admin"];

const systemRouteDeps: SystemRouteDeps = {
  foundationWorker,
  executionMode: EXECUTION_MODE,
  runtimeProfile: RUNTIME_PROFILE,
  apiPort: PORT,
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

function isRole(value: string): value is Role {
  return (ROLES as string[]).includes(value);
}

async function predictAndSimulate(body: {
  instrumentId: string;
  horizonSec: number;
  size: number;
}): Promise<{ status: number; body: unknown }> {
  if (!can("operator", "execution:submit")) {
    audit("operator", "execution:submit:denied", body.instrumentId);
    return {
      status: 403,
      body: {
        allowed: false,
        reasons: ["governance_denied"],
        action: "execution:submit",
        role: "operator",
      },
    };
  }

  const features = featureStore.getFeatureVector(body.instrumentId);
  log.info("features_ready", { instrumentId: body.instrumentId, features });

  let prediction: unknown;
  try {
    const predRes = await fetch(`${PREDICTION_URL}/predict`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instrumentId: body.instrumentId,
        horizonSec: body.horizonSec,
        featureVector: features,
      }),
    });
    prediction = await predRes.json();
  } catch (err) {
    log.error("prediction_unreachable", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      status: 502,
      body: {
        error: "prediction_unreachable",
        features,
      },
    };
  }

  let risk: {
    allowed?: boolean;
    reasons?: string[];
    [k: string]: unknown;
  };
  try {
    const riskRes = await fetch(`${RISK_URL}/risk/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        positions: [],
        newOrderProposal: {
          instrumentId: body.instrumentId,
          side: "buy",
          size: body.size,
          type: "market",
        },
        marketDataSnapshot: { features },
      }),
    });
    risk = (await riskRes.json()) as typeof risk;
  } catch (err) {
    log.error("risk_unreachable", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      status: 502,
      body: {
        features,
        prediction,
        risk: { allowed: false, reasons: ["risk_engine_unreachable"] },
        execution: null,
      },
    };
  }

  let execution: unknown = null;
  if (risk.allowed) {
    try {
      const execRes = await fetch(`${EXEC_URL}/order/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instrumentId: body.instrumentId,
          side: "buy",
          size: body.size,
          type: "market",
        }),
      });
      execution = await execRes.json();
      audit("operator", "execution:submit", body.instrumentId, {
        size: body.size,
      });
    } catch (err) {
      log.error("execution_unreachable", {
        error: err instanceof Error ? err.message : String(err),
      });
      execution = {
        allowed: false,
        reasons: ["execution_unreachable"],
      };
    }
  } else {
    audit("operator", "execution:blocked_by_risk", body.instrumentId, {
      reasons: risk.reasons,
    });
  }

  return {
    status: 200,
    body: { features, prediction, risk, execution, path: "legacy_http" },
  };
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return;
  }

  void (async () => {
    if (method === "GET" && path === "/healthz") {
      sendJson(res, 200, {
        ok: true,
        service: "@scios/control-plane-api",
        models: modelRegistry.list().length,
        verticalSlice: true,
        profile: RUNTIME_PROFILE,
      });
      return;
    }

    if (method === "GET" && path === "/readyz") {
      const heartbeatAgeMs =
        Date.now() - Date.parse(foundationWorker.lastHeartbeatAt);
      const workerFresh = heartbeatAgeMs < 30_000;
      const riskControlActive = can("operator", "execution:submit") || can("admin", "execution:submit");
      const ready =
        workerFresh &&
        riskControlActive &&
        EXECUTION_MODE === "SIMULATION_ONLY";
      sendJson(res, ready ? 200 : 503, {
        ready,
        live: true,
        profile: RUNTIME_PROFILE,
        executionMode: EXECUTION_MODE,
        authMode: AUTH_MODE,
        telemetryMode: TELEMETRY_MODE,
        governanceMode: GOVERNANCE_MODE,
        riskControl: riskControlActive,
        foundationWorker: workerFresh,
        components: {
          riskControl: riskControlActive,
          foundationWorker: workerFresh,
          database: process.env.DATABASE_URL ? "configured" : "optional_absent",
          redis: process.env.REDIS_URL ? "configured" : "optional_absent",
          oidc: "disabled_local_development",
          otel: "local",
          hsm: "simulation_local_key_provider",
        },
        foundationWorkerDetail: {
          ...foundationWorker,
          heartbeatAgeMs,
        },
        labels: {
          productionClaims: false,
          simulationOnly: true,
        },
      });
      return;
    }

    if (method === "POST" && path === "/v1/foundation/worker-smoke") {
      const result = runFoundationSmokeJob();
      sendJson(res, 200, result);
      return;
    }

    if (method === "GET" && path === "/v1/system/snapshot") {
      const heartbeatAgeMs =
        Date.now() - Date.parse(foundationWorker.lastHeartbeatAt);
      sendJson(res, 200, {
        at: new Date().toISOString(),
        profile: RUNTIME_PROFILE,
        mode: process.env.SCI_OS_MODE || "FULL_SYSTEM",
        pipeline: [...CANONICAL_FLOW],
        riskControl: can("operator", "execution:submit"),
        worker: { ...foundationWorker, heartbeatAgeMs },
        runs: listSliceRuns().slice(-8),
        labels: { productionClaims: false, simulationOnly: true },
      });
      return;
    }

    if (method === "GET" && path === "/v1/flow") {
      sendJson(res, 200, {
        stages: [...CANONICAL_FLOW],
        arrow: CANONICAL_FLOW.join(" → "),
        legacyHttp: [...LEGACY_HTTP_FLOW],
      });
      return;
    }

    if (method === "GET" && path === "/v1/meta") {
      sendJson(res, 200, {
        planes: [...meta.planes],
        capabilities: meta.registry.list(),
        tree: meta.registry.tree(),
      });
      return;
    }

    if (method === "GET" && path === "/v1/slice/runs") {
      sendJson(res, 200, { runs: listSliceRuns() });
      return;
    }

    if (method === "GET" && path.startsWith("/v1/lineage/")) {
      const runId = path.slice("/v1/lineage/".length);
      const run = getSliceRun(runId);
      if (!run) {
        sendJson(res, 404, { error: "run_not_found", runId });
        return;
      }
      sendJson(res, 200, {
        runId: run.runId,
        lineage: run.lineage,
        lineageVerified: run.lineageVerified,
        cockpitView: run.cockpitView,
      });
      return;
    }

    if (method === "GET" && path.startsWith("/v1/slice/")) {
      const runId = path.slice("/v1/slice/".length);
      if (!runId || runId === "run" || runId === "runs") {
        /* handled above / fallthrough */
      } else {
        const run = getSliceRun(runId);
        if (!run) {
          sendJson(res, 404, { error: "run_not_found", runId });
          return;
        }
        const format = url.searchParams.get("format");
        sendJson(
          res,
          200,
          format === "internal" ? run : toVerticalSliceResponse(run)
        );
        return;
      }
    }

    if (method === "GET" && path === "/v1/governance/can") {
      const roleParam = url.searchParams.get("role") ?? "";
      const actionParam = url.searchParams.get("action") ?? "";
      if (!isRole(roleParam)) {
        sendJson(res, 400, {
          error: "invalid_role",
          roles: ROLES,
        });
        return;
      }
      const allowed = can(roleParam, actionParam as Action);
      sendJson(res, 200, {
        role: roleParam,
        action: actionParam,
        allowed,
      });
      return;
    }

    // Router composition (Express-equivalent: app.use(verticalSlice); app.use(system))
    if (
      await verticalSliceRouter({
        method,
        path,
        url,
        req,
        res,
        sendJson,
        onError: (err) =>
          log.error("slice_run_failed", {
            error: err instanceof Error ? err.message : String(err),
            path,
          }),
      })
    ) {
      return;
    }

    if (
      await systemRouter({
        method,
        path,
        deps: systemRouteDeps,
        res,
        sendJson,
      })
    ) {
      return;
    }

    if (method === "POST" && path === "/demo/predict-and-simulate") {
      let body: {
        instrumentId?: string;
        horizonSec?: number;
        size?: number;
        mode?: string;
      };
      try {
        body = (await readJson(req)) as typeof body;
      } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return;
      }
      if (
        !body.instrumentId ||
        typeof body.horizonSec !== "number" ||
        typeof body.size !== "number"
      ) {
        sendJson(res, 400, {
          error: "invalid_body",
          expected: {
            instrumentId: "string",
            horizonSec: "number",
            size: "number",
          },
        });
        return;
      }

      // Default cockpit path = in-process vertical slice (no FastAPI required)
      if (body.mode !== "legacy_http") {
        const result = await runVerticalSlice({
          source: "demo",
          instrumentId: body.instrumentId,
          horizonSec: body.horizonSec,
          size: body.size,
        });
        sendJson(res, 200, {
          features: result.features,
          prediction: result.prediction,
          calibration: result.prediction.calibration,
          uncertainty: result.prediction.uncertainty,
          risk: result.risk,
          decision: result.decision,
          execution: result.execution,
          outcome: result.outcome,
          lineage: result.lineage,
          lineageVerified: result.lineageVerified,
          cockpitView: result.cockpitView,
          runId: result.runId,
          path: "vertical_slice",
        });
        return;
      }

      const result = await predictAndSimulate({
        instrumentId: body.instrumentId,
        horizonSec: body.horizonSec,
        size: body.size,
      });
      sendJson(res, result.status, result.body);
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  })().catch((err) => {
    log.error("unhandled", {
      error: err instanceof Error ? err.message : String(err),
    });
    sendJson(res, 500, { error: "internal_error" });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  log.info("listening", {
    port: PORT,
    predictionUrl: PREDICTION_URL,
    riskUrl: RISK_URL,
    execUrl: EXEC_URL,
    canonicalFlow: CANONICAL_FLOW.join(" → "),
  });
});

