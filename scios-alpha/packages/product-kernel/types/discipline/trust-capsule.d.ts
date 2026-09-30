/**
 * Trust Capsule — evidence-native professional summary for consequential results.
 * ALPHA_NON_PRODUCTION
 */
export function buildTrustCapsule(slice?: {}): {
    schema: string;
    label: string;
    runId: any;
    professional: {
        sourceFreshness: any;
        evidenceCoverage: string;
        modelVersion: string;
        uncertainty: string | {
            abstain: any;
            interval: any;
            calibration: any;
        };
        calibrationValidationStatus: any;
        risk: any;
        policy: any;
        lineageAvailability: boolean;
    };
    forensicExpandOnDemand: boolean;
    note: string;
};
