export class ProductKernel {
    constructor(appRoot: any);
    appRoot: any;
    identity: IdentityResolver;
    capabilities: {
        schema: string;
        label: string;
        source: string;
        capabilities: any[];
        note: string;
        error?: undefined;
        packaged?: undefined;
    } | {
        capabilities: any[];
        error: string;
        schema?: undefined;
        label?: undefined;
        source?: undefined;
        note?: undefined;
        packaged?: undefined;
    } | {
        schema: string;
        label: string;
        source: string;
        packaged: boolean;
        capabilities: any[];
        note?: undefined;
        error?: undefined;
    };
    objects: {
        schema: string;
        label: string;
        types: string[];
        note: string;
    };
    actions: {
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
    workflows: {
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
    roles: {
        schema: string;
        label: string;
        source: string;
        archetypes: any;
        rolesSeeded: any;
        roles: any[];
    };
    workspaces: {
        schema: string;
        label: string;
        authority: string;
        note: string;
        profiles: {};
    };
    navigation: {
        primary: string[];
        secondary: string[];
        note: string;
    };
    commands: {
        schema: string;
        commands: string[];
    };
    loadRoles(): {
        schema: string;
        label: string;
        source: string;
        archetypes: any;
        rolesSeeded: any;
        roles: any[];
    };
    actorContext(input?: {}): {
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
    /** Validated PDR compile — runtime registry authority. */
    compiledRegistry(): {
        ok: boolean;
        errors: Array<{
            code: string;
            detail: string;
        }>;
        compiled: object | null;
    };
    /** Frontend-safe capability/state projection. */
    uiProjection(input?: {}): {
        schema: string;
        legacySchema: string;
        label: string;
        at: string;
        role: {
            roleId: any;
            mission: any;
            status: any;
            domain: any;
        };
        actor: any;
        jtbd: {
            tasks: any;
            workflows: any;
        };
        object: any;
        workflowState: any;
        permissions: any;
        capabilities: {
            summary: any;
            profileDisabled: any;
            proven: any;
        };
        risk: any;
        governance: {
            executionMode: any;
            reviewKind: string;
            governedApprovalAvailable: boolean;
        };
        evidence: {
            lineageAvailable: boolean;
            persistenceState: any;
        };
        hostReadiness: {
            shellStatus: any;
            goldenWorkflow1: any;
            p0Protected: boolean;
        };
        note: string;
    };
    buildWorkspaceMap(): {
        schema: string;
        label: string;
        authority: string;
        note: string;
        profiles: {};
    };
    buildNavigation(): {
        primary: string[];
        secondary: string[];
        note: string;
    };
    buildCommands(): {
        schema: string;
        commands: string[];
    };
    capabilityGraph(): {
        schema: string;
        label: string;
        edges: {
            from: any;
            to: any;
            type: string;
        }[];
    };
    gapReport(): {
        schema: string;
        label: string;
        gaps: ({
            kind: string;
            id: string;
            detail: string;
        } | {
            kind: string;
            id: any;
            detail?: undefined;
        })[];
        orderedNext: string[];
    };
    resolveEntity(instrumentId: any): {
        id: string;
        type: any;
        version: any;
        title: any;
        status: any;
        createdAt: any;
        updatedAt: any;
        asOf: any;
        owner: any;
        source: any;
        permissions: any;
        relationships: any;
        evidenceRefs: any;
        lineageRefs: any;
    };
    professionalFromSlice(data: any): {
        empty: boolean;
        whatHappened: string;
        nextAction: string;
        instrument?: undefined;
        runId?: undefined;
        status?: undefined;
        asOf?: undefined;
        expectedOutcome?: undefined;
        certainty?: undefined;
        certaintyLabel?: undefined;
        risk?: undefined;
        riskReason?: undefined;
        policy?: undefined;
        policyReason?: undefined;
        recommendedNext?: undefined;
        simulation?: undefined;
        evidence?: undefined;
        rawRefs?: undefined;
    } | {
        empty: boolean;
        instrument: any;
        runId: any;
        status: any;
        asOf: any;
        whatHappened: string;
        expectedOutcome: any;
        certainty: any;
        certaintyLabel: string;
        risk: any;
        riskReason: any;
        policy: any;
        policyReason: any;
        recommendedNext: string;
        simulation: {
            action: any;
            outcome: any;
            simulated: boolean;
        };
        evidence: {
            lineageId: any;
            nodeCount: any;
        };
        rawRefs: {
            predictionId: any;
            riskDecisionId: any;
        };
        nextAction?: undefined;
    };
    snapshot(): {
        schema: string;
        label: string;
        at: string;
        capabilitySummary: {
            total: any;
            counts: {};
        };
        workflowCounts: {
            total: number;
            partial: number;
            missing: number;
        };
        roles: {
            archetypes: any;
            seeded: any;
        };
        p0Protected: boolean;
        shellStatus: string;
        goldenWorkflow1: string;
        discipline: {
            schema: string;
            slo: {
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
            ontologyStatus: string;
            maturityRule: string;
        };
    };
    disciplineSnapshot(): {
        slo: {
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
        contracts: {
            schema: string;
            label: string;
            policy: string;
            contracts: ({
                id: string;
                version: string;
                surface: string;
                protected: boolean;
                changePolicy?: undefined;
            } | {
                id: string;
                version: string;
                surface: string;
                protected: boolean;
                changePolicy: string;
            })[];
        };
        ontology: {
            schema: string;
            label: string;
            pattern: string;
            extends: string[];
            objectFamilies: {
                family: string;
                types: string[];
            }[];
            relationships: {
                type: string;
                from: string;
                to: string;
            }[];
            actions: {
                actionId: string;
                governed: boolean;
                runtimePath: string;
                note: string;
            }[];
            objectTypeCount: number;
            gaps: string[];
            status: string;
        };
        tower: {
            schema: string;
            label: string;
            extends: string;
            audience: string;
            notPrimaryProfessionalUx: boolean;
            assets: {
                id: string;
                kind: string;
                owner: string;
                purpose: string;
                provider: string;
                version: string;
                permissions: string[];
                riskClass: string;
                policy: string;
                cost: string;
                usage: string;
                evaluationStatus: string;
                maturity: string;
                dependentWorkflows: string[];
                dependentRoles: string[];
                evidence: string[];
                lastValidatedAt: any;
            }[];
        };
    };
}
import { IdentityResolver } from "./identity.js";
import { loadCapabilityRegistry } from "./capability-registry.js";
import { summarizeCapabilities } from "./capability-registry.js";
import { toProfessionalAnalysis } from "./professional-view.js";
import { canonicalId } from "./identity.js";
import { createObjectShell } from "./identity.js";
import * as discipline from "./discipline/index.js";
import { buildActorContext } from "./actor-context.js";
import { kernelUiProjection } from "./kernel-ui-projection.js";
export { loadCapabilityRegistry, summarizeCapabilities, toProfessionalAnalysis, canonicalId, createObjectShell, discipline, buildActorContext, kernelUiProjection };
