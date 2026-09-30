export function buildWorkspaceContextEnvelope(partial?: {}): {
    schema: string;
    label: string;
    user: any;
    role: any;
    workspace: any;
    jobToBeDone: any;
    currentObject: any;
    case: any;
    selection: any;
    timeRange: any;
    filters: any;
    workflowState: any;
    permissions: any;
    openEvidence: any;
    AIContext: any;
    unsavedState: any;
    note: string;
};
export function buildExperienceContract(id: any, partial?: {}): {
    schema: string;
    contractId: any;
    version: any;
    role: any;
    intent: any;
    entry: any;
    objects: any;
    requiredCapabilities: any;
    requiredPanels: any;
    requiredActions: any;
    permissions: any;
    states: {
        loading: any;
        empty: any;
        partial: any;
        degraded: any;
        error: any;
        completion: any;
    };
    risk: any;
    governance: any;
    evidence: any;
    exitCondition: any;
    expectedOutcome: any;
    label: string;
};
export function gw1ExperienceContract(): {
    schema: string;
    contractId: any;
    version: any;
    role: any;
    intent: any;
    entry: any;
    objects: any;
    requiredCapabilities: any;
    requiredPanels: any;
    requiredActions: any;
    permissions: any;
    states: {
        loading: any;
        empty: any;
        partial: any;
        degraded: any;
        error: any;
        completion: any;
    };
    risk: any;
    governance: any;
    evidence: any;
    exitCondition: any;
    expectedOutcome: any;
    label: string;
};
export function buildRoleLenses(objectType?: string): {
    schema: string;
    objectType: string;
    invariant: string;
    lenses: {
        role: string;
        priority: string[];
        presentation: string;
        actions: string[];
        terminology: {
            entity: string;
            case: string;
        };
    }[];
};
export function translateBenchmarkPattern(row: any): {
    SOURCE: any;
    PATTERN: any;
    WHY_IT_WORKS: any;
    FOUNDER_RELEVANCE: any;
    SCI_CURRENT_EQUIVALENT: any;
    SCI_GAP: any;
    SCI_NATIVE_TRANSLATION: any;
    COPY_RISK: any;
    DECISION: any;
};
export function runUxAntiDriftLint(cockpitSource: any, opts?: {}): {
    schema: string;
    flags: ({
        id: string;
        severity: string;
        note: string;
    } | {
        id: string;
        severity: string;
        note?: undefined;
    })[];
    pass: boolean;
    productMemoryRequired: boolean;
};
export function scoreExperienceQuality(checks?: {}): {
    schema: string;
    results: {};
    passCount: number;
    ready: boolean;
    note: string;
};
/**
 * Product Memory & UX DNA — scanners and contracts.
 * ALPHA_NON_PRODUCTION
 */
export const TASK_VERBS: string[];
