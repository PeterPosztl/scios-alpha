/**
 * Action execution contract + in-memory idempotency (side-effecting actions).
 * Extends governance discipline; used by vertical-slice and discipline proofs.
 * ALPHA_NON_PRODUCTION
 */

import { createHash, randomUUID } from "node:crypto";

/** @typedef {'PENDING'|'RUNNING'|'SUCCEEDED'|'FAILED'|'NO_ACTION'|'DUPLICATE_SUPPRESSED'} ExecutionState */

/**
 * @param {object} partial
 */
export function createActionRecord(partial) {
  const actionId = partial.actionId || `act_${randomUUID()}`;
  const idempotencyKey =
    partial.idempotencyKey ||
    hashKey([
      actionId,
      partial.actor || "system",
      partial.objectId || "",
      partial.expectedObjectVersion || "",
      partial.policyVersion || "embedded-foundation/v1",
    ]);
  return {
    schema: "sci-os-action-execution/v1",
    actionId,
    actionType: partial.actionType || "ANALYZE",
    idempotencyKey,
    actor: partial.actor || "system",
    role: partial.role || "operator",
    objectId: partial.objectId || null,
    expectedObjectVersion: partial.expectedObjectVersion || null,
    policyVersion: partial.policyVersion || "embedded-foundation/v1",
    riskDecision: partial.riskDecision || null,
    requestedAt: partial.requestedAt || new Date().toISOString(),
    executionState: /** @type {ExecutionState} */ (partial.executionState || "PENDING"),
    effect: partial.effect || null,
    evidenceRefs: partial.evidenceRefs || [],
    executionId: partial.executionId || `exec_${randomUUID()}`,
  };
}

function hashKey(parts) {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export class IdempotentActionStore {
  constructor() {
    /** @type {Map<string, object>} */
    this.byKey = new Map();
    this.sideEffectCount = new Map();
  }

  /**
   * Execute once per idempotencyKey. Retries return the same effect.
   * @param {object} record
   * @param {() => Promise<object>|object} sideEffectFn
   */
  async executeOnce(record, sideEffectFn) {
    const key = record.idempotencyKey;
    const existing = this.byKey.get(key);
    if (existing && ["SUCCEEDED", "NO_ACTION", "DUPLICATE_SUPPRESSED"].includes(existing.executionState)) {
      return {
        ...existing,
        executionState: "DUPLICATE_SUPPRESSED",
        replay: true,
        sideEffectInvocations: this.sideEffectCount.get(key) || 0,
      };
    }
    const running = {
      ...record,
      executionState: "RUNNING",
    };
    this.byKey.set(key, running);
    try {
      const effect = await sideEffectFn();
      const n = (this.sideEffectCount.get(key) || 0) + 1;
      this.sideEffectCount.set(key, n);
      const done = {
        ...running,
        executionState: effect?.outcome === "NO_ACTION" ? "NO_ACTION" : "SUCCEEDED",
        effect,
        evidenceRefs: [
          ...(record.evidenceRefs || []),
          ...(effect?.evidenceRefs || []),
        ],
        completedAt: new Date().toISOString(),
        sideEffectInvocations: n,
        replay: false,
      };
      this.byKey.set(key, done);
      return done;
    } catch (err) {
      const failed = {
        ...running,
        executionState: "FAILED",
        effect: { error: String(err?.message || err) },
        completedAt: new Date().toISOString(),
        sideEffectInvocations: this.sideEffectCount.get(key) || 0,
        replay: false,
      };
      this.byKey.set(key, failed);
      throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
        actionRecord: failed,
      });
    }
  }

  get(key) {
    return this.byKey.get(key);
  }

  clear() {
    this.byKey.clear();
    this.sideEffectCount.clear();
  }
}

/** Process-local store for slice analyze actions */
export const globalActionStore = new IdempotentActionStore();

/**
 * Prove retry / double-click / agent-retry / resume do not duplicate side effects.
 */
export async function proveIdempotency() {
  const store = new IdempotentActionStore();
  let counter = 0;
  const base = createActionRecord({
    actionId: "analyze",
    actionType: "ANALYZE_SIMULATION",
    actor: "proof-runner",
    role: "operator",
    objectId: "Entity:AAPL",
    expectedObjectVersion: "v1",
    policyVersion: "embedded-foundation/v1",
    idempotencyKey: "proof-key-gw1-aapl-v1",
  });

  const run = () =>
    store.executeOnce(base, async () => {
      counter += 1;
      return {
        outcome: "SUCCESS",
        runId: `run_proof_${counter}`,
        evidenceRefs: [`ev_proof_${counter}`],
      };
    });

  const scenarios = {};
  const a = await run();
  scenarios.network_retry = await run();
  scenarios.double_click = await run();
  scenarios.agent_retry = await run();
  scenarios.workflow_resume = await run();

  // Process restart simulation: new store with same key should be empty —
  // durable idempotency is LOCAL_FILE later; document as PARTIAL for restart.
  const afterRestartStore = new IdempotentActionStore();
  const restart = await afterRestartStore.executeOnce(base, async () => {
    counter += 1;
    return { outcome: "SUCCESS", runId: `run_restart_${counter}`, evidenceRefs: [] };
  });
  scenarios.process_restart_in_memory = {
    note: "In-memory store resets on process restart — durable key store PARTIAL (local-durable next)",
    sideEffectInvocations: restart.sideEffectInvocations,
    wouldDuplicateWithoutDurableStore: true,
  };

  const sameProcessDupes = [
    scenarios.network_retry,
    scenarios.double_click,
    scenarios.agent_retry,
    scenarios.workflow_resume,
  ];
  const allSuppressed = sameProcessDupes.every(
    (r) => r.replay === true && r.sideEffectInvocations === 1
  );

  return {
    schema: "sci-os-action-idempotency-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    invariant: "RETRYING THE SAME ACTION MUST NOT DUPLICATE ITS SIDE EFFECT",
    first: { executionState: a.executionState, sideEffectInvocations: a.sideEffectInvocations },
    scenarios,
    sideEffectCount: counter,
    sameProcessPass: allSuppressed && counter === 2, // 1 original + 1 restart sim
    durableRestartPass: false,
    status: allSuppressed ? "PARTIAL_PASS" : "FAIL",
    note: "Same-process retries PASS; cross-process durable idempotency still PARTIAL",
  };
}
