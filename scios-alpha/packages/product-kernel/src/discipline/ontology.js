/**
 * Operational ontology map — OBJECT + RELATIONSHIP + ACTION
 * Extends Product Kernel object/action registries; no duplicate type system.
 * ALPHA_NON_PRODUCTION
 */

import { buildObjectRegistry, buildActionRegistry } from "../registries.js";

export function buildOperationalOntologyMap() {
  const objects = buildObjectRegistry();
  const actions = buildActionRegistry();
  return {
    schema: "sci-os-operational-ontology/v1",
    label: "ALPHA_NON_PRODUCTION",
    pattern: "OBJECT + RELATIONSHIP + ACTION",
    extends: ["sci-os-object-registry/v1", "sci-os-action-registry/v1", "data-fabric ontology"],
    objectFamilies: [
      {
        family: "Identity",
        types: ["Entity", "Person", "Organization", "Account", "Wallet", "Asset", "Device"],
      },
      {
        family: "Event",
        types: ["Event", "Alert", "Transaction"],
      },
      {
        family: "Casework",
        types: ["Case", "Incident", "Task", "Workflow", "Report"],
      },
      {
        family: "Intelligence",
        types: ["Prediction", "FeatureSet", "Model", "Scenario", "Simulation"],
      },
      {
        family: "Control",
        types: ["RiskAssessment", "Decision", "Policy", "Execution", "Outcome", "Evidence"],
      },
    ],
    relationships: [
      { type: "MENTIONS", from: "Event", to: "Entity" },
      { type: "ABOUT", from: "Case", to: "Entity" },
      { type: "PRODUCED", from: "Prediction", to: "FeatureSet" },
      { type: "GATES", from: "RiskAssessment", to: "Prediction" },
      { type: "DECIDES", from: "Decision", to: "RiskAssessment" },
      { type: "SIMULATES", from: "Execution", to: "Decision" },
      { type: "EVIDENCES", from: "Evidence", to: "Outcome" },
      { type: "LINEAGE_OF", from: "Evidence", to: "Prediction" },
    ],
    actions: (actions.actions || []).map((a) => ({
      actionId: a.actionId,
      governed: true,
      runtimePath: a.runtimePath || null,
      note: "UI should invoke Action contract, not raw internal service functions",
    })),
    objectTypeCount: (objects.types || []).length,
    gaps: [
      "Full enterprise writeback ontology ABSENT",
      "UI still partly calls product HTTP routes directly (acceptable adapter if ActionId stamped)",
    ],
    status: "PARTIAL",
  };
}
