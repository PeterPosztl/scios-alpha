export function buildEvaluationBaseline(): {
    schema: string;
    label: string;
    dimensions: string[];
    archetypes: {
        id: string;
        role: string;
        domainFamily: string;
        scenario: string;
        status: string;
    }[];
    scores: {};
    storedAt: string;
    note: string;
};
export function compareEvaluation(baseline: any, current: any): {
    schema: string;
    regressions: {
        scenarioId: string;
        dimension: string;
        baseline: any;
        current: any;
    }[];
    improvements: {
        scenarioId: string;
        dimension: string;
        baseline: any;
        current: any;
    }[];
    pass: boolean;
    note: string;
};
/**
 * Professional scenario evaluation — AI/workflow as testable software.
 * Extends professional-domain-registry archetypes; stores baseline vs current.
 * ALPHA_NON_PRODUCTION
 */
export const EVAL_DIMENSIONS: string[];
