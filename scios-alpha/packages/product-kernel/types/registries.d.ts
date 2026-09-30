/**
 * Object / Action / Workflow registries — connect existing capabilities; no parallel OS.
 * ALPHA_NON_PRODUCTION
 */
export function buildObjectRegistry(): {
    schema: string;
    label: string;
    types: string[];
    note: string;
};
export function buildActionRegistry(): {
    schema: string;
    label: string;
    actions: ({
        actionId: string;
        handler: string;
        requires: string[];
        maturity: string;
        runtimePath: string;
        note?: undefined;
    } | {
        actionId: string;
        handler: string;
        maturity: string;
        note: string;
        requires?: undefined;
        runtimePath?: undefined;
    })[];
};
export function buildWorkflowRegistry(): {
    schema: string;
    label: string;
    workflows: ({
        workflowId: string;
        name: string;
        role: string;
        status: string;
        requiredCapabilities: string[];
        note: string;
        maturityTarget: string;
    } | {
        workflowId: string;
        name: string;
        status: string;
        requiredCapabilities: string[];
        note: string;
        role?: undefined;
        maturityTarget?: undefined;
    } | {
        workflowId: string;
        name: string;
        status: string;
        requiredCapabilities: string[];
        role?: undefined;
        note?: undefined;
        maturityTarget?: undefined;
    })[];
};
