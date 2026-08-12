/**
 * SCI OS ×10 Meta-Intelligence Plane — Capability Registry + Self-Evolution (Gate A).
 */

import { EvidenceGraphEngine } from "./evidence-graph.js";

export const META_PLANES = [
  "enterprise_ontology",
  "capability_registry",
  "development_intelligence",
  "research_intelligence",
  "prediction_intelligence",
  "decision_intelligence",
  "risk_intelligence",
  "execution_intelligence",
  "governance_intelligence",
  "operations_intelligence",
  "economic_intelligence",
  "self_evolution_controller",
] as const;

export type MetaPlaneId = (typeof META_PLANES)[number];

export type GateStatus = "scaffold" | "alpha" | "beta" | "shadow" | "ready";

export interface CapabilityRecord {
  id: string;
  plane: MetaPlaneId;
  name: string;
  version: string;
  status: GateStatus;
  surface: string; // package or app path
  dependsOn: string[];
  notes?: string;
}

export interface EvolutionProposal {
  id: string;
  at: string;
  targetCapabilityId: string;
  rationale: string;
  riskTier: "low" | "medium" | "high";
  requiresApproval: true;
}

const DEFAULT_CAPABILITIES: CapabilityRecord[] = [
  {
    id: "ont.domain",
    plane: "enterprise_ontology",
    name: "Domain models (Zod)",
    version: "0.1.0-alpha",
    status: "alpha",
    surface: "packages/data-fabric",
    dependsOn: [],
  },
  {
    id: "cap.registry",
    plane: "capability_registry",
    name: "Capability Registry",
    version: "0.1.0-alpha",
    status: "alpha",
    surface: "packages/meta-intelligence",
    dependsOn: ["ont.domain"],
  },
  {
    id: "dev.experiments",
    plane: "development_intelligence",
    name: "Experiment tracker",
    version: "0.1.0-alpha",
    status: "scaffold",
    surface: "packages/experiment-tracker",
    dependsOn: ["cap.registry"],
  },
  {
    id: "research.validation",
    plane: "research_intelligence",
    name: "Validation / probability stubs",
    version: "0.1.0-alpha",
    status: "scaffold",
    surface: "packages/validation-engine",
    dependsOn: ["dev.experiments"],
  },
  {
    id: "pred.engine",
    plane: "prediction_intelligence",
    name: "Prediction Engine",
    version: "0.1.0-alpha",
    status: "alpha",
    surface: "apps/prediction-engine",
    dependsOn: ["ont.domain"],
  },
  {
    id: "dec.control",
    plane: "decision_intelligence",
    name: "Control-plane demo decisions",
    version: "0.1.0-alpha",
    status: "alpha",
    surface: "apps/control-plane-api",
    dependsOn: ["pred.engine"],
  },
  {
    id: "risk.engine",
    plane: "risk_intelligence",
    name: "Risk Engine",
    version: "0.1.0-alpha",
    status: "alpha",
    surface: "apps/risk-engine",
    dependsOn: ["pred.engine"],
  },
  {
    id: "exec.sim",
    plane: "execution_intelligence",
    name: "Execution Simulator",
    version: "0.1.0-alpha",
    status: "alpha",
    surface: "apps/execution-simulator",
    dependsOn: ["risk.engine"],
  },
  {
    id: "gov.rbac",
    plane: "governance_intelligence",
    name: "RBAC + audit",
    version: "0.1.0-alpha",
    status: "alpha",
    surface: "packages/governance-engine",
    dependsOn: ["cap.registry"],
  },
  {
    id: "ops.obs",
    plane: "operations_intelligence",
    name: "Observability",
    version: "0.1.0-alpha",
    status: "scaffold",
    surface: "packages/observability",
    dependsOn: [],
  },
  {
    id: "econ.pnl",
    plane: "economic_intelligence",
    name: "PnL / portfolio stubs",
    version: "0.1.0-alpha",
    status: "scaffold",
    surface: "packages/portfolio-engine",
    dependsOn: ["exec.sim"],
  },
  {
    id: "evo.controller",
    plane: "self_evolution_controller",
    name: "Self-Evolution Controller",
    version: "0.1.0-alpha",
    status: "scaffold",
    surface: "packages/meta-intelligence",
    dependsOn: ["ops.obs", "econ.pnl", "gov.rbac"],
    notes: "Propose-only — never auto-deploy",
  },
];

export class CapabilityRegistry {
  private readonly byId = new Map<string, CapabilityRecord>();

  constructor(seed: CapabilityRecord[] = DEFAULT_CAPABILITIES) {
    for (const c of seed) this.byId.set(c.id, c);
  }

  register(cap: CapabilityRecord): void {
    this.byId.set(cap.id, cap);
  }

  get(id: string): CapabilityRecord | undefined {
    return this.byId.get(id);
  }

  list(): CapabilityRecord[] {
    return [...this.byId.values()];
  }

  listByPlane(plane: MetaPlaneId): CapabilityRecord[] {
    return this.list().filter((c) => c.plane === plane);
  }

  tree(): Record<MetaPlaneId, CapabilityRecord[]> {
    const out = {} as Record<MetaPlaneId, CapabilityRecord[]>;
    for (const plane of META_PLANES) {
      out[plane] = this.listByPlane(plane);
    }
    return out;
  }
}

/** Propose-only evolution — Gate A honesty: no auto-apply. */
export class SelfEvolutionController {
  constructor(private readonly registry: CapabilityRegistry) {}

  proposeUpgrade(
    capabilityId: string,
    rationale: string,
    riskTier: EvolutionProposal["riskTier"] = "medium"
  ): EvolutionProposal {
    const cap = this.registry.get(capabilityId);
    if (!cap) {
      throw new Error(`unknown_capability: ${capabilityId}`);
    }
    return {
      id: `evo_${Date.now()}`,
      at: new Date().toISOString(),
      targetCapabilityId: capabilityId,
      rationale: `${rationale} (target=${cap.name}@${cap.version})`,
      riskTier,
      requiresApproval: true,
    };
  }
}

export function createMetaIntelligence() {
  const registry = new CapabilityRegistry();
  const evolution = new SelfEvolutionController(registry);
  const evidence = new EvidenceGraphEngine();
  return { registry, evolution, evidence, planes: META_PLANES };
}

export {
  EvidenceGraphEngine,
  type EvidenceKind,
  type EvidenceRecord,
  type Claim,
  type ClaimVerdict,
} from "./evidence-graph.js";
