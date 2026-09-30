/**
 * BUILD_SUITE_V1 — wired analog engines composed into Control Plane.
 * Requested: no seals, no inspect-only, continuous-ready, deterministic v1 names.
 * Actual: working evaluators. continuous-ready ≠ continuous-on. Missing evidence ⇒ UNKNOWN.
 * Prediction uses the simulated book (not a hardcoded 0.025). Limit uses GuardrailLimits (not a 5% ratio).
 * KG overlay fixtures are analog/live=false. HITL stays AGENT → PROPOSAL → HUMAN → DECISION.
 * ALPHA_NON_PRODUCTION. SIMULATION_ONLY. Not READY.
 */
import { DIGITAL_WORKSPACE_COMPUTE_HOOKS } from "./digital-workspace-compute.js";
import { OS_BLUEPRINT_HOOKS, KG_NODE_MAP, KG_EDGE_MAP } from "./os-blueprint-integration.js";
import { AUTOMATION_PREP_HOOKS } from "./automation-prep.js";
import { AUDIT_LIMIT_HOOKS, evaluateAuditLimit, parseAuditLimitInput, type AuditLimitInput } from "./engine-audit.js";
import { isState } from "./honesty-flags.js";

export type EngineStatus = "PASS_CONSTRAINT" | "FAIL" | "UNKNOWN";
export type HorizonV1 = "5m" | "24h" | "72h";

export const ENGINE_SUITE_HOOKS = {
  schema: "sci-os-engine-suite/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  suite: "BUILD_SUITE_V1" as const,
  analog: true as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  autoDecide: false as const,
  autoAudit: false as const,
  autoLimits: false as const,
  continuousReady: true as const,
  continuous: false as const,
  executed: false as const,
  persisted: false as const,
  durable: false as const,
  nationalGraph: false as const,
  causalQueryEngine: "ABSENT" as const,
  computeMode: "ANALOG_COMPOSE" as const,
  digitalCompute: false as const,
  executionMode: "SIMULATION_ONLY" as const,
  note: "BUILD_SUITE_V1 is wired analog compose. continuousReady is not auto-audit. allowed/ALLOW is not an order. Not READY.",
};

export type EngineSuiteBook = {
  instrumentById: (id: string) => { id: string; symbol: string; title: string } | null;
  probability: (marketId: string) => {
    modelProbability: number;
    impliedProbability: number;
    confidence: string;
    confidenceScore: number;
    modelId: string;
    note: string;
  } | null;
  dilRisk: (marketId: string, horizon: HorizonV1) => {
    riskScore: number;
    noNewRisk: boolean;
    reason: string;
    recommendedSize: number;
  } | null;
  guardrail: () => {
    limits: { maxDailyLoss: number; maxPositionSize: number };
    dailyLoss: number;
    maxPositionNotional: number;
  };
  bucket: () => { maxExposure: number; maxLeverage: number };
  exposure: () => number;
  leverage: () => number;
  drawdown: () => number;
  signals: (marketId: string) => { kind: string; text: string; weight: number; sourceStatus: string }[];
};

function stamp() {
  return {
    ...ENGINE_SUITE_HOOKS,
    autoAudit: AUTOMATION_PREP_HOOKS.autoAudit,
    autoLimits: AUTOMATION_PREP_HOOKS.autoLimits,
    nationalGraph: OS_BLUEPRINT_HOOKS.nationalGraph,
    causalQueryEngine: OS_BLUEPRINT_HOOKS.causalQueryEngine,
    digitalCompute: isState(DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode, "COMPUTE"),
    inspectComputeMode: DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode,
  };
}

function horizonFromDays(days: unknown): HorizonV1 {
  if (days === 0 || days === 1) return "24h";
  if (typeof days === "number" && days <= 0.01) return "5m";
  if (typeof days === "number" && days >= 3) return "72h";
  return "24h";
}

function allowedOf(verdicts: { status: EngineStatus }[]) {
  return verdicts.every((v) => v.status === "PASS_CONSTRAINT");
}

