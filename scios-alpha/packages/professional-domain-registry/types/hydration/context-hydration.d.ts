/**
 * Context hydration — actor envelope + kernel projection + session.
 * ALPHA_NON_PRODUCTION — missing fields remain null/UNKNOWN; never fabricated.
 */
export function hydrateContext(input?: {}, deps?: {}): {
    schema: string;
    roleId: any;
    objectId: any;
    workflowState: any;
    sessionId: any;
    userId: any;
    executionMode: any;
    actor: any;
    projection: any;
    permission: any;
    riskPolicy: any;
    hostReadiness: any;
    missing: string[];
};
