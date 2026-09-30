/**
 * Intent → Work Plan → Workflow → Experience (above Experience Compiler).
 * Propose-only — never autonomous uncontrolled action.
 * ALPHA_NON_PRODUCTION
 */
export function compileIntentToOutcome(input?: {}): {
    schema: string;
    label: string;
    intent: {
        userIntent: any;
        role: any;
        jobToBeDone: any;
        object: any;
        currentState: any;
        permissions: any;
        dataAvailability: any;
        capabilities: any;
        risk: any;
        policy: any;
    };
    workPlan: {
        schema: string;
        steps: ({
            id: string;
            title: string;
            actionId?: undefined;
            requiresHuman?: undefined;
        } | {
            id: string;
            title: string;
            actionId: string;
            requiresHuman?: undefined;
        } | {
            id: string;
            title: string;
            requiresHuman: boolean;
            actionId?: undefined;
        })[];
        autonomousExecution: boolean;
        note: string;
    };
    workflow: {
        workflowId: string;
        boundToPlan: boolean;
    };
    experienceRequest: {
        roleId: any;
        workflowState: any;
        objectId: string;
        modules: string[];
    };
    nextCompiler: string;
    mayNotBypass: string[];
};