export function evaluateLimitV1(
  input: { dailyLoss?: number; exposure?: number; leverage?: number },
  book: { dailyLoss: number; exposure: number; leverage: number; maxDailyLoss: number; maxExposure: number; maxLeverage: number }
) {
  const dailyLoss = input.dailyLoss ?? book.dailyLoss;
  const exposure = input.exposure ?? book.exposure;
  const leverage = input.leverage ?? book.leverage;
  const verdicts: { rule: string; status: EngineStatus; limit: number; observed: number; note: string }[] = [
    {
      rule: "maxDailyLoss",
      status: dailyLoss > book.maxDailyLoss ? "FAIL" : "PASS_CONSTRAINT",
      limit: book.maxDailyLoss,
      observed: dailyLoss,
      note: "Uses GuardrailLimits.maxDailyLoss (absolute). Not a 5% invented ratio.",
    },
    {
      rule: "maxExposure",
      status: exposure > book.maxExposure ? "FAIL" : "PASS_CONSTRAINT",
      limit: book.maxExposure,
      observed: exposure,
      note: "Uses RiskBucket.maxExposure.",
    },
    {
      rule: "maxLeverage",
      status: leverage > book.maxLeverage ? "FAIL" : "PASS_CONSTRAINT",
      limit: book.maxLeverage,
      observed: leverage,
      note: "Uses RiskBucket.maxLeverage. Advisory — no freeze/hold/block.",
    },
  ];
  return {
    ...stamp(),
    engine: "limit-engine-v1" as const,
    requestedEngine: "limit-v1" as const,
    allowed: allowedOf(verdicts),
    executed: false as const,
    freeze: false as const,
    hold: false as const,
    block: false as const,
    verdicts,
  };
}

export function evaluatePredictionV1(
  input: { instrumentId: string; horizonDays?: number },
  book: EngineSuiteBook
) {
  const inst = book.instrumentById(input.instrumentId);
  const horizon = horizonFromDays(input.horizonDays);
  if (!inst) {
    return {
      ...stamp(),
      engine: "prediction-engine-v1" as const,
      requestedEngine: "prediction-v1" as const,
      instrumentId: input.instrumentId,
      horizonDays: input.horizonDays ?? null,
      horizon,
      expectedReturn: null,
      riskVol: null,
      status: "UNKNOWN" as const,
      calibratedLive: false as const,
      note: "Unknown instrument. No evidence ⇒ UNKNOWN. Math.random refused.",
    };
  }
  const p = book.probability(inst.symbol);
  const risk = book.dilRisk(inst.symbol, horizon);
  if (!p) {
    return {
      ...stamp(),
      engine: "prediction-engine-v1" as const,
      requestedEngine: "prediction-v1" as const,
      instrumentId: input.instrumentId,
      horizon,
      expectedReturn: null,
      riskVol: null,
      status: "UNKNOWN" as const,
      calibratedLive: false as const,
      note: "No probability estimate. UNKNOWN.",
    };
  }
  const expectedReturn = Number((p.modelProbability - p.impliedProbability).toFixed(6));
  const riskVol = Number((risk?.riskScore ?? 1 - p.confidenceScore).toFixed(6));
  return {
    ...stamp(),
    engine: "prediction-engine-v1" as const,
    requestedEngine: "prediction-v1" as const,
    instrumentId: input.instrumentId,
    marketId: inst.symbol,
    horizonDays: input.horizonDays ?? null,
    horizon,
    expectedReturn,
    riskVol,
    modelProbability: p.modelProbability,
    impliedProbability: p.impliedProbability,
    modelId: p.modelId,
    status: "PASS_CONSTRAINT" as const,
    calibratedLive: false as const,
    label: "NON-PRODUCTION" as const,
    note: p.note,
  };
}

export function evaluateRiskV1(
  input: { instrumentId: string; volatility?: number; drawdown?: number; horizonDays?: number },
  book: EngineSuiteBook
) {
  const inst = book.instrumentById(input.instrumentId);
  if (!inst) {
    return {
      ...stamp(),
      engine: "risk-engine-v1" as const,
      requestedEngine: "risk-v1" as const,
      instrumentId: input.instrumentId,
      riskScore: null,
      status: "UNKNOWN" as const,
      note: "Unknown instrument. Missing vol/drawdown is not treated as 0.",
    };
  }
  const horizon = horizonFromDays(input.horizonDays);
  const fromBook = book.dilRisk(inst.symbol, horizon);
  const hasPair =
    typeof input.volatility === "number" &&
    Number.isFinite(input.volatility) &&
    typeof input.drawdown === "number" &&
    Number.isFinite(input.drawdown);
  const riskScore = hasPair
    ? Number(Math.min(1, Math.max(0, input.volatility! * 0.7 + input.drawdown! * 0.3)).toFixed(6))
    : fromBook?.riskScore ?? null;
  const status: EngineStatus = riskScore == null ? "UNKNOWN" : "PASS_CONSTRAINT";
  return {
    ...stamp(),
    engine: "risk-engine-v1" as const,
    requestedEngine: "risk-v1" as const,
    instrumentId: input.instrumentId,
    marketId: inst.symbol,
    riskScore,
    status,
    source: hasPair ? ("caller_formula_analog" as const) : ("dil_risk_book" as const),
    noNewRisk: fromBook?.noNewRisk ?? false,
    note: fromBook?.reason ?? "Analog risk. Independent GW1 risk path remains canonical for slice runs.",
  };
}

