/**
 * Actor Context Envelope — one identity path for experience, permission, risk, governance.
 * ALPHA_NON_PRODUCTION
 */
export function buildActorContext(input?: {}): {
    schema: string;
    label: string;
    userId: any;
    actorId: any;
    roleId: any;
    workspaceId: any;
    objectId: any;
    sessionId: any;
    permissionContext: any;
    policyContext: any;
    executionMode: any;
    serviceActor: any;
    note: string;
};
