export function createExecutionTrace(partial?: {}): {
    schema: string;
    executionId: any;
    chain: {
        user: any;
        role: any;
        workspace: any;
        experience: any;
        action: any;
        workflow: any;
        agentOrEngine: any;
        tool: any;
        modelProvider: any;
        risk: any;
        policy: any;
        result: any;
        evidence: any;
    };
    professionalExplanation: any;
    technical: {
        metrics: any;
        logsRef: any;
        historyRef: any;
    };
    at: string;
};
export function buildExecutionObservabilityProof(sampleTrace: any): {
    schema: string;
    label: string;
    requiredChain: string[];
    sample: any;
    professionalView: string;
    technicalView: string;
    status: string;
};
