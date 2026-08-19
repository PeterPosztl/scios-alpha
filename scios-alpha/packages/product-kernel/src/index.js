import { IdentityResolver, createObjectShell, canonicalId } from "./identity.js";
import {
  loadCapabilityRegistry,
  summarizeCapabilities,
} from "./capability-registry.js";
import {
  buildObjectRegistry,
  buildActionRegistry,
  buildWorkflowRegistry,
} from "./registries.js";
import { toProfessionalAnalysis } from "./professional-view.js";
import * as discipline from "./discipline/index.js";
import { buildActorContext } from "./actor-context.js";
import {
  archetypes as pdrArchetypes,
  rolesSeed as pdrRolesSeed,
} from "@scios/professional-domain-registry";
import { listWorkspaceProfiles } from "@scios/professional-domain-registry/compiler";
import { compileProfessionalRegistry } from "@scios/professional-domain-registry/compile-registry";
import { kernelUiProjection } from "./kernel-ui-projection.js";

export class ProductKernel {
  constructor(appRoot) {
    this.appRoot = appRoot;
    this.identity = new IdentityResolver();
    this.capabilities = loadCapabilityRegistry(appRoot);
    this.objects = buildObjectRegistry();
    this.actions = buildActionRegistry();
    this.workflows = buildWorkflowRegistry();
    this.roles = this.loadRoles();
    this.workspaces = this.buildWorkspaceMap();
    this.navigation = this.buildNavigation();
    this.commands = this.buildCommands();
  }

  loadRoles() {
    // Package API only — never packages/.../src filesystem paths in installed product
    const archetypes = pdrArchetypes?.archetypes || [];
    const seeds = pdrRolesSeed?.roles || [];
    return {
      schema: "sci-os-professional-role-registry/v1",
      label: "ALPHA_NON_PRODUCTION",
      source: "@scios/professional-domain-registry",
      archetypes,
      rolesSeeded: seeds.length,
      roles: [
        ...archetypes.map((a) => ({
          roleId: a.roleId,
          professionalDomain: a.domainFamily,
          mission: a.primaryMission,
          primaryObjects: a.commonEntities,
          primaryTasks: a.topTasks,
          workflows: a.commonWorkflows,
          capabilities: a.requiredSCIcapabilities,
          defaultWorkspace: a.roleId.replace("arch.", "ws."),
          status: "ARCHETYPE_DEFINED",
        })),
        ...seeds.slice(0, 200).map((r) => ({
          roleId: r.roleId,
          professionalDomain: r.domainFamily,
          mission: r.primaryMission,
          status: "SEED_RESEARCH_REQUIRED",
        })),
      ],
    };
  }

  actorContext(input = {}) {
    return buildActorContext(input);
  }

  /** Validated PDR compile — runtime registry authority. */
  compiledRegistry() {
    return compileProfessionalRegistry();
  }

  /** Frontend-safe capability/state projection. */
  uiProjection(input = {}) {
    return kernelUiProjection(this, input);
  }

  buildWorkspaceMap() {
    // Derive from PDR Experience Compiler — no independent profile authority
    const byRole = listWorkspaceProfiles();
    const profiles = {};
    for (const entry of Object.values(byRole)) {
      const id = entry.workspaceProfileId;
      profiles[id] = (entry.modules || []).map((m) => m.id);
    }
    return {
      schema: "sci-os-workspace-map/v1",
      label: "ALPHA_NON_PRODUCTION",
      authority: "@scios/professional-domain-registry/compiler",
      note: "Derived from listWorkspaceProfiles() — Workspace Composer owns runtime compose",
      profiles,
    };
  }

  buildNavigation() {
    return {
      primary: [
        "Home",
        "Work",
        "Cases",
        "Entities",
        "Intelligence",
        "Prediction",
        "Risk",
        "Simulation",
        "Decisions",
        "Evidence",
        "Reports",
      ],
      secondary: [
        "System",
        "Engineering",
        "Recovery",
        "Governance",
        "Administration",
      ],
      note: "Shell nav contract — full shell ABSENT; cockpit implements subset",
    };
  }

  buildCommands() {
    return {
      schema: "sci-os-command-registry/v1",
      commands: [
        "Analyze instrument",
        "Open lineage",
        "Explain prediction",
        "Toggle technical view",
        "Check system status",
        "Open recovery shell",
      ],
    };
  }