export function evaluateKgV1(instrumentId: string, book: EngineSuiteBook) {
  const inst = book.instrumentById(instrumentId);
  if (!inst) {
    return {
      ...stamp(),
      engine: "kg-engine-v1" as const,
      requestedEngine: "kg-v1" as const,
      instrumentId,
      nodes: [] as const,
      edges: [] as const,
      status: "UNKNOWN" as const,
      kgStatus: DIGITAL_WORKSPACE_COMPUTE_HOOKS.kgStatus,
      note: "No instrument node. Wave-1 overlay is not a national/causal graph.",
    };
  }
  const signals = book.signals(inst.symbol);
  const hasMacro = signals.some((s) => s.kind === "macro");
  const nodes: { id: string; type: string; kind: string; analog: true; live: false; fixture: boolean }[] = [
    { id: instrumentId, type: "INSTRUMENT", kind: KG_NODE_MAP.Instrument, analog: true, live: false, fixture: false },
    { id: "evidence:" + inst.symbol, type: "EVIDENCE", kind: KG_NODE_MAP.Evidence, analog: true, live: false, fixture: false },
    { id: "risk:" + inst.symbol, type: "RISK", kind: KG_NODE_MAP.Risk, analog: true, live: false, fixture: false },
  ];
  const edges: { from: string; to: string; relation: string; overlay: string; analog: true; live: false; fixture: boolean }[] = [
    { from: "evidence:" + inst.symbol, to: instrumentId, relation: "SUPPORTS", overlay: KG_EDGE_MAP.owns, analog: true, live: false, fixture: false },
    { from: "risk:" + inst.symbol, to: instrumentId, relation: "AFFECTS", overlay: KG_EDGE_MAP.impacts, analog: true, live: false, fixture: false },
  ];
  if (hasMacro) {
    nodes.push({
      id: "macro:rates",
      type: "MACRO",
      kind: "event",
      analog: true,
      live: false,
      fixture: true,
    });
    edges.push({
      from: "macro:rates",
      to: instrumentId,
      relation: "AFFECTS",
      overlay: KG_EDGE_MAP.impacts,
      analog: true,
      live: false,
      fixture: true,
    });
  }
  return {
    ...stamp(),
    engine: "kg-engine-v1" as const,
    requestedEngine: "kg-engine-v1" as const,
    instrumentId,
    status: "ANALOG_OVERLAY" as const,
    kgStatus: DIGITAL_WORKSPACE_COMPUTE_HOOKS.kgStatus,
    overlay: { Instrument: KG_NODE_MAP.Instrument, Risk: KG_NODE_MAP.Risk, Evidence: KG_NODE_MAP.Evidence },
    nodes,
    edges,
    note: "Deterministic analog overlay. fixture nodes are labels (live=false). causalQueryEngine=ABSENT. Not a national graph.",
  };
}

export function evaluateLineageV1(instrumentId: string, book: EngineSuiteBook) {
  const inst = book.instrumentById(instrumentId);
  const known = Boolean(inst);
  return {
    ...stamp(),
    engine: "lineage-engine-v1" as const,
    requestedEngine: "lineage-v1" as const,
    instrumentId,
    status: known ? ("ANALOG" as const) : ("UNKNOWN" as const),
    lineage: [
      { step: "prediction", source: "prediction-engine-v1", route: "/v1/ecl/engine/prediction" },
      { step: "risk", source: "risk-engine-v1", route: "/v1/ecl/engine/risk-eval" },
      { step: "audit", source: "audit-engine-v1", route: "/v1/ecl/engine/audit-eval" },
      { step: "limit", source: "limit-engine-v1", route: "/v1/ecl/engine/limit-eval" },
      { step: "gw1", source: "vertical-slice", route: "/v1/lineage/:runId", note: "Canonical run lineage when a slice run exists." },
    ],
    note: known
      ? "Analog chain labels. Not a durable ledger. GW1 /v1/lineage/:runId remains the run proof path."
      : "Unknown instrument. Lineage steps are labels only.",
  };
}

