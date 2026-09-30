/**
 * SAFE inspect of requested AUDIT-ENGINE CORE LAYER (1–25).
 * Requested: 1s while-loop, continuousMode.enabled=true, freeze/hold/block auto rules,
 * riskScore ?? 0, dailyLossPct > 0.05 halt, durable INSERT.
 * Actual: analog POST /v1/ecl/engine/audit-eval. Missing riskScore ⇒ UNKNOWN.
 * No 1s loop. No account freeze. GET persisted=false.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT.
 */
import { AUTOMATION_PREP_HOOKS } from "./automation-prep.js";
import { AUDIT_LIMIT_HOOKS } from "./engine-audit.js";

export type AuditEngineCoreResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type AuditEngineCoreCheck = {
  id: string;
  requested: string;
  result: AuditEngineCoreResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
  loopStarted: false;
};

function chk(
  id: string,
  requested: string,
  result: AuditEngineCoreResult,
  evidence: string,
  note: string
): AuditEngineCoreCheck {
  return {
    id,
    requested,
    result,
    evidence,
    note,
    autoTrade: false,
    ready: false,
    applied: false,
    loopStarted: false,
  };
}

export const AUDIT_ENGINE_CORE_HOOKS = {
  schema: "sci-os-audit-engine-core/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoAudit: false as const,
  continuous: false as const,
  freeze: false as const,
  hold: false as const,
  block: false as const,
  loopStarted: false as const,
  persisted: false as const,
  analogApi: "POST /v1/ecl/engine/audit-eval" as const,
  missingRiskScore: "UNKNOWN" as const,
  inventedDailyLossHalt: false as const,
  note: "Core layer 1–25 inspect. A 1s audit loop and auto freeze/hold/block stay REFUSED. Analog eval remains request-driven. riskScore ?? 0 refused. Not READY.",
};

export function inspectAuditEngineCoreLoop() {
  return [
    chk("A1.coreLoop", "AuditEngineCore.start 1s while(running)", "REFUSED", "loopStarted=false autoAudit=" + String(AUTOMATION_PREP_HOOKS.autoAudit), "Do not start a Control Plane tight loop. Analog eval is per-request."),
    chk("A2.ruleRegistry", "AuditRuleRegistry freeze|hold|block actions", "ANALOG_CONTRACT", "engine-audit.ts " + AUDIT_LIMIT_HOOKS.schema, "Registry of advisory verdicts exists. Action freeze is not an account freeze."),
    chk("A3.ruleLoader", "loadFromDb SELECT audit_rules", "PREPARED_DISABLED", "GET persisted=false", "No audit_rules table applied. pgDriver=ABSENT."),
    chk("A4.ruleValidator", "validate freeze/hold/block as valid actions", "REFUSED", "invalidAction=freeze-as-auto", "Validator must not bless auto-enforcement actions. Analog allow/deny/review only."),
    chk("A5.continuousMode", "DEFAULT_CONTINUOUS_MODE.enabled=true", "REFUSED", "continuous=false intervalMs unused", "Continuous-ready ≠ continuous-on."),
  ];
}

export function inspectAuditEngineListeners() {
  return [
    chk("A6.eventBus", "AuditEventListeners.emit swallow catch", "REFUSED", "silentCatch=true", "Swallowed handler errors hide UNKNOWN. Log, do not empty-catch."),
    chk("A7.ledgerSnapshot", "ctx.ledger required each tick", "ANALOG_CONTRACT", "GET /v1/ledger preview", "Preview ledger. durable=false until INSERT."),
    chk("A8.riskSnapshot", "ctx.riskScore ?? 0", "REFUSED", "missing=UNKNOWN", "Missing riskScore is UNKNOWN, never 0."),
    chk("A9.exposureSnapshot", "ctx.exposure gross/net", "ANALOG_CONTRACT", "POST /v1/ecl/engine/limit-eval", "Book notional. Empty ≠ padded."),
    chk("A10.leverageSnapshot", "ctx.leverage effective", "ANALOG_CONTRACT", "limit-eval maxLeverage", "Missing equity UNKNOWN, not /0."),
    chk("A11.dailyLossSnapshot", "ctx.dailyLoss.lossPct", "ANALOG_CONTRACT", "GuardrailLimits.maxDailyLoss absolute", "No invented percent series."),
  ];
}

export function inspectAuditEngineEnforcement() {
  return [
    chk("A12.freezeRule", "Auto-freeze on riskScore>0.9", "REFUSED", "freeze=false riskScore??0", "No auto-freeze. Threshold on coerced 0 is a honesty trap."),
    chk("A13.holdRule", "Auto-hold 0.75–0.9", "ANALOG_CONTRACT", "evaluateDecisionV1 UNKNOWN→HOLD", "Advisory HOLD only. Not payment hold."),
    chk("A14.blockRule", "Auto-block dailyLossPct>0.05", "REFUSED", "inventedHalt=0.05", "FAIL→BLOCK advisory. No 5% auto-block."),
    chk("A15.decisionComposer", "compose freeze decisions", "ANALOG_CONTRACT", "POST /v1/ecl/engine/decision", "ALLOW is not an order. autoDecide=false."),
    chk("A16.evidenceComposer", "empty kg/causal refs", "ANALOG_CONTRACT", "GET /v1/ecl/engine/evidence-v2", "Empty ≠ padded demo."),
    chk("A17.lineageComposer", "string labels only", "ANALOG_CONTRACT", "GET /v1/ecl/engine/lineage", "Analog labels + GW1 runId. Not hash fabric."),
  ];
}

export function inspectAuditEngineWriters() {
  return [
    chk("A18.durableWriter", "INSERT INTO audit_log", "PREPARED_DISABLED", "GET /v1/ecl/audit persisted=false", "In-memory session audit. durable after INSERT only."),
    chk("A19.fallbackWriter", "local file buffer if DB down", "PREPARED_DISABLED", "OPTIONAL_INFRA_DEGRADED", "Do not invent a second audit disk OS. Memory buffer stays session."),
    chk("A20.degradedHandler", "enter degraded reduce ticks", "ANALOG_CONTRACT", "OPTIONAL_INFRA_DEGRADED", "Boot without pg is allowed. Not a tick-rate auto-engine."),
    chk("A21.hotReload", "reload rules without restart", "REFUSED", "no audit_rules table", "Nothing to hot-reload."),
    chk("A22.tickCollect", "tick collect events every 1s", "REFUSED", "loopStarted=false", "Request-driven analog only."),
    chk("A23.tickEvaluate", "evaluate enabled freeze rules", "REFUSED", "autoAudit=false", "Per-request evaluateAuditLimit."),
    chk("A24.tickEmit", "emit auto freeze/hold/block", "REFUSED", "freeze=false hold=false block=false", "HITL remains AGENT→PROPOSAL→HUMAN→DECISION."),
    chk("A25.handleError", "tick catch → degraded forever", "PREPARED_DISABLED", "no loop", "No loop to degrade. CP errors stay local logs."),
  ];
}

export function buildAuditEngineCoreWave() {
  const loop = inspectAuditEngineCoreLoop();
  const listeners = inspectAuditEngineListeners();
  const enforcement = inspectAuditEngineEnforcement();
  const writers = inspectAuditEngineWriters();
  const checks = [...loop, ...listeners, ...enforcement, ...writers];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...AUDIT_ENGINE_CORE_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 25,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      loopsStarted: 0,
      accountsFrozen: 0,
      paymentsHeld: 0,
      autoBlocks: 0,
      applied: 0,
    },
    loop,
    listeners,
    enforcement,
    writers,
    checks,
  };
}
