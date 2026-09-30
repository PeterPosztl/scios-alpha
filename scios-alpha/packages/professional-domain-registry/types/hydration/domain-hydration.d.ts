export function hydrateDomain(input?: {}): {
    schema: string;
    ok: boolean;
    registryOk: boolean;
    registryErrors: {
        code: string;
        detail: string;
    }[];
    roleId: any;
    domainOntology: {
        domainFamily: string;
        entityTypes: string[];
        archetypeName: string;
    };
    jobToBeDone: {
        mission: string;
        topTasks: string[];
        criticalDecisions: string[];
        workflows: string[];
    };
    requiredCapabilities: string[];
    missing: string[];
};