export function evaluateEvidenceV1(instrumentId: string, book: EngineSuiteBook) {
  const inst = book.instrumentById(instrumentId);
  if (!inst) {
    return {
      ...stamp(),
      engine: "evidence-engine-v1" as const,
      requestedEngine: "evidence-v1" as const,
      instrumentId,
      evidence: [] as const,
      status: "UNKNOWN" as const,
      note: "No instrument. Empty ≠ padded macro:rates / sector:tech weights.",
    };
  }
  const evidence = book.signals(inst.symbol).map((s) => ({
    type: s.kind,
    id: s.kind === "macro" ? "macro:rates" : s.kind + ":" + inst.symbol,
    weight: s.weight,
    sourceStatus: s.sourceStatus,
    text: s.text,
    analog: true as const,
    live: false as const,
  }));
  return {
    ...stamp(),
    engine: "evidence-engine-v1" as const,
    requestedEngine: "evidence-v1" as const,
    instrumentId,
    marketId: inst.symbol,
    evidence,
    status: evidence.length ? ("PARTIAL" as const) : ("UNKNOWN" as const),
    note: evidence.length
      ? "Signals from the simulated book. STUB/MANUAL is not a certified feed."
      : "No signals on this market. Empty ≠ padded demo evidence.",
  };
}

export function evaluateDecisionV1(input: { allowed?: boolean; verdicts?: { status?: string; rule?: string }[] }) {
  const verdicts = Array.isArray(input.verdicts) ? input.verdicts : [];
  const hasUnknown = verdicts.some((v) => v.status === "UNKNOWN") || input.allowed === undefined;
  const hasFail = verdicts.some((v) => v.status === "FAIL") || input.allowed === false;
  const decision = hasFail ? "BLOCK" : hasUnknown ? "HOLD" : "ALLOW";
  return {
    ...stamp(),
    engine: "decision-engine-v1" as const,
    requestedEngine: "decision-v1" as const,
    decision,
    reason: verdicts,
    autoDecide: false as const,
    autoExecute: false as const,
    executed: false as const,
    requiresHuman: true as const,
    advisory: true as const,
    note:
      decision === "ALLOW"
        ? "Analog ALLOW. Human still decides. Not a PEP live_execution flip."
        : decision === "HOLD"
          ? "NO_ACTION is valid. UNKNOWN is not ALLOW."
          : "Analog BLOCK advisory. Does not freeze/hold/block accounts.",
  };
}

export function evaluateExecutionSimV1(input: { allowed?: boolean; price?: number; size?: number }) {
  if (input.allowed !== true) {
    return {
      ...stamp(),
      engine: "execution-engine-v1" as const,
      requestedEngine: "execution-sim-v1" as const,
      executed: false as const,
      simulated: true as const,
      fillPrice: null,
      size: input.size ?? null,
      reason: "BLOCKED_BY_ENGINE_OR_UNKNOWN",
      note: "Simulator never marks executed=true. Random slippage refused.",
    };
  }
  const priceOk = typeof input.price === "number" && Number.isFinite(input.price) && input.price > 0;
  return {
    ...stamp(),
    engine: "execution-engine-v1" as const,
    requestedEngine: "execution-sim-v1" as const,
    executed: false as const,
    simulated: true as const,
    fillPreview: priceOk ? input.price : null,
    previewFillPrice: priceOk ? input.price : null,
    previewSize: input.size ?? null,
    fillPrice: null,
    size: input.size ?? null,
    status: priceOk ? ("PASS_CONSTRAINT" as const) : ("UNKNOWN" as const),
    reason: priceOk ? "ANALOG_FILL_PREVIEW" : "price_unknown",
    note: "Fill preview is deterministic (zero analog slip). executed stays false. autoTrade=false.",
  };
}

