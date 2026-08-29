import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createLogger } from "@scios/observability";
import { InMemoryFeatureStore } from "@scios/feature-store";
import { can, audit, evaluatePolicyDecision, enforcePolicyAtActionTime, toCanEnvelope, type Role, type Action } from "@scios/governance-engine";
import { modelRegistry, seedNonProductionModels, modelHonesty, getModelValidation, listValidationRecords, applyValidationEvidence, createValidationEvidence, checkValidationStale, assertValidationTruth, uiValidationTruth, isValidValidationState, VALIDATION_STATES } from "@scios/model-registry";
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
import { productRouter } from "./routes/product.js";
import { buildActorContext } from "@scios/product-kernel";

const PORT = Number(process.env.PORT ?? 3000);
/** Local-foundation / packaged default: loopback only. Set SCIOS_BIND=0.0.0.0 only when intentional. */
const BIND = process.env.SCIOS_BIND ?? "127.0.0.1";
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

function optionalDepMetric(name: string, configured: boolean) {
  return {
    name,
    status: configured ? "CONFIGURED_UNMEASURED" : "PROFILE_DISABLED",
    samples: 0,
    note: configured
      ? "Present in env; latency histogram not first-release P0"
      : "Optional infra absent — not a system failure",
  };
}

function aiProviderMetric() {
  const configured = Boolean(process.env.OPENAI_API_KEY || process.env.SCI_AI_PROVIDER);
  return {
    name: "external_llm",
    requiredForGw1: false,
    status: configured ? "CONFIGURED_UNMEASURED" : "OPTIONAL_PROVIDER_UNAVAILABLE",
    samples: 0,
    note: "GW1 uses in-process baseline-logistic; missing LLM does not fail first-release",
  };
}

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
seedNonProductionModels(modelRegistry);
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

function bindRequestIdentity(req: IncomingMessage, res: ServerResponse): void {
  const incomingReq = String(req.headers["x-request-id"] || "").trim();
  const incomingCorr = String(req.headers["x-correlation-id"] || "").trim();
  const requestId = incomingReq || randomUUID();
  const correlationId = incomingCorr || requestId;
  res.setHeader("x-request-id", requestId);
  res.setHeader("x-correlation-id", correlationId);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  };
  const rid = res.getHeader("x-request-id");
  const cid = res.getHeader("x-correlation-id");
  if (rid) headers["x-request-id"] = String(rid);
  if (cid) headers["x-correlation-id"] = String(cid);
  res.writeHead(status, headers);
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

function matrixRoleFor(professionalRoleId: string): Role {
  if (isRole(professionalRoleId)) return professionalRoleId;
  const id = professionalRoleId.toLowerCase();
  if (id.includes("risk")) return "risk_officer";
  if (id.includes("admin")) return "admin";
  if (id.includes("operator")) return "operator";
  return "researcher";
}

