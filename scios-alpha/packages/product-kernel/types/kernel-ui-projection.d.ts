/**
 * Frontend-safe Product Kernel projection — UI must not infer capability truth.
 * ALPHA_NON_PRODUCTION
 */
export function kernelUiProjection(kernel: any, input?: {}): {
    schema: string;
    legacySchema: string;
    label: string;
    at: string;
    role: {
        roleId: any;
        mission: any;
        status: any;
        domain: any;
    };
    actor: any;
    jtbd: {
        tasks: any;
        workflows: any;
    };
    object: any;
    workflowState: any;
    permissions: any;
    capabilities: {
        summary: any;
        profileDisabled: any;
        proven: any;
    };
    risk: any;
    governance: {
        executionMode: any;
        reviewKind: string;
        governedApprovalAvailable: boolean;
    };
    evidence: {
        lineageAvailable: boolean;
        persistenceState: any;
    };
    hostReadiness: {
        shellStatus: any;
        goldenWorkflow1: any;
        p0Protected: boolean;
    };
    note: string;
};
