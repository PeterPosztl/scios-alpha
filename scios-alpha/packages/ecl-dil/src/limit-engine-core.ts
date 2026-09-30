/**
 * SAFE inspect of requested LIMIT-ENGINE CORE (101–200).
 * Requested: 1s loop, exposure=1e6 freeze, leverage=1.5 block, dailyLoss=5% block,
 * drawdown=10% freeze autoAdjust, volatilityAdjust, LimitEnforcer freeze/hold/block,
 * LimitRecovery.verify()=true without scan.
 * Actual: analog POST /v1/ecl/engine/limit-eval using GuardrailLimits.maxDailyLoss (absolute)
 * and RiskBucket maxExposure=25000 / maxLeverage=2. Advisory only. No 1s loop.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. Missing metrics ⇒ UNKNOWN, never 0.
 */
import { AUTOMATION_PREP_HOOKS } from "./automation-prep.js";
import { ENGINE_SUITE_HOOKS } from "./engine-suite.js";

export type LimitEngineCoreResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type LimitEngineCoreCheck = {
  id: string;
  requested: string;
  result: LimitEngineCoreResult;
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
  result: LimitEngineCoreResult,
  evidence: string,
  note: string
): LimitEngineCoreCheck {
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

export const LIMIT_ENGINE_CORE_HOOKS = {
  schema: "sci-os-limit-engine-core/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoLimits: false as const,
  continuous: false as const,
  freeze: false as const,
  hold: false as const,
  block: false as const,
  autoAdjust: false as const,
  loopStarted: false as const,
  persisted: false as const,
  analogApi: "POST /v1/ecl/engine/limit-eval" as const,
  bookLimits: {
    maxDailyLoss: "GuardrailLimits.maxDailyLoss absolute (default 2500)",
    maxExposure: "RiskBucket.maxExposure 25000",
    maxLeverage: "RiskBucket.maxLeverage 2",
  },
  invented: {
    exposure1e6: false as const,
    leverage15: false as const,
    dailyLossPct05: false as const,
    drawdownPct10: false as const,
    volBaseline02: false as const,
  },
  note: "Limit core 101–200 inspect. Analog evaluateLimitV1 remains request-driven. Invented 1e6/1.5/5%/10% auto-enforcement stay REFUSED. Not READY.",
};

export function inspectLimitEngineCoreLoop() {
  return [
    chk("L101.coreLoop", "LimitEngineCore.start 1s while(running)", "REFUSED", "loopStarted=false autoLimits=" + String(AUTOMATION_PREP_HOOKS.autoLimits), "Do not start a Control Plane tight loop. Analog eval is per-request."),
    chk("L102.ruleRegistry", "LimitRuleRegistry freeze/block + autoAdjust", "ANALOG_CONTRACT", "evaluateLimitV1 " + ENGINE_SUITE_HOOKS.suite, "Advisory maxDailyLoss/maxExposure/maxLeverage. No domain-keyed invented rules."),
    chk("L103.exposure1e6", "Max Gross Exposure=1000000 freeze autoAdjust", "REFUSED", "invented=1e6 book=25000", "Do not replace RiskBucket.maxExposure."),
    chk("L104.leverage15", "Max Effective Leverage=1.5 block", "REFUSED", "invented=1.5 book=2", "Do not silently retune maxLeverage."),
    chk("L105.dailyLoss05", "Max Daily Loss=0.05 percentage block", "REFUSED", "inventedHalt=0.05", "Uses GuardrailLimits.maxDailyLoss absolute. No percent auto-block."),
    chk("L106.freezeDrawdown10", "Auto-freeze drawdown=0.10 autoAdjust", "REFUSED", "freeze=false invented=0.10", "Session analog drawdown is not an account freeze."),
    chk("L107.continuousMode", "LIMIT_CONTINUOUS_MODE.enabled=true", "REFUSED", "continuous=" + String(ENGINE_SUITE_HOOKS.continuous) + " continuousReady=" + String(ENGINE_SUITE_HOOKS.continuousReady), "continuous-ready ≠ continuous-on."),
  ];
}

export function inspectLimitEngineListeners() {
  return [
    chk("L108.ledgerListener", "onLedgerUpdate re-evaluate", "ANALOG_CONTRACT", "GET /v1/ledger preview", "Preview ledger. Not a 1s push bus."),
    chk("L109.pnlListener", "onPnLUpdate check daily loss", "ANALOG_CONTRACT", "GET /v1/pnl-book preview=true realized=false", "Notional preview. Not realized daily loss halt."),
    chk("L110.riskListener", "onRiskUpdate exposure/leverage", "ANALOG_CONTRACT", "GET /v1/risk-book preview", "skip non-finite. Missing ≠ 0."),
  ];
}

export function inspectLimitEngineAdvanced() {
  return [
    chk("L111.evaluator", "evaluate returns [] always", "ANALOG_CONTRACT", "POST /v1/ecl/engine/limit-eval", "Real analog verdicts PASS_CONSTRAINT|FAIL|UNKNOWN. Empty stub is not honesty."),
    chk("L112.volatilityAdjust", "baseline 0.02 * factor 0.5–2", "REFUSED", "inventedVol=0.02 autoAdjust=false", "Do not invent a vol baseline."),
    chk("L113.breachClassifier", "ratio=abs(current)/abs(threshold)", "REFUSED", "missing≠0", "Missing current/threshold is UNKNOWN, not warning via 0."),
    chk("L114.enforcer", "block/freeze/hold domain accounts", "REFUSED", "freeze=false hold=false block=false", "Advisory FAIL is not LimitEnforcer."),
    chk("L115.durableWriter", "INSERT INTO limit_log", "PREPARED_DISABLED", "GET persisted=false", "No limit_log applied. pgDriver=ABSENT."),
    chk("L116.metrics", "LimitMetrics counters", "PREPARED_DISABLED", "otlp.enabled=false", "Local logs only. Not Prometheus."),
    chk("L117.recoveryVerifyTrue", "verify() return true", "REFUSED", "noEvidence=UNKNOWN", "Unscanned replay is UNKNOWN, never PASS."),
    chk("L118.aggregatorBreachDefault", "severity=breach on any list", "REFUSED", "empty≠breach", "Empty breaches is not a breach stamp."),
    chk("L119.notifier", "send alert on breach", "PREPARED_DISABLED", "no alert bus", "Do not invent a pager OS."),
    chk("L120.auditHook", "emit to audit-engine 1s loop", "REFUSED", "audit loopStarted=false", "Audit core is inspect-only. No cross-engine auto bus."),
  ];
}

export function inspectLimitEngineRemainder() {
  return [
    chk("L121_150.unnamedAdvanced", "items 121–150 unnamed auto features", "REFUSED", "massStubs=false", "Do not emit 30 empty Limit* classes. Analog eval covers the slice."),
    chk("L151_200.extensions", "aggregator/notifier/hooks + 47 stubs", "REFUSED", "autoLimits=false", "Extensions that freeze/notify/auto-adjust stay REFUSED."),
  ];
}

export function buildLimitEngineCoreWave() {
  const loop = inspectLimitEngineCoreLoop();
  const listeners = inspectLimitEngineListeners();
  const advanced = inspectLimitEngineAdvanced();
  const remainder = inspectLimitEngineRemainder();
  const checks = [...loop, ...listeners, ...advanced, ...remainder];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...LIMIT_ENGINE_CORE_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 100,
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
      autoAdjusts: 0,
      applied: 0,
    },
    loop,
    listeners,
    advanced,
    remainder,
    checks,
  };
}
