/**
 * Autonomic closure loop + finishing governor.
 * Unify Meta-Intelligence / Meta-Recovery / System Closure — propose only.
 * ALPHA_NON_PRODUCTION
 */
export function buildAutonomicClosureLoop(): {
    schema: string;
    label: string;
    autonomousPromotionToProduction: boolean;
    stages: string[];
    bindings: {
        OBSERVE: string[];
        GAP: string[];
        ROOT_CAUSE: string[];
        BLAST_RADIUS: string[];
        PROPOSE: string[];
        SANDBOX: string[];
        TEST: string[];
        PROFESSIONAL_EVAL: string[];
        INDEPENDENT_VERIFY: string[];
        APPROVAL: string[];
        DEPLOY: string[];
        MONITOR: string[];
        ROLLBACK: string[];
    };
};
export function buildFinishingGovernor(input?: {}): {
    schema: string;
    label: string;
    inputs: {
        internalP0: any;
        internalP1: any;
        bootReliability: any;
        primaryUxDeadEnds: any;
        mandatoryDisconnected: any;
        professionalEvalRegressions: any;
        evidenceFresh: boolean;
        errorBudgetsExhausted: boolean;
    };
    policy: string;
    verdict: string;
    blockP2P3Expansion: boolean;
};
export function buildCrownFinalProofChecklist(opts?: {}): {
    schema: string;
    label: string;
    coldInstalledFlow: {
        steps: string[];
        status: string;
    };
    negativeProofs: {
        wrongRuntimeUnavailable: string;
        wrongAppRootUnavailable: string;
        wrongEndpointWiringDetected: string;
        duplicateActionPrevented: any;
        staleEvidenceRejected: string;
        policyBypassRejected: string;
        brokenUiActionDetected: string;
        dependencyBlastRadiusCalculated: string;
        professionalRegressionDetected: string;
    };
    ready: boolean;
};
