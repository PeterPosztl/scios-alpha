export function rolePresentationHints(): {
    "arch.market_analyst": string;
    "arch.fraud_investigator": string;
    "arch.soc_analyst": string;
    "arch.fin_risk_analyst": string;
    "arch.osint_analyst": string;
    "arch.executive": string;
    "arch.auditor": string;
    "arch.prediction_decision_analyst": string;
    "arch.eng_operator": string;
};
export function buildExperienceSpec(parts: any, compiled: any): {
    schema: string;
    label: string;
    intent: any;
    context: any;
    domain: any;
    evidence: any;
    analysis: any;
    risk: any;
    decision: any;
    lineage: any;
    degraded: any;
    degradedReasons: any;
    roleHints: {
        roleId: any;
        presentation: any;
        density: any;
        disclosure: any;
    };
    timestamps: {
        hydrationAt: string;
        compiledAt: string;
    };
    compilerVersion: string;
    workspaceSpec: any;
};
/**
 * @param {object} input — roleId, objectId, workflowState, actor, kernelProjection, policyResults, etc.
 * @param {object} deps — appRoot, recentRuns
 */
export function runExperienceCompilerPipeline(input?: object, deps?: object): {
    compilerStatus: string;
    degraded: boolean;
    degradedReasons: string[];
    experienceSpec: {
        schema: string;
        label: string;
        intent: any;
        context: any;
        domain: any;
        evidence: any;
        analysis: any;
        risk: any;
        decision: any;
        lineage: any;
        degraded: any;
        degradedReasons: any;
        roleHints: {
            roleId: any;
            presentation: any;
            density: any;
            disclosure: any;
        };
        timestamps: {
            hydrationAt: string;
            compiledAt: string;
        };
        compilerVersion: string;
        workspaceSpec: any;
    };
    compilerVersion: string;
    pipeline: {
        schema: string;
        hydrationMs: number;
        domainOk: boolean;
        registryOk: boolean;
        evidenceProven: any;
    };
    schema: string;
    label: string;
    actor: any;
    input: {
        roleId: any;
        jobToBeDone: any;
        permission: any;
        domainOntology: any;
        availableData: any;
        sciOsCapabilities: any;
        riskPolicy: any;
        userExperienceLevel: any;
        currentObject: any;
        workflowState: any;
        executionProfile: any;
    };
    output: {
        workspaceProfileId: any;
        nav: any;
        home: {
            title: any;
            attention: string;
            mission: string;
        };
        modules: any;
        actions: {
            id: string;
            label: string;
            panel: string;
        }[];
        density: any;
        disclosureDefault: any;
        aiCopilotProfile: any;
        disabledActions: any;
        nextStep: string;
        unknowns: any[];
        goldenWorkflow: any;
    };
    workspaceSpec: {
        schemaVersion: string;
        workspaceId: any;
        role: any;
        jtbd: any;
        object: any;
        contextHeader: {
            title: any;
            mission: any;
            object: any;
        };
        layout: string;
        density: any;
        disclosureLevel: any;
        panels: any;
        actions: {
            id: string;
            type: string;
            enabled: boolean;
            reason: string;
            governanceState: string;
        }[];
        warnings: {
            code: string;
            message: string;
        }[];
        attentionItems: any[];
        evidenceRequirements: string[];
        maturity: {
            modelScience: string;
            marketData: any;
            governedApproval: string;
            execution: any;
        };
        unknowns: any;
    };
    note: string;
};
export function getCompilerHealth(deps?: {}): {
    schema: string;
    label: string;
    at: string;
    compilerVersion: string;
    pipelineModule: string;
    authority: string;
    registryOk: boolean;
    capabilityRegistryPresent: boolean;
    executionMode: string;
    lastCompileAt: any;
    lastCompileLatencyMs: any;
    lastStatus: string;
    lastDegraded: boolean;
    compileCount: number;
    degraded: boolean;
    status: string;
};
export const COMPILER_VERSION: "sci-os-compiler-pipeline/v1.0.0-b008";
