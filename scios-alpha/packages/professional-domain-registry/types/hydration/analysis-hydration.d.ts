/**
 * Analysis hydration — GW1 / vertical-slice run state when available.
 * ALPHA_NON_PRODUCTION — no synthetic predictions.
 */
export function hydrateAnalysis(input?: {}, deps?: {}): {
    schema: string;
    status: string;
    modelMaturity: string;
    latestRunId: any;
    latestRunStatus: any;
    predictionAvailable: boolean;
    note: string;
    missing: string[];
};
