/**
 * Analog audit + limit constraint evaluator.
 * Requested: POST audit eval BUY/SELL vs maxSize + maxRiskScore, engine audit+limit-v1.
 * Actual: in-process analog scorer. Uses existing GuardrailLimits.maxPositionSize.
 * Missing riskScore ⇒ UNKNOWN, never allowed. Does not execute, freeze, hold, or block.
 * Does not enable continuous auto-audit / auto-limit engines.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. No evidence ⇒ UNKNOWN, never PASS.
 */

export type AuditLimitAction = "BUY" | "SELL";
export type AuditLimitStatus = "PASS_CONSTRAINT" | "FAIL" | "UNKNOWN";

export type AuditLimitInput = {
  userId: string;
  instrumentId: string;
  action: AuditLimitAction;
  size: number;
  riskScore?: number;
};

export type AuditLimitVerdict = {
  rule: "maxSize" | "maxRiskScore" | "instrument";
  status: AuditLimitStatus;
  limit?: number;
  observed?: number | null;
  note: string;
};

export const AUDIT_LIMIT_HOOKS = {
  schema: "sci-os-audit-limit-analog/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  engine: "audit+limit-analog-v1" as const,
  requestedEngine: "audit+limit-v1" as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  autoDecide: false as const,
  autoAudit: false as const,
  autoLimits: false as const,
  freeze: false as const,
  hold: false as const,
  block: false as const,
  executed: false as const,
  persisted: false as const,
  maxRiskScore: 0.8 as const,
  executionMode: "SIMULATION_ONLY" as const,
  note: "Analog constraint eval only. allowed is not an order. HITL stays AGENT → PROPOSAL → HUMAN → DECISION. Continuous auto-audit/auto-limit remain REFUSED.",
};

export function evaluateAuditLimit(
  input: AuditLimitInput,
  opts: { maxPositionSize: number; instrumentKnown: boolean }
) {
  const verdicts: AuditLimitVerdict[] = [];

  if (!opts.instrumentKnown) {
    verdicts.push({
      rule: "instrument",
      status: "UNKNOWN",
      observed: null,
      note: "Instrument is not on the simulated book. No evidence ⇒ UNKNOWN.",
    });
  } else {
    verdicts.push({
      rule: "instrument",
      status: "PASS_CONSTRAINT",
      note: "Instrument id maps to the simulated book.",
    });
  }

  const sizeFail = Number.isFinite(input.size) && input.size > opts.maxPositionSize;
  verdicts.push({
    rule: "maxSize",
    status: sizeFail ? "FAIL" : "PASS_CONSTRAINT",
    limit: opts.maxPositionSize,
    observed: input.size,
    note: sizeFail
      ? "Size exceeds GuardrailLimits.maxPositionSize."
      : "Size within analog maxPositionSize (not a live venue limit).",
  });

  if (input.riskScore == null || !Number.isFinite(input.riskScore)) {
    verdicts.push({
      rule: "maxRiskScore",
      status: "UNKNOWN",
      limit: AUDIT_LIMIT_HOOKS.maxRiskScore,
      observed: null,
      note: "riskScore absent. Defaulting to 0 would mint a false PASS.",
    });
  } else if (input.riskScore < 0 || input.riskScore > 1) {
    verdicts.push({
      rule: "maxRiskScore",
      status: "FAIL",
      limit: AUDIT_LIMIT_HOOKS.maxRiskScore,
      observed: input.riskScore,
      note: "riskScore outside [0, 1].",
    });
  } else if (input.riskScore > AUDIT_LIMIT_HOOKS.maxRiskScore) {
    verdicts.push({
      rule: "maxRiskScore",
      status: "FAIL",
      limit: AUDIT_LIMIT_HOOKS.maxRiskScore,
      observed: input.riskScore,
      note: "Analog maxRiskScore 0.8 exceeded. Advisory only — no freeze/hold/block.",
    });
  } else {
    verdicts.push({
      rule: "maxRiskScore",
      status: "PASS_CONSTRAINT",
      limit: AUDIT_LIMIT_HOOKS.maxRiskScore,
      observed: input.riskScore,
      note: "Analog riskScore within 0.8. Not a certified risk engine.",
    });
  }

  const fail = verdicts.some((v) => v.status === "FAIL");
  const unknown = verdicts.some((v) => v.status === "UNKNOWN");
  const allowed = !fail && !unknown;

  return {
    ...AUDIT_LIMIT_HOOKS,
    allowed,
    executed: false as const,
    autoTrade: false as const,
    freeze: false as const,
    hold: false as const,
    block: false as const,
    action: input.action,
    userId: input.userId,
    instrumentId: input.instrumentId,
    size: input.size,
    riskScore: input.riskScore ?? null,
    verdicts,
    governance: "AGENT → PROPOSAL → HUMAN → DECISION" as const,
    note: allowed
      ? "PASS_CONSTRAINT analog only. Does not execute BUY/SELL."
      : AUDIT_LIMIT_HOOKS.note,
  };
}

export function parseAuditLimitInput(body: unknown):
  | { ok: true; input: AuditLimitInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body_required" };
  const b = body as Record<string, unknown>;
  if (typeof b.userId !== "string" || !b.userId.trim()) return { ok: false, error: "userId_required" };
  if (typeof b.instrumentId !== "string" || !b.instrumentId.trim()) {
    return { ok: false, error: "instrumentId_required" };
  }
  if (b.action !== "BUY" && b.action !== "SELL") return { ok: false, error: "action_must_be_BUY_or_SELL" };
  if (typeof b.size !== "number" || !Number.isFinite(b.size) || b.size < 0) {
    return { ok: false, error: "size_must_be_non_negative_number" };
  }
  if (b.riskScore !== undefined && (typeof b.riskScore !== "number" || !Number.isFinite(b.riskScore))) {
    return { ok: false, error: "riskScore_must_be_number" };
  }
  return {
    ok: true,
    input: {
      userId: b.userId.trim(),
      instrumentId: b.instrumentId.trim(),
      action: b.action,
      size: b.size,
      riskScore: typeof b.riskScore === "number" ? b.riskScore : undefined,
    },
  };
}
