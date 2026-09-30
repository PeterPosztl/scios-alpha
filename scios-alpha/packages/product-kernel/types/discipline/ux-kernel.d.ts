/**
 * UX Kernel contract — normalize Shell foundation (extend cockpit, don't fork).
 * ALPHA_NON_PRODUCTION
 */
export function buildUxKernelInventory(cockpitSource?: string): {
    schema: string;
    label: string;
    architecture: string;
    foundation: {
        designTokens: any;
        componentPrimitives: any;
        applicationShell: any;
        workspaceManager: any;
        objectRenderers: any;
        actionRenderers: any;
        evidenceRenderers: any;
        aiContextRenderers: any;
        experienceRenderer: any;
        trustCapsule: any;
    };
    professionalHierarchy: string[];
    rawJsonPolicy: string;
    goldenFlow: string[];
    goldenFlowPresent: {
        HOME: any;
        SEARCH: any;
        ENTITY360: any;
        ANALYSIS: any;
        UNCERTAINTY: any;
        RISK: any;
        GOVERNANCE: any;
        DECISION: any;
        SIMULATION_ACTION: any;
        EVIDENCE: any;
        LINEAGE: any;
    };
};
export function auditGoldenUxFlow(uxKernel: any): {
    schema: string;
    pass: boolean;
    missing: string[];
    present: string[];
    deadControlsTarget: number;
    note: string;
};
