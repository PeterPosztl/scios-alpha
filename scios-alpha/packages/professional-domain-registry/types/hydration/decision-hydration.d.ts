/**
 * Decision hydration — policy decisions + local review semantics.
 * ALPHA_NON_PRODUCTION
 */
export function hydrateDecision(input?: {}, deps?: {}): {
    schema: string;
    workflowState: any;
    analyzeAllowed: boolean;
    liveExecutionAllowed: boolean;
    localReviewKind: string;
    governedApprovalAvailable: boolean;
    nextStep: string;
    policyDecisions: any;
    missing: string[];
};