  capabilityGraph() {
    const edges = [];
    for (const c of this.capabilities.capabilities || []) {
      for (const d of c.dependencies || []) {
        edges.push({ from: d, to: c.capabilityId, type: "depends_on" });
      }
    }
    for (const w of this.workflows.workflows || []) {
      edges.push({
        from: w.role || "role:unknown",
        to: w.workflowId,
        type: "role_workflow",
      });
      for (const cap of w.requiredCapabilities || []) {
        edges.push({
          from: w.workflowId,
          to: cap,
          type: "workflow_capability",
        });
      }
    }
    return {
      schema: "sci-os-capability-graph/v1",
      label: "ALPHA_NON_PRODUCTION",
      edges,
    };
  }

  gapReport() {
    const gaps = [];
    for (const w of this.workflows.workflows || []) {
      if (w.status === "MISSING") {
        gaps.push({
          kind: "MISSING_WORKFLOW",
          id: w.workflowId,
          detail: w.name,
        });
      }
      if (w.status === "PARTIAL") {
        gaps.push({
          kind: "PARTIAL_WORKFLOW",
          id: w.workflowId,
          detail: w.note || w.name,
        });
      }
    }
    for (const c of this.capabilities.capabilities || []) {
      if (["MISSING", "STUB", "UNPROVEN", "DISCONNECTED"].includes(c.implementationStatus)) {
        gaps.push({
          kind: `CAPABILITY_${c.implementationStatus}`,
          id: c.capabilityId,
        });
      }
    }
    gaps.push({
      kind: "PARTIAL_VIEW",
      id: "Entity360",
      detail: "Cockpit Entity workspace + GET /v1/entities/:id — deep graph ABSENT",
    });
    gaps.push({
      kind: "PARTIAL_VIEW",
      id: "UniversalSearch",
      detail: "GET /v1/search wired; full corpus index ABSENT",
    });
    gaps.push({
      kind: "MISSING_VIEW",
      id: "CommandPalette",
      detail: "Not implemented",
    });
    gaps.push({
      kind: "MISSING",
      id: "CleanInstallPackaging",
      detail: "Setup.exe / zero-terminal end-user path unproven",
    });
    return {
      schema: "sci-os-product-gap-report/v1",
      label: "ALPHA_NON_PRODUCTION",
      gaps,
      orderedNext: [
        "Clean-install packaging proof (Setup.exe / zero-terminal)",
        "Reboot work-state persistence proof",
        "UX scorecard ≥ 85 with measured rubric",
        "Fraud/SOC golden workflows 2–7",
      ],
    };
  }

  resolveEntity(instrumentId) {
    const id = canonicalId("Entity", instrumentId);
    this.identity.register(id, [instrumentId, `instrument:${instrumentId}`]);
    return createObjectShell("Entity", instrumentId, {
      title: instrumentId,
      status: "ACTIVE",
      source: "vertical-slice",
      aliases: [instrumentId],
    });
  }

  professionalFromSlice(data) {
    return toProfessionalAnalysis(data);
  }

  snapshot() {
    const capSummary = summarizeCapabilities(this.capabilities);
    return {
      schema: "sci-os-product-kernel-snapshot/v1",
      label: "ALPHA_NON_PRODUCTION",
      at: new Date().toISOString(),
      capabilitySummary: capSummary,
      workflowCounts: {
        total: this.workflows.workflows.length,
        partial: this.workflows.workflows.filter((w) => w.status === "PARTIAL")
          .length,
        missing: this.workflows.workflows.filter((w) => w.status === "MISSING")
          .length,
      },
      roles: {
        archetypes: this.roles.archetypes.length,
        seeded: this.roles.rolesSeeded,
      },
      p0Protected: true,
      shellStatus: "HOME_SEARCH_ENTITY_LIVE",
      goldenWorkflow1: "L7_RUNTIME_PARTIAL_PROVEN",
      discipline: {
        schema: discipline.DISCIPLINE_SCHEMA,
        slo: discipline.buildSloRegistry(),
        ontologyStatus: "PARTIAL",
        maturityRule: "NO_PROMOTE_ON_SOURCE_EXISTENCE_ALONE",
      },
    };
  }

  disciplineSnapshot() {
    return {
      slo: discipline.buildSloRegistry(),
      contracts: discipline.buildContractVersionRegistry(),
      ontology: discipline.buildOperationalOntologyMap(),
      tower: discipline.buildIntelligenceControlTower(),
    };
  }
}

export {
  loadCapabilityRegistry,
  summarizeCapabilities,
  toProfessionalAnalysis,
  canonicalId,
  createObjectShell,
  discipline,
  buildActorContext,
  kernelUiProjection,
};
