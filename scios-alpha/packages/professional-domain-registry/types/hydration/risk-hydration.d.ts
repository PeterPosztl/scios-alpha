/**
 * Risk hydration — policy context + execution mode gates.
 * ALPHA_NON_PRODUCTION
 */
export function hydrateRisk(input?: {}, deps?: {}): {
    schema: string;
    policyId: any;
    executionMode: any;
    highRiskActions: any;
    approvalRequired: boolean;
    deniedActions: any;
    simulationOnly: boolean;
    status: string;
    missing: string[];
};
