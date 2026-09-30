/**
 * Map vertical-slice response → human-first professional analysis cards.
 * Never fabricate values — UNKNOWN when absent.
 * ALPHA_NON_PRODUCTION
 */
export function toProfessionalAnalysis(data: any): {
    empty: boolean;
    whatHappened: string;
    nextAction: string;
    instrument?: undefined;
    runId?: undefined;
    status?: undefined;
    asOf?: undefined;
    expectedOutcome?: undefined;
    certainty?: undefined;
    certaintyLabel?: undefined;
    risk?: undefined;
    riskReason?: undefined;
    policy?: undefined;
    policyReason?: undefined;
    recommendedNext?: undefined;
    simulation?: undefined;
    evidence?: undefined;
    rawRefs?: undefined;
} | {
    empty: boolean;
    instrument: any;
    runId: any;
    status: any;
    asOf: any;
    whatHappened: string;
    expectedOutcome: any;
    certainty: any;
    certaintyLabel: string;
    risk: any;
    riskReason: any;
    policy: any;
    policyReason: any;
    recommendedNext: string;
    simulation: {
        action: any;
        outcome: any;
        simulated: boolean;
    };
    evidence: {
        lineageId: any;
        nodeCount: any;
    };
    rawRefs: {
        predictionId: any;
        riskDecisionId: any;
    };
    nextAction?: undefined;
};
