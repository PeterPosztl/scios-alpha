/** Build canonical WorkspaceSpec from compile inputs + profile modules. */
export function buildWorkspaceSpec(ctx: any): {
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
export function compileExperience(input?: {}): {
    schema: string;
    label: string;
    compilerStatus: string;
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
/** Profile module tables — authority for Workspace Composer derivation. */
export function listWorkspaceProfiles(): {
    "arch.market_analyst": {
        workspaceProfileId: string;
        modules: {
            id: string;
            system: string;
            order: number;
        }[];
        aiCopilotProfile: string;
        goldenWorkflow: string;
    };
    "arch.fraud_investigator": {
        workspaceProfileId: string;
        modules: {
            id: string;
            system: string;
            order: number;
        }[];
        aiCopilotProfile: string;
    };
    "arch.soc_analyst": {
        workspaceProfileId: string;
        modules: {
            id: string;
            system: string;
            order: number;
        }[];
        aiCopilotProfile: string;
    };
    "arch.fin_risk_analyst": {
        workspaceProfileId: string;
        modules: {
            id: string;
            system: string;
            order: number;
        }[];
        aiCopilotProfile: string;
    };
    "arch.eng_operator": {
        workspaceProfileId: string;
        modules: {
            id: string;
            system: string;
            order: number;
        }[];
        aiCopilotProfile: string;
    };
    "arch.osint_analyst": {
        workspaceProfileId: string;
        modules: {
            id: string;
            system: string;
            order: number;
        }[];
        aiCopilotProfile: string;
    };
    "arch.executive": {
        workspaceProfileId: string;
        modules: {
            id: string;
            system: string;
            order: number;
        }[];
        aiCopilotProfile: string;
    };
    "arch.prediction_decision_analyst": {
        workspaceProfileId: string;
        modules: {
            id: string;
            system: string;
            order: number;
        }[];
        aiCopilotProfile: string;
    };
    "arch.auditor": {
        workspaceProfileId: string;
        modules: {
            id: string;
            system: string;
            order: number;
        }[];
        aiCopilotProfile: string;
    };
};
