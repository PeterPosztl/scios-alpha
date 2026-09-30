export function auditProgressiveDisclosure(cockpitSource?: string): {
    schema: string;
    label: string;
    layers: {
        id: string;
        name: string;
    }[];
    defaultPriority: string[];
    surfaces: ({
        surface: string;
        prioritizes: string[];
        layersPresent: string[];
        status: string;
        note?: undefined;
    } | {
        surface: string;
        prioritizes: string[];
        layersPresent: string[];
        status: string;
        note: string;
    })[];
    noFalseSimplicity: {
        bannedUniversalScores: string[];
        dimensionalStatuses: string[];
    };
};
export function buildWorkflowOutcomeMetrics(): {
    schema: string;
    label: string;
    principle: string;
    metrics: {
        id: string;
        unit: string;
        current: string;
    }[];
    workflowId: string;
};
export function buildReleaseGovernor(input?: {}): {
    schema: string;
    label: string;
    inputs: {
        reliabilityStatus: any;
        knownP0StructuralGaps: any;
        knownP1ProductGaps: any;
        sloErrorBudgetsExhausted: boolean;
        evaluationRegressions: any;
        uxDeadEnds: any;
        disconnectedMandatoryCapabilities: any;
        evidenceFreshnessOk: boolean;
        technicalDebtNotes: any;
        externalValidationOpen: any;
    };
    policy: string;
    verdict: string;
    blockUnrelatedFeatureExpansion: boolean;
};
/**
 * Progressive disclosure UX audit + outcome metrics + dimensional readiness.
 * ALPHA_NON_PRODUCTION
 */
export const DISCLOSURE_LAYERS: {
    id: string;
    name: string;
}[];
