/** First-release professional SLOs — not vanity 100% targets. */
export function buildSloRegistry(opts?: {}): {
    schema: string;
    label: string;
    policy: string;
    slos: {
        id: string;
        metric: string;
        target: string;
        measurementWindow: any;
        errorBudget: string;
        currentConsumption: string;
        releaseImpact: string;
        dependencyPath: string[];
    }[];
};
export function assessErrorBudgets(sloRegistry: any, measured?: {}): {
    schema: string;
    label: string;
    anyExhausted: any;
    expansionBlockedPaths: any[];
    statuses: any;
    note: string;
};
/**
 * Enterprise discipline — SLO registry for FIRST RELEASE professional outcomes.
 * Extends Product Kernel; does not create a parallel OS.
 * ALPHA_NON_PRODUCTION
 */
export const MATURITY_STATES: string[];
export const DISCIPLINE_SCHEMA: "sci-os-enterprise-discipline/v1";