function actorForGovernanceQuery(url: URL) {
  const roleId =
    url.searchParams.get("roleId") ||
    url.searchParams.get("role") ||
    "arch.market_analyst";
  const actor = buildActorContext({
    userId: url.searchParams.get("userId") || "local-dev-user",
    roleId,
    sessionId: url.searchParams.get("sessionId") || "default",
    objectId: url.searchParams.get("objectId"),
  });
  return { actor, matrixRole: matrixRoleFor(roleId) };
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
  bindRequestIdentity(req, res);
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type, x-request-id, x-correlation-id",
      "x-request-id": String(res.getHeader("x-request-id") || ""),
      "x-correlation-id": String(res.getHeader("x-correlation-id") || ""),
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
          aiProvider: aiProviderMetric().status,
        },
        dependencyMetrics: {
          node: {
            name: "bundled_or_runtime_node",
            status: "MEASURED",
            version: process.version,
            samples: 1,
          },
          database: optionalDepMetric("postgres", Boolean(process.env.DATABASE_URL)),
          redis: optionalDepMetric("redis", Boolean(process.env.REDIS_URL)),
          aiProvider: aiProviderMetric(),
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

    if (method === "GET" && path === "/v1/models/validation") {
      sendJson(res, 200, {
        schema: "sci-os-model-validation-registry/v1",
        label: "ALPHA_NON_PRODUCTION",
        states: VALIDATION_STATES,
        records: listValidationRecords(),
      });
      return;
    }

    if (method === "GET" && path.startsWith("/v1/models/") && path.endsWith("/validation")) {
      const modelId = decodeURIComponent(path.slice("/v1/models/".length, -"/validation".length));
      const rec = getModelValidation(modelId);
      const ui = uiValidationTruth(rec);
      sendJson(res, 200, {
        schema: "sci-os-model-validation/v1",
        record: rec,
        uiTruth: ui,
        truth: assertValidationTruth(rec),
      });
      return;
    }

    if (method === "POST" && path.startsWith("/v1/models/") && path.endsWith("/validation/evidence")) {
      const modelId = decodeURIComponent(
        path.slice("/v1/models/".length, -"/validation/evidence".length)
      );
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      let body: Record<string, unknown> = {};
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (raw) body = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return;
      }
      const kind = body.kind === "validation_fail" ? "validation_fail" : "validation_pass";
      const outcome = body.outcome;
      if (!isValidValidationState(outcome)) {
        sendJson(res, 400, { error: "invalid_validation_state", allowed: VALIDATION_STATES });
        return;
      }
      const evidence = createValidationEvidence(modelId, kind, {
        outcome,
        summary: String(body.summary || "evidence"),
        actorId: typeof body.actorId === "string" ? body.actorId : undefined,
        staleAfterMs: typeof body.staleAfterMs === "number" ? body.staleAfterMs : undefined,
      });
      const applied = applyValidationEvidence(modelId, evidence);
      if (applied.error) {
        sendJson(res, 409, { error: applied.error, record: applied.record });
        return;
      }
      sendJson(res, 201, { record: applied.record, evidence });
      return;
    }

    if (method === "GET" && path === "/v1/models") {
      sendJson(res, 200, {
        schema: "sci-os-model-registry/v1",
        label: "ALPHA_NON_PRODUCTION",
        models: modelRegistry.list().map((m) => ({
          ...m,
          ...modelHonesty(m.modelId),
        })),
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
      const actionParam = url.searchParams.get("action") ?? "";
      const capability = url.searchParams.get("capability") || actionParam;
      const { actor, matrixRole } = actorForGovernanceQuery(url);
      const allowed = can(matrixRole, actionParam as Action);
      const policy = evaluatePolicyDecision({
        actionId: actionParam || "unknown",
        capability,
        role: matrixRole,
        executionMode: EXECUTION_MODE,
        actorContext: {
          actorId: actor.actorId,
          roleId: actor.roleId,
          sessionId: actor.sessionId,
          objectId: actor.objectId,
        },
        serverActorContext: {
          actorId: actor.actorId,
          roleId: actor.roleId,
          sessionId: actor.sessionId,
          objectId: actor.objectId,
        },
        permission: {
          allowed,
          action: actionParam,
          source: "governance-engine:permission-matrix",
        },
        workflowState: url.searchParams.get("workflowState"),
        objectRef: url.searchParams.get("objectId") || actor.objectId,
        highRisk: /execution|live|override/i.test(actionParam),
        buildId: process.env.SCIOS_BUILD_ID || null,
      });
      sendJson(res, 200, {
        role: actor.roleId,
        roleId: actor.roleId,
        action: actionParam,
        capability,
        ...toCanEnvelope(policy),
        allowed: policy.allowed,
        denyReasons: policy.denyReasons,
        actor,
        matrixRole,
        note:
          "Server-authoritative policy decision — UI must not override. operator is never a silent UI identity.",
      });
      return;
    }

    if (method === "POST" && path === "/v1/governance/evaluate") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      let body: Record<string, unknown> = {};
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (raw) body = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return;
      }
      const roleId =
        (typeof body.roleId === "string" && body.roleId) ||
        (typeof body.role === "string" && body.role) ||
        "arch.market_analyst";
      const matrixRole = matrixRoleFor(roleId);
      const actor = buildActorContext({
        userId: (body.userId as string) || "local-dev-user",
        roleId,
        sessionId: (body.sessionId as string) || "default",
        objectId: (body.objectId as string) || null,
      });
      const policy = evaluatePolicyDecision({
        actionId: String(body.actionId || body.action || ""),
        capability: String(body.capability || body.actionId || body.action || ""),
        role: matrixRole,
        clientDecision: body.decision as "ALLOW" | "DENY" | undefined,
        attemptBypass: Boolean(body.attemptBypass),
        executionMode:
          (body.executionMode as string) || EXECUTION_MODE,
        actorContext: {
          actorId: actor.actorId,
          roleId: actor.roleId,
          sessionId: actor.sessionId,
          objectId: (body.objectId as string) || actor.objectId,
        },
        serverActorContext: {
          actorId: actor.actorId,
          roleId: actor.roleId,
          sessionId: actor.sessionId,
          objectId: actor.objectId,
        },
        permission: body.permission as { allowed: boolean } | undefined,
        risk: body.risk as { approved?: boolean; blocking?: boolean; unknown?: boolean; reason?: string } | undefined,
        workflowState: (body.workflowState as string) || null,
        objectRef: (body.objectId as string) || actor.objectId,
        highRisk: Boolean(body.highRisk),
        expectedPolicyVersion: body.expectedPolicyVersion as string | undefined,
        clientDecisionId: body.clientDecisionId as string | undefined,
        evaluationFailed: Boolean(body.evaluationFailed),
        buildId: process.env.SCIOS_BUILD_ID || null,
        runId: (body.runId as string) || null,
      });
      sendJson(res, 200, { actor, matrixRole, policy, can: toCanEnvelope(policy) });
      return;
    }

    if (method === "POST" && path === "/v1/governance/action") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      let body: Record<string, unknown> = {};
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (raw) body = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return;
      }
      const actionId = String(body.actionId || body.action || "");
      const roleId =
        (typeof body.roleId === "string" && body.roleId) ||
        (typeof body.role === "string" && body.role) ||
        "arch.market_analyst";
      const matrixRole = matrixRoleFor(roleId);
      const actor = buildActorContext({
        userId: (body.userId as string) || "local-dev-user",
        roleId,
        sessionId: (body.sessionId as string) || "default",
        objectId: (body.objectId as string) || null,
      });
      const policy = enforcePolicyAtActionTime({
        actionId,
        capability: String(body.capability || actionId),
        role: matrixRole,
        executionMode: (body.executionMode as string) || EXECUTION_MODE,
        actorContext: {
          actorId: actor.actorId,
          roleId: actor.roleId,
          sessionId: actor.sessionId,
          objectId: actor.objectId,
        },
        serverActorContext: {
          actorId: actor.actorId,
          roleId: actor.roleId,
          sessionId: actor.sessionId,
          objectId: actor.objectId,
        },
        clientDecision: body.decision as "ALLOW" | undefined,
        clientDecisionId: body.decisionId as string | undefined,
        attemptBypass: Boolean(body.attemptBypass || body.decision),
        permission: body.permission as { allowed: boolean } | undefined,
        risk: body.risk as { approved?: boolean; blocking?: boolean; unknown?: boolean } | undefined,
        workflowState: (body.workflowState as string) || null,
        objectRef: (body.objectId as string) || actor.objectId,
        expectedPolicyVersion: body.expectedPolicyVersion as string | undefined,
        highRisk: Boolean(body.highRisk),
      });
      if (policy.blocked || !policy.can) {
        sendJson(res, 403, {
          error: "policy_denied",
          reasonCodes: policy.reasonCodes,
          decision: policy.decision,
          policy,
          enforced: true,
          executed: false,
        });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        enforced: true,
        executed: true,
        actionId,
        reviewKind:
          actionId.startsWith("act.local_review") ? "LOCAL_REVIEW_STATE" : null,
        note: "PEP allowed — action recorded; LOCAL_REVIEW is not GOVERNED_APPROVAL",
        policy,
      });
      return;
    }

    // Router composition: product surface → vertical slice → system
    if (
      await productRouter({
        method,
        path,
        url,
        req,
        res,
        sendJson,
      })
    ) {
      return;
    }

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

server.listen(PORT, BIND, () => {
  log.info("listening", {
    port: PORT,
    bind: BIND,
    predictionUrl: PREDICTION_URL,
    riskUrl: RISK_URL,
    execUrl: EXEC_URL,
    canonicalFlow: CANONICAL_FLOW.join(" → "),
  });
});