export function evaluateCockpitComputeV1(
  input: {
    userId: string;
    instrumentId: string;
    action: "BUY" | "SELL";
    size: number;
    horizonDays?: number;
    price?: number;
    dailyLoss?: number;
    exposure?: number;
    leverage?: number;
  },
  book: EngineSuiteBook
) {
  const prediction = evaluatePredictionV1(
    { instrumentId: input.instrumentId, horizonDays: input.horizonDays },
    book
  );
  const risk = evaluateRiskV1(
    {
      instrumentId: input.instrumentId,
      volatility: prediction.riskVol ?? undefined,
      drawdown: book.drawdown(),
      horizonDays: input.horizonDays,
    },
    book
  );
  const g = book.guardrail();
  const b = book.bucket();
  const audit = evaluateAuditLimit(
    {
      userId: input.userId,
      instrumentId: input.instrumentId,
      action: input.action,
      size: input.size,
      riskScore: risk.riskScore ?? undefined,
    },
    {
      maxPositionSize: g.limits.maxPositionSize,
      instrumentKnown: Boolean(book.instrumentById(input.instrumentId)),
    }
  );
  const limit = evaluateLimitV1(
    { dailyLoss: input.dailyLoss, exposure: input.exposure, leverage: input.leverage },
    {
      dailyLoss: g.dailyLoss,
      exposure: book.exposure(),
      leverage: book.leverage(),
      maxDailyLoss: g.limits.maxDailyLoss,
      maxExposure: b.maxExposure,
      maxLeverage: b.maxLeverage,
    }
  );
  const allowed = audit.allowed === true && limit.allowed === true;
  const decision = evaluateDecisionV1({
    allowed,
    verdicts: [...audit.verdicts, ...limit.verdicts],
  });
  const execution = evaluateExecutionSimV1({
    allowed: decision.decision === "ALLOW",
    price: input.price,
    size: input.size,
  });
  return {
    ...stamp(),
    engine: "cockpit-compute-v1" as const,
    requestedEngine: "cockpit-compute-v1" as const,
    computeMode: "ANALOG_COMPOSE" as const,
    digitalCompute: false as const,
    inspectComputeMode: DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode,
    prediction,
    risk,
    audit: {
      ...audit,
      engine: "audit-engine-v1" as const,
      requestedEngine: "audit-engine-v1" as const,
      continuousReady: true as const,
      continuous: false as const,
    },
    limit,
    decision,
    execution,
    executed: false as const,
    note: "BUILD_SUITE_V1 in-process compose (audit+limit). Does not flip Cockpit COMPUTE or execute.",
  };
}

export function createEngineSuite(book: EngineSuiteBook) {
  return {
    hooks: ENGINE_SUITE_HOOKS,
    inventory() {
      return {
        ...stamp(),
        suite: "BUILD_SUITE_V1" as const,
        routes: [
          "GET /v1/ecl/engine/suite",
          "GET /v1/ecl/engine/build",
          "POST /v1/ecl/engine/audit-eval",
          "POST /v1/ecl/engine/limit-eval",
          "POST /v1/ecl/engine/prediction",
          "POST /v1/ecl/engine/risk-eval",
          "GET /v1/ecl/engine/kg",
          "GET /v1/ecl/engine/lineage",
          "GET /v1/ecl/engine/evidence",
          "POST /v1/ecl/engine/decision",
          "POST /v1/ecl/engine/execution-sim",
          "POST /v1/ecl/engine/cockpit-compute",
        ],
      };
    },
    audit(input: AuditLimitInput) {
      const g = book.guardrail();
      const result = evaluateAuditLimit(input, {
        maxPositionSize: g.limits.maxPositionSize,
        instrumentKnown: Boolean(book.instrumentById(input.instrumentId)),
      });
      return {
        ...result,
        engine: "audit-engine-v1" as const,
        requestedEngine: "audit-engine-v1" as const,
        continuousReady: true as const,
        continuous: false as const,
      };
    },
    limit(input: { dailyLoss?: number; exposure?: number; leverage?: number }) {
      const g = book.guardrail();
      const b = book.bucket();
      return evaluateLimitV1(input, {
        dailyLoss: g.dailyLoss,
        exposure: book.exposure(),
        leverage: book.leverage(),
        maxDailyLoss: g.limits.maxDailyLoss,
        maxExposure: b.maxExposure,
        maxLeverage: b.maxLeverage,
      });
    },
    prediction: (input: { instrumentId: string; horizonDays?: number }) => evaluatePredictionV1(input, book),
    risk: (input: { instrumentId: string; volatility?: number; drawdown?: number; horizonDays?: number }) =>
      evaluateRiskV1(input, book),
    kg: (instrumentId: string) => evaluateKgV1(instrumentId, book),
    lineage: (instrumentId: string) => evaluateLineageV1(instrumentId, book),
    evidence: (instrumentId: string) => evaluateEvidenceV1(instrumentId, book),
    decision: evaluateDecisionV1,
    executionSim: evaluateExecutionSimV1,
    cockpitCompute: (
      input: {
        userId: string;
        instrumentId: string;
        action: "BUY" | "SELL";
        size: number;
        horizonDays?: number;
        price?: number;
        dailyLoss?: number;
        exposure?: number;
        leverage?: number;
      }
    ) => evaluateCockpitComputeV1(input, book),
  };
}

export { parseAuditLimitInput, AUDIT_LIMIT_HOOKS };
