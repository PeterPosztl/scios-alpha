/**
 * Product surface routes — Home, Search, Entity360, OS session.
 * Connects Product Kernel identity + vertical-slice runs. No fabricated READY.
 * ALPHA_NON_PRODUCTION
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import nodePath from "node:path";
import { listSliceRuns, getSliceRun } from "@scios/vertical-slice";
import { ProductKernel, discipline, buildActorContext } from "@scios/product-kernel";
import { compileExperience } from "@scios/professional-domain-registry/compiler";
import {
  getOrCreateSession,
  saveSession,
  listJobs,
  listNotifications,
  shellManifest,
  pushNotification,
  createJob,
  getJob,
  updateJob,
  filterJobPatch,
  isSafeJobId,
  JOB_STATES,
} from "../osSession.js";

export type SendJson = (res: ServerResponse, status: number, body: unknown) => void;

let kernelSingleton: ProductKernel | null = null;
function getKernel() {
  if (!kernelSingleton) {
    const root =
      process.env.SCIOS_APP_ROOT ||
      process.cwd();
    kernelSingleton = new ProductKernel(root);
  }
  return kernelSingleton;
}

function enrichedRuns() {
  return listSliceRuns().map((r) => {
    const full = getSliceRun(r.runId) as
      | {
          runId: string;
          outcome?: { status?: string };
          normalizedEvent?: { instrumentId?: string };
          timestamp?: string;
          asOf?: string;
        }
      | undefined;
    return {
      runId: r.runId,
      status: r.status || full?.outcome?.status || "UNKNOWN",
      instrumentId: full?.normalizedEvent?.instrumentId || null,
      createdAt: full?.timestamp || full?.asOf || null,
      tipHash: r.tipHash,
    };
  });
}

const ENTITY_CATALOG: Array<{
  id: string;
  type: string;
  title: string;
  status: string;
  aliases: string[];
  domain?: string;
}> = [
  {
    id: "Entity:AAPL",
    type: "Entity",
    title: "AAPL — Apple Inc.",
    status: "ACTIVE",
    aliases: ["AAPL", "Apple", "Apple Inc"],
    domain: "market",
  },
  {
    id: "Entity:MSFT",
    type: "Entity",
    title: "MSFT — Microsoft Corp.",
    status: "ACTIVE",
    aliases: ["MSFT", "Microsoft"],
    domain: "market",
  },
  {
    id: "Entity:GOOGL",
    type: "Entity",
    title: "GOOGL — Alphabet Inc.",
    status: "ACTIVE",
    aliases: ["GOOGL", "Alphabet", "Google"],
    domain: "market",
  },
];

function entityShell(rawId: string) {
  const q = decodeURIComponent(rawId).trim();
  const upper = q.toUpperCase().replace(/^ENTITY:/, "");
  const hit =
    ENTITY_CATALOG.find(
      (e) =>
        e.id.toUpperCase() === q.toUpperCase() ||
        e.id.toUpperCase() === `ENTITY:${upper}` ||
        e.aliases.some((a) => a.toUpperCase() === upper)
    ) || null;
  if (!hit) return null;
  const now = new Date().toISOString();
  const runs = enrichedRuns().filter((r) => {
    const id = String(r.instrumentId || "");
    return id.toUpperCase() === upper || hit.aliases.includes(id);
  });
  return {
    entity: {
      id: hit.id,
      type: hit.type,
      version: 1,
      title: hit.title,
      status: hit.status,
      createdAt: now,
      updatedAt: now,
      asOf: now,
      owner: null,
      source: "product-catalog",
      permissions: ["read", "analyze"],
      relationships: [],
      evidenceRefs: runs.map((r) => ({ runId: r.runId })),
      lineageRefs: runs.map((r) => ({ runId: r.runId })),
      symbol: upper,
      domain: hit.domain || "general",
      attributes: {
        symbol: upper,
        domain: hit.domain || "general",
        status: hit.status,
        title: hit.title,
        type: hit.type,
      },
    },
    tabs: [
      "Overview",
      "Relationships",
      "Timeline",
      "Data",
      "Predictions",
      "Risk",
      "Cases",
      "Evidence",
      "Decisions",
      "History",
    ],
    recentRuns: runs.slice(-5),
    actions: [
      { id: "analyze", label: "Analyze", capability: "vertical-slice.foundation" },
      { id: "evidence", label: "Evidence", capability: "lineage" },
      { id: "technical", label: "Technical View", capability: "engineering" },
    ],
  };
}

function searchCorpus(q: string) {
  const query = q.trim().toLowerCase();
  if (!query) {
    return {
      q,
      results: {
        entities: [],
        cases: [],
        alerts: [],
        predictions: [],
        risks: [],
        decisions: [],
        evidence: [],
        reports: [],
        models: [],
        services: [],
      },
    };
  }
  const entities = ENTITY_CATALOG.filter(
    (e) =>
      e.title.toLowerCase().includes(query) ||
      e.id.toLowerCase().includes(query) ||
      e.aliases.some((a) => a.toLowerCase().includes(query))
  ).map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    status: e.status,
  }));

  const runs = enrichedRuns();
  const predictions = runs
    .filter((r) => {
      const inst = String(r.instrumentId || "").toLowerCase();
      return inst.includes(query) || (inst && query.includes(inst));
    })
    .slice(-10)
    .map((r) => ({
      id: r.runId,
      type: "Prediction",
      title: `Prediction run ${r.runId}`,
      status: r.status || "UNKNOWN",
    }));

  const risks = predictions.map((p) => ({
    ...p,
    type: "RiskAssessment",
    title: `Risk for ${p.id}`,
  }));
  const decisions = predictions.map((p) => ({
    ...p,
    type: "Decision",
    title: `Decision for ${p.id}`,
  }));
  const evidence = predictions.map((p) => ({
    ...p,
    type: "Evidence",
    title: `Lineage for ${p.id}`,
  }));

  return {
    q,
    asOf: new Date().toISOString(),
    results: {
      entities,
      cases: [],
      alerts: [],
      predictions,
      risks,
      decisions,
      evidence,
      reports: [],
      models: [{ id: "model:baseline-nonprod", type: "Model", title: "Baseline (NON-PRODUCTION)", status: "ALPHA" }],
      services: [
        { id: "svc:control-plane", type: "Service", title: "Control Plane", status: "LIVE" },
        { id: "svc:cockpit", type: "Service", title: "Cockpit", status: "LIVE" },
      ].filter((s) => s.title.toLowerCase().includes(query) || query.length < 3),
    },
  };
}

function buildHome(sessionId?: string) {
  const session = getOrCreateSession(sessionId || "default");
  const runs = enrichedRuns().slice(-8);
  const jobs = listJobs();
  const notifications = listNotifications();
  const pendingDecisions = runs.filter((r) => {
    const s = String(r.status || "");
    return s === "HOLD" || s === "ESCALATE";
  });
  return {
    schema: "sci-os-home/v1",
    label: "ALPHA_NON_PRODUCTION",
    headline: "What needs your attention?",
    asOf: new Date().toISOString(),
    role: session.role,
    actor: sessionWithActor(session).actor,
    attention: {
      pendingDecisions: pendingDecisions.length,
      openJobs: jobs.filter(
        (j) => !["COMPLETED", "FAILED", "CANCELLED"].includes(String(j.state))
      ).length,
      notifications: notifications.length,
      recentAnalyses: runs.length,
      systemNote:
        process.env.SCI_RUNTIME_PROFILE ||
        "local-foundation — optional PG/Redis may be DEGRADED",
    },
    sections: {
      myWork: session.workspaces || [],
      analyses: runs.map((r) => ({
        runId: r.runId,
        instrumentId: r.instrumentId,
        status: r.status || "UNKNOWN",
        at: r.createdAt,
      })),
      cases: [],
      alerts: notifications.filter((n) => n.severity === "warn" || n.severity === "error"),
      risks: runs.filter((r) => String(r.status || "") === "REJECT").slice(-5),
      pendingDecisions,
      pendingApprovals: [],
      recentActivity: [
        ...runs.slice(-5).map((r) => ({
          kind: "analysis",
          id: r.runId,
          at: r.createdAt,
        })),
        ...notifications.slice(0, 5).map((n) => ({
          kind: "notification",
          id: n.notificationId,
          at: n.time,
        })),
      ],
      savedViews: session.favorites || [],
      systemStatus: {
        profile: process.env.SCI_RUNTIME_PROFILE || "local-foundation",
        executionMode: process.env.EXECUTION_MODE || "SIMULATION_ONLY",
      },
    },
    session,
  };
}

function sessionWithActor(session: ReturnType<typeof getOrCreateSession> & {
  instrumentId?: string;
  reviewKind?: string;
}) {
  const roleId =
    (typeof session.roleId === "string" && session.roleId) ||
    (typeof session.role === "string" && session.role) ||
    "arch.market_analyst";
  const actor = buildActorContext({
    userId: "local-dev-user",
    roleId,
    sessionId: session.sessionId,
    workspaceId: session.activeWorkspaceId || null,
    objectId: session.instrumentId || null,
  });
  return {
    ...session,
    role: roleId,
    roleId,
    actor,
    actorId: actor.actorId,
    reviewKind: session.reviewKind || "LOCAL_REVIEW_STATE",
  };
}

function compileProductExperience(input: {
  roleId?: string | null;
  objectId?: string | null;
  workflowState?: string | null;
  userExperienceLevel?: string | null;
  userId?: string | null;
  sessionId?: string | null;
}) {
  const roleId = input.roleId || "arch.market_analyst";
  const actor = buildActorContext({
    userId: input.userId || "local-dev-user",
    roleId,
    objectId: input.objectId || null,
    workspaceId: null,
    sessionId: input.sessionId || "default",
    permission: {
      actionsAllowed: ["entity:read", "analyze", "evidence:read"],
      actionsDenied: ["live_execution"],
      source: "governance-engine:embedded-foundation",
    },
    riskPolicy: {
      policyId: "embedded-foundation",
      highRiskActions: ["live_execution"],
      approvalRequired: true,
    },
    executionMode: process.env.EXECUTION_MODE || "SIMULATION_ONLY",
  });

  // ONE canonical compiler — Professional Domain Registry
  return compileExperience({
    roleId,
    currentObject: input.objectId || null,
    workflowState: input.workflowState || "ready",
    userExperienceLevel: input.userExperienceLevel || "intermediate",
    runtimeMount: true,
    actor,
    permission: actor.permissionContext,
    riskPolicy: actor.policyContext,
    executionProfile: actor.executionMode,
    availableData: {
      status: "PARTIAL",
      bindings: ["vertical-slice.foundation"],
    },
    sciOsCapabilities: [
      { id: "vertical-slice.foundation", proven: true },
      { id: "product-kernel", proven: true },
    ],
  });
}

export async function productRouter(opts: {
  method: string;
  path: string;
  url: URL;
  req: IncomingMessage;
  res: ServerResponse;
  sendJson: SendJson;
}): Promise<boolean> {
  const { method, path, url, res, sendJson } = opts;

  if (method === "GET" && path === "/v1/experience/compile") {
    sendJson(
      res,
      200,
      compileProductExperience({
        roleId: url.searchParams.get("roleId"),
        objectId: url.searchParams.get("objectId"),
        workflowState: url.searchParams.get("workflowState"),
        userExperienceLevel: url.searchParams.get("userExperienceLevel"),
        userId: url.searchParams.get("userId"),
        sessionId: url.searchParams.get("sessionId") || "default",
      })
    );
    return true;
  }

  if (method === "GET" && path === "/v1/home") {
    sendJson(res, 200, buildHome(url.searchParams.get("sessionId") || undefined));
    return true;
  }

  if (method === "GET" && path === "/v1/search") {
    sendJson(res, 200, searchCorpus(url.searchParams.get("q") || ""));
    return true;
  }

  if (method === "GET" && path.startsWith("/v1/entities/")) {
    const id = path.slice("/v1/entities/".length);
    if (!id) {
      sendJson(res, 400, { error: "missing_entity_id" });
      return true;
    }
    const body = entityShell(id);
    if (!body) {
      sendJson(res, 404, { error: "entity_not_found", id });
      return true;
    }
    sendJson(res, 200, body);
    return true;
  }

  if (method === "GET" && path === "/v1/os/shell") {
    sendJson(res, 200, shellManifest());
    return true;
  }

  if (method === "GET" && path === "/v1/os/session") {
    sendJson(
      res,
      200,
      sessionWithActor(
        getOrCreateSession(url.searchParams.get("sessionId") || "default")
      )
    );
    return true;
  }

  if (method === "PUT" && path === "/v1/os/session") {
    const chunks: Buffer[] = [];
    for await (const chunk of opts.req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    let patch: Record<string, unknown> = {};
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw) patch = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return true;
    }
    const ALLOWED = new Set([
      "sessionId",
      "favorites",
      "recentAnalyses",
      "viewMode",
      "instrumentId",
      "roleId",
      "userExperienceLevel",
      "version",
      "reviewKind",
    ]);
    const session = getOrCreateSession(
      String(patch.sessionId || url.searchParams.get("sessionId") || "default")
    );
    const expectedVersion = Number(session.version || 0);
    if (patch.version != null && Number(patch.version) !== expectedVersion) {
      sendJson(res, 409, {
        error: "session_version_conflict",
        expectedVersion,
        label: "ALPHA_NON_PRODUCTION",
      });
      return true;
    }
    const next: Record<string, unknown> = { ...session };
    for (const [k, v] of Object.entries(patch)) {
      if (ALLOWED.has(k) && k !== "sessionId" && k !== "version") next[k] = v;
    }
    if (typeof next.roleId === "string" && next.roleId) {
      next.role = next.roleId;
    } else if (typeof next.role === "string" && next.role) {
      next.roleId = next.role;
    }
    next.sessionId = session.sessionId;
    next.version = expectedVersion + 1;
    next.updatedAt = new Date().toISOString();
    next.schemaVersion = "sci-os-session-patch/v1";
    next.reviewKind =
      typeof next.reviewKind === "string" ? next.reviewKind : "LOCAL_REVIEW_STATE";
    const saved = saveSession(next as Parameters<typeof saveSession>[0]);
    const withActor = sessionWithActor(saved);
    next.note =
      "ALPHA session patch — actor envelope attached; allowlisted fields; version optimistic concurrency";
    sendJson(res, 200, withActor);
    return true;
  }

  if (method === "GET" && path === "/v1/integrity/summary") {
    try {
      const root = process.env.SCIOS_APP_ROOT || process.cwd();
      const p = nodePath.join(
        root,
        "diagnostics-export",
        "integrity",
        "28-final-integrity-signoff.json"
      );
      if (!fs.existsSync(p)) {
        sendJson(res, 404, {
          ok: false,
          error: "integrity_signoff_missing",
          hint: "Run pnpm integrity:run",
        });
        return true;
      }
      const body = JSON.parse(fs.readFileSync(p, "utf8"));
      sendJson(res, 200, {
        ok: true,
        label: "ALPHA_NON_PRODUCTION",
        view: "INTERNAL_ENGINEERING",
        verdicts: body.verdicts || null,
        p0Remaining: body.p0Remaining || [],
        at: body.at || null,
        note: "Not primary professional Home — engineering integrity summary only",
      });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: String((e as Error)?.message || e) });
    }
    return true;
  }

  if (method === "GET" && path === "/v1/product/context") {
    try {
      const k = getKernel();
      sendJson(
        res,
        200,
        k.uiProjection({
          roleId: url.searchParams.get("roleId") || undefined,
          objectId: url.searchParams.get("objectId") || undefined,
          workflowState: url.searchParams.get("workflowState") || undefined,
        })
      );
    } catch (e) {
      sendJson(res, 503, { ok: false, error: String((e as Error)?.message || e) });
    }
    return true;
  }

  if (method === "GET" && path === "/v1/kernel/projection") {
    try {
      const k = getKernel();
      sendJson(
        res,
        200,
        k.uiProjection({
          roleId: url.searchParams.get("roleId") || undefined,
          objectId: url.searchParams.get("objectId") || undefined,
          workflowState: url.searchParams.get("workflowState") || undefined,
        })
      );
    } catch (e) {
      sendJson(res, 503, { ok: false, error: String((e as Error)?.message || e) });
    }
    return true;
  }

  if (method === "GET" && path === "/v1/domain-registry/compiled") {
    try {
      const k = getKernel();
      const compiled = k.compiledRegistry();
      sendJson(res, compiled.ok ? 200 : 422, compiled);
    } catch (e) {
      sendJson(res, 503, { ok: false, error: String((e as Error)?.message || e) });
    }
    return true;
  }

  if (method === "GET" && path === "/v1/kernel/status") {
    try {
      const k = getKernel();
      const snap = typeof k.snapshot === "function" ? k.snapshot() : null;
      sendJson(res, 200, {
        ok: true,
        label: "ALPHA_NON_PRODUCTION",
        wired: true,
        package: "@scios/product-kernel",
        shellStatus: snap?.shellStatus || "UNKNOWN",
        goldenWorkflow1: snap?.goldenWorkflow1 || null,
        discipline: snap?.discipline || null,
        note: "Kernel identity reachable; Home/Search/Entity still served by product routes (activation in progress)",
      });
    } catch (e) {
      sendJson(res, 503, {
        ok: false,
        wired: false,
        error: String((e as Error)?.message || e),
        class: "KERNEL_LOAD_FAILED",
      });
    }
    return true;
  }

  if (method === "GET" && path === "/v1/discipline/status") {
    try {
      const k = getKernel();
      const body =
        typeof k.disciplineSnapshot === "function"
          ? k.disciplineSnapshot()
          : { error: "discipline_unavailable" };
      sendJson(res, 200, {
        ok: true,
        label: "ALPHA_NON_PRODUCTION",
        audience: "Engineering/System",
        evidence: "diagnostics-export/enterprise-discipline/",
        ...body,
      });
    } catch (e) {
      sendJson(res, 503, {
        ok: false,
        error: String((e as Error)?.message || e),
      });
    }
    return true;
  }

  if (method === "GET" && path === "/v1/intent/compile") {
    try {
      const compiled = discipline.compileIntentToOutcome({
        userIntent: url.searchParams.get("intent") || undefined,
        role: url.searchParams.get("roleId") || undefined,
        object: {
          type: "Entity",
          id: url.searchParams.get("objectId") || "AAPL",
        },
      });
      sendJson(res, 200, { ok: true, label: "ALPHA_NON_PRODUCTION", ...compiled });
    } catch (e) {
      sendJson(res, 500, { ok: false, error: String((e as Error)?.message || e) });
    }
    return true;
  }

  if (method === "GET" && path === "/v1/os/jobs") {
    sendJson(res, 200, { schema: "sci-os-jobs/v1", jobs: listJobs(), states: JOB_STATES });
    return true;
  }

  if (method === "GET" && path.startsWith("/v1/os/jobs/")) {
    const jobId = path.slice("/v1/os/jobs/".length).split("?")[0];
    if (!isSafeJobId(jobId)) {
      sendJson(res, 400, { error: "invalid_job_id" });
      return true;
    }
    const job = getJob(jobId);
    if (!job) {
      sendJson(res, 404, { error: "job_not_found", jobId });
      return true;
    }
    sendJson(res, 200, { job });
    return true;
  }

  if (method === "POST" && path === "/v1/os/jobs") {
    const chunks: Buffer[] = [];
    for await (const chunk of opts.req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    let body: Record<string, unknown> = {};
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw) body = JSON.parse(raw);
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return true;
    }
    const session = getOrCreateSession(
      typeof body.sessionId === "string" ? body.sessionId : "default"
    );
    const withActor = sessionWithActor(session);
    const out = createJob(body, { actor: withActor.actor, origin: "user" });
    if (!out.job) {
      sendJson(res, 400, { error: out.error || "create_failed" });
      return true;
    }
    sendJson(res, 201, { job: out.job });
    return true;
  }

  if (method === "PATCH" && path.startsWith("/v1/os/jobs/")) {
    const jobId = path.slice("/v1/os/jobs/".length).split("?")[0];
    if (!isSafeJobId(jobId)) {
      sendJson(res, 400, { error: "invalid_job_id" });
      return true;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of opts.req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    let body: Record<string, unknown> = {};
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw) body = JSON.parse(raw);
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return true;
    }
    if (body.state === "COMPLETE") body.state = "COMPLETED";
    const session = getOrCreateSession(
      typeof body.sessionId === "string" ? body.sessionId : "default"
    );
    const withActor = sessionWithActor(session);
    const patch = filterJobPatch(body);
    const out = updateJob(jobId, patch, {
      reason: String(body.reason || "patch"),
      actor: withActor.actor,
      origin: "user",
    });
    if (!out.job) {
      const status =
        out.error === "NOT_FOUND"
          ? 404
          : out.error === "VERSION_CONFLICT"
            ? 409
            : 409;
      sendJson(res, status, {
        error: out.error,
        detail: out.detail || null,
      });
      return true;
    }
    sendJson(res, 200, { job: out.job });
    return true;
  }

  if (method === "GET" && path === "/v1/os/notifications") {
    sendJson(res, 200, { notifications: listNotifications() });
    return true;
  }

  if (method === "GET" && path.startsWith("/v1/runs/") && path.endsWith("/professional")) {
    const runId = path.slice("/v1/runs/".length, -"/professional".length);
    const run = getSliceRun(runId);
    if (!run) {
      sendJson(res, 404, { error: "run_not_found", runId });
      return true;
    }
    sendJson(res, 200, {
      runId,
      note: "Use cockpit professional mapper; raw run available via /v1/slice/:id",
      status: (run as { status?: string }).status || "UNKNOWN",
    });
    return true;
  }

  // touch: record search into session recent
  if (method === "POST" && path === "/v1/os/recent") {
    const chunks: Buffer[] = [];
    for await (const chunk of opts.req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    let body: { kind?: string; id?: string; title?: string } = {};
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw) body = JSON.parse(raw);
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return true;
    }
    const session = getOrCreateSession("default");
    const entry = { id: body.id, title: body.title, at: new Date().toISOString() };
    if (body.kind === "entity") {
      session.recent.entities = [entry, ...(session.recent.entities || [])].slice(0, 20);
    } else if (body.kind === "search") {
      session.recent.searches = [entry, ...(session.recent.searches || [])].slice(0, 20);
    } else {
      session.recent.analyses = [entry, ...(session.recent.analyses || [])].slice(0, 20);
    }
    saveSession(session);
    pushNotification({
      type: "INFORMATION",
      reason: `Recent ${body.kind || "item"} updated`,
      object: body.id || null,
    });
    sendJson(res, 200, { ok: true, session });
    return true;
  }

  return false;
}
