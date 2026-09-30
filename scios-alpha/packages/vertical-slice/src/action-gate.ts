/**
 * Side-effecting analyze action gate — same-process idempotency.
 * Contract aligned with product-kernel discipline action-execution/v1.
 * ALPHA_NON_PRODUCTION
 */

import { createHash, randomUUID } from "node:crypto";

export type ActionExecutionRecord = {
  schema: "sci-os-action-execution/v1";
  actionId: string;
  actionType: string;
  idempotencyKey: string;
  actor: string;
  role: string;
  objectId: string | null;
  expectedObjectVersion: string | null;
  policyVersion: string;
  riskDecision: unknown;
  requestedAt: string;
  executionState: string;
  effect: unknown;
  evidenceRefs: string[];
  executionId: string;
  replay?: boolean;
  sideEffectInvocations?: number;
};

const byKey = new Map<string, ActionExecutionRecord & { result?: unknown }>();
const sideEffectCount = new Map<string, number>();

export function makeIdempotencyKey(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export async function runIdempotentAnalyze<T>(
  opts: {
    idempotencyKey?: string;
    executionId?: string;
    actor?: string;
    role?: string;
    objectId: string;
    policyVersion?: string;
  },
  sideEffect: () => Promise<T>
): Promise<{ result: T; action: ActionExecutionRecord }> {
  const executionId = opts.executionId || `exec_${randomUUID()}`;
  const base: ActionExecutionRecord = {
    schema: "sci-os-action-execution/v1",
    actionId: "analyze",
    actionType: "ANALYZE_SIMULATION",
    idempotencyKey: opts.idempotencyKey || `ephemeral_${executionId}`,
    actor: opts.actor || "system",
    role: opts.role || "arch.market_analyst",
    objectId: opts.objectId,
    expectedObjectVersion: null,
    policyVersion: opts.policyVersion || "embedded-foundation/v1",
    riskDecision: null,
    requestedAt: new Date().toISOString(),
    executionState: "RUNNING",
    effect: null,
    evidenceRefs: [],
    executionId,
  };

  // Without explicit key: always execute (no accidental cross-click collapse).
  if (!opts.idempotencyKey) {
    const result = await sideEffect();
    const runId =
      result && typeof result === "object" && "runId" in result
        ? String((result as { runId: string }).runId)
        : null;
    return {
      result,
      action: {
        ...base,
        executionState: "SUCCEEDED",
        effect: { runId, simulated: true },
        evidenceRefs: runId ? [`run:${runId}`] : [],
        sideEffectInvocations: 1,
        replay: false,
      },
    };
  }

  const key = opts.idempotencyKey;
  const existing = byKey.get(key);
  if (existing?.result && existing.executionState === "SUCCEEDED") {
    return {
      result: existing.result as T,
      action: {
        ...existing,
        executionState: "DUPLICATE_SUPPRESSED",
        replay: true,
        sideEffectInvocations: sideEffectCount.get(key) || 1,
      },
    };
  }

  byKey.set(key, base);

  const result = await sideEffect();
  const n = (sideEffectCount.get(key) || 0) + 1;
  sideEffectCount.set(key, n);
  const runId =
    result && typeof result === "object" && "runId" in result
      ? String((result as { runId: string }).runId)
      : null;
  const done: ActionExecutionRecord & { result: T } = {
    ...base,
    idempotencyKey: key,
    executionState: "SUCCEEDED",
    effect: { runId, simulated: true },
    evidenceRefs: runId ? [`run:${runId}`] : [],
    sideEffectInvocations: n,
    replay: false,
    result,
  };
  byKey.set(key, done);
  return { result, action: done };
}

export function clearActionGate(): void {
  byKey.clear();
  sideEffectCount.clear();
}
