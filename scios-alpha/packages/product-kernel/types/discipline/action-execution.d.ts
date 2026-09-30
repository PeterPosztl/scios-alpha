/** @typedef {'PENDING'|'RUNNING'|'SUCCEEDED'|'FAILED'|'NO_ACTION'|'DUPLICATE_SUPPRESSED'} ExecutionState */
/**
 * @param {object} partial
 */
export function createActionRecord(partial: object): {
    schema: string;
    actionId: any;
    actionType: any;
    idempotencyKey: any;
    actor: any;
    role: any;
    objectId: any;
    expectedObjectVersion: any;
    policyVersion: any;
    riskDecision: any;
    requestedAt: any;
    executionState: ExecutionState;
    effect: any;
    evidenceRefs: any;
    executionId: any;
};
/**
 * Prove retry / double-click / agent-retry / resume do not duplicate side effects.
 */
export function proveIdempotency(): Promise<{
    schema: string;
    label: string;
    invariant: string;
    first: {
        executionState: any;
        sideEffectInvocations: any;
    };
    scenarios: {
        network_retry: any;
        double_click: any;
        agent_retry: any;
        workflow_resume: any;
        process_restart_in_memory: {
            note: string;
            sideEffectInvocations: any;
            wouldDuplicateWithoutDurableStore: boolean;
        };
    };
    sideEffectCount: number;
    sameProcessPass: boolean;
    durableRestartPass: boolean;
    status: string;
    note: string;
}>;
export class IdempotentActionStore {
    /** @type {Map<string, object>} */
    byKey: Map<string, object>;
    sideEffectCount: Map<any, any>;
    /**
     * Execute once per idempotencyKey. Retries return the same effect.
     * @param {object} record
     * @param {() => Promise<object>|object} sideEffectFn
     */
    executeOnce(record: object, sideEffectFn: () => Promise<object> | object): Promise<any>;
    get(key: any): any;
    clear(): void;
}
/** Process-local store for slice analyze actions */
export const globalActionStore: IdempotentActionStore;
export type ExecutionState = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "NO_ACTION" | "DUPLICATE_SUPPRESSED";
