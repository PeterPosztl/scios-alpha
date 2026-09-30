/**
 * ENGINE_SUITE_V1 HTTP adapter — Control Plane, not Express, not a second OS.
 * ALPHA_NON_PRODUCTION
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { parseAuditLimitInput, type EclDilRuntime } from "@scios/ecl-dil";

export type SendJson = (res: ServerResponse, status: number, body: unknown) => void;

type Envelope = (data: unknown, extra?: Record<string, unknown>) => unknown;

const HONEST = {
  persisted: false,
  executable: false,
  autoTrade: false,
  governance: "AGENT → PROPOSAL → HUMAN → DECISION",
};

function str(v: unknown) {
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

function num(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export async function dispatchEngineSuite(opts: {
  method: string;
  path: string;
  url: URL;
  body: unknown;
  runtime: EclDilRuntime;
  res: ServerResponse;
  sendJson: SendJson;
  envelope: Envelope;
}): Promise<boolean> {
  const suite = opts.runtime.engineSuite;
  const body = (opts.body && typeof opts.body === "object" ? opts.body : {}) as Record<string, unknown>;
  const qid = opts.url.searchParams.get("instrumentId") || str(body.instrumentId);
  const extra = HONEST;

  if (opts.method === "GET" && (opts.path === "/v1/ecl/engine/suite" || opts.path === "/v1/ecl/engine/build")) {
    opts.sendJson(opts.res, 200, opts.envelope(suite.inventory(), extra));
    return true;
  }
  if (opts.method === "POST" && (opts.path === "/v1/ecl/engine/audit-eval" || opts.path === "/v1/ecl/engine/audit")) {
    const parsed = parseAuditLimitInput(opts.body);
    if (!parsed.ok) {
      opts.sendJson(opts.res, 400, { error: parsed.error, label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    const data = opts.runtime.engineSuite.audit(parsed.input);
    opts.sendJson(opts.res, 200, opts.envelope(data, extra));
    return true;
  }
  if (opts.method === "POST" && (opts.path === "/v1/ecl/engine/limit-eval" || opts.path === "/v1/ecl/engine/limit")) {
    opts.sendJson(
      opts.res,
      200,
      opts.envelope(
        suite.limit({ dailyLoss: num(body.dailyLoss), exposure: num(body.exposure), leverage: num(body.leverage) }),
        extra
      )
    );
    return true;
  }
  if (opts.method === "POST" && opts.path === "/v1/ecl/engine/prediction") {
    if (!qid) {
      opts.sendJson(opts.res, 400, { error: "instrumentId_required", label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    opts.sendJson(opts.res, 200, opts.envelope(suite.prediction({ instrumentId: qid, horizonDays: num(body.horizonDays) }), extra));
    return true;
  }
  if (opts.method === "POST" && opts.path === "/v1/ecl/engine/risk-eval") {
    if (!qid) {
      opts.sendJson(opts.res, 400, { error: "instrumentId_required", label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    opts.sendJson(
      opts.res,
      200,
      opts.envelope(
        suite.risk({
          instrumentId: qid,
          volatility: num(body.volatility),
          drawdown: num(body.drawdown),
          horizonDays: num(body.horizonDays),
        }),
        extra
      )
    );
    return true;
  }
  if (opts.method === "GET" && opts.path === "/v1/ecl/engine/kg") {
    if (!qid) {
      opts.sendJson(opts.res, 400, { error: "instrumentId_required", label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    opts.sendJson(opts.res, 200, opts.envelope(suite.kg(qid), extra));
    return true;
  }
  if (opts.method === "GET" && opts.path === "/v1/ecl/engine/lineage") {
    if (!qid) {
      opts.sendJson(opts.res, 400, { error: "instrumentId_required", label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    opts.sendJson(opts.res, 200, opts.envelope(suite.lineage(qid), extra));
    return true;
  }
  if (opts.method === "GET" && opts.path === "/v1/ecl/engine/evidence") {
    if (!qid) {
      opts.sendJson(opts.res, 400, { error: "instrumentId_required", label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    opts.sendJson(opts.res, 200, opts.envelope(suite.evidence(qid), extra));
    return true;
  }
  if (opts.method === "POST" && opts.path === "/v1/ecl/engine/decision") {
    opts.sendJson(
      opts.res,
      200,
      opts.envelope(
        suite.decision({
          allowed: typeof body.allowed === "boolean" ? body.allowed : undefined,
          verdicts: Array.isArray(body.verdicts) ? (body.verdicts as { status?: string; rule?: string }[]) : undefined,
        }),
        extra
      )
    );
    return true;
  }
  if (opts.method === "POST" && opts.path === "/v1/ecl/engine/execution-sim") {
    opts.sendJson(
      opts.res,
      200,
      opts.envelope(
        suite.executionSim({
          allowed: typeof body.allowed === "boolean" ? body.allowed : undefined,
          price: num(body.price),
          size: num(body.size),
        }),
        extra
      )
    );
    return true;
  }
  if (opts.method === "POST" && opts.path === "/v1/ecl/engine/cockpit-compute") {
    const parsed = parseAuditLimitInput(opts.body);
    if (!parsed.ok) {
      opts.sendJson(opts.res, 400, { error: parsed.error, label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    opts.sendJson(
      opts.res,
      200,
      opts.envelope(
        suite.cockpitCompute({
          ...parsed.input,
          horizonDays: num(body.horizonDays),
          price: num(body.price),
          dailyLoss: num(body.dailyLoss),
          exposure: num(body.exposure),
          leverage: num(body.leverage),
        }),
        extra
      )
    );
    return true;
  }

  const v2 = opts.runtime.buildSuiteV2;
  const extraV2 = { ...extra, durable: v2.inventory().durable === true, livePostgres: v2.inventory().livePostgres === true };
  const ledgerAppend = opts.path === "/v1/ecl/engine/ledger/append" || opts.path === "/v1/ledger/append";
  const ledgerList = opts.path === "/v1/ecl/engine/ledger" || opts.path === "/v1/ledger";
  const pnlPath = opts.path === "/v1/ecl/engine/pnl-book" || opts.path === "/v1/pnl-book";
  const riskPath = opts.path === "/v1/ecl/engine/risk-book" || opts.path === "/v1/risk-book";

  if (opts.method === "GET" && (opts.path === "/v1/ecl/engine/build-v2" || opts.path === "/v1/ecl/clients")) {
    const data = opts.path === "/v1/ecl/clients" ? opts.runtime.clientSuite() : v2.inventory();
    opts.sendJson(opts.res, 200, opts.envelope(data, extraV2));
    return true;
  }
  if (opts.method === "POST" && ledgerAppend) {
    const result = await v2.append({
      kind: str(body.kind) || undefined,
      instrumentId: str(body.instrumentId) || undefined,
      payload: body.payload && typeof body.payload === "object" ? (body.payload as Record<string, unknown>) : {},
    });
    if (!result.ok) {
      opts.sendJson(opts.res, 400, { error: result.error, label: "ALPHA_NON_PRODUCTION", autoTrade: false, durable: false });
      return true;
    }
    opts.sendJson(opts.res, 200, opts.envelope(result, { ...extra, durable: result.durable === true, livePostgres: result.livePostgres === true }));
    return true;
  }
  if (opts.method === "GET" && ledgerList) {
    opts.sendJson(opts.res, 200, opts.envelope(v2.list(), extraV2));
    return true;
  }
  if (opts.method === "GET" && pnlPath) {
    opts.sendJson(opts.res, 200, opts.envelope(v2.pnlBook(), extraV2));
    return true;
  }
  if (opts.method === "GET" && riskPath) {
    opts.sendJson(opts.res, 200, opts.envelope(v2.riskBook(), extraV2));
    return true;
  }
  if (opts.method === "POST" && opts.path === "/v1/ecl/engine/kg/registry") {
    const node = body.node && typeof body.node === "object" ? (body.node as { id?: string; type?: string; fixture?: boolean }) : null;
    const edges = Array.isArray(body.edges) ? (body.edges as { from?: string; to?: string; relation?: string }[]) : null;
    opts.sendJson(opts.res, 200, opts.envelope(v2.kgRegistryAdd({ node, edges }), extraV2));
    return true;
  }
  if (opts.method === "GET" && opts.path === "/v1/ecl/engine/kg-v2") {
    if (!qid) {
      opts.sendJson(opts.res, 400, { error: "instrumentId_required", label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    opts.sendJson(opts.res, 200, opts.envelope(v2.kgV2(qid), extraV2));
    return true;
  }
  if (opts.method === "GET" && opts.path === "/v1/ecl/engine/evidence-v2") {
    if (!qid) {
      opts.sendJson(opts.res, 400, { error: "instrumentId_required", label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    opts.sendJson(opts.res, 200, opts.envelope(v2.evidenceV2(qid), extraV2));
    return true;
  }
  if (opts.method === "GET" && opts.path === "/v1/ecl/engine/reporting") {
    opts.sendJson(opts.res, 200, opts.envelope(v2.reporting(), extraV2));
    return true;
  }
  if (opts.method === "POST" && opts.path === "/v1/ecl/engine/cockpit-compute-v2") {
    const parsed = parseAuditLimitInput(opts.body);
    if (!parsed.ok) {
      opts.sendJson(opts.res, 400, { error: parsed.error, label: "ALPHA_NON_PRODUCTION", autoTrade: false });
      return true;
    }
    opts.sendJson(
      opts.res,
      200,
      opts.envelope(
        await v2.cockpitComputeV2({
          ...parsed.input,
          horizonDays: num(body.horizonDays),
          price: num(body.price),
          dailyLoss: num(body.dailyLoss),
          exposure: num(body.exposure),
          leverage: num(body.leverage),
        }),
        extraV2
      )
    );
    return true;
  }
  if (opts.method === "GET" && opts.path === "/v1/ecl/engine/build-v3") {
    const infra = opts.runtime.durableInfra();
    opts.sendJson(
      opts.res,
      200,
      opts.envelope(
        {
          ...v2.inventory(),
          ...infra,
          suite: "BUILD_SUITE_V3",
          ready: false,
          autoTrade: false,
          engine: "build-v3",
        },
        extraV2
      )
    );
    return true;
  }
  if (opts.method === "GET" && opts.path === "/v1/ecl/engine/infra") {
    opts.sendJson(opts.res, 200, opts.envelope(opts.runtime.durableInfra(), extraV2));
    return true;
  }
  return false;
}

/** IncomingMessage reserved for handler-shape compatibility without Express. */
export type EngineSuiteRequest = IncomingMessage;
