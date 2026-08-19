/**
 * Lineage-based change impact analysis.
 * ALPHA_NON_PRODUCTION
 */

export function analyzeImpact(change) {
  const c = change || {
    changeId: "discipline-layer-2026-08-13",
    description: "Add enterprise operating discipline layer (SLO, actions, maturity, tower, eval)",
    protectedContractsTouched: [
      "sci-os-action-execution/v1 (new)",
      "SliceRunRequestSchema additive idempotencyKey",
      "product-kernel snapshot extensions",
    ],
  };

  return {
    schema: "sci-os-change-impact/v1",
    label: "ALPHA_NON_PRODUCTION",
    change: c,
    blastRadius: {
      dependentObjects: ["Action", "Evidence", "Workflow", "Capability"],
      packages: [
        "product-kernel",
        "vertical-slice",
        "data-fabric",
        "control-plane-api",
        "cockpit-ui",
      ],
      providers: ["in-process vertical-slice"],
      actions: ["analyze", "openLineage", "approval.*"],
      workflows: ["gw1.market_prediction_analysis"],
      policies: ["embedded-foundation/v1"],
      experiences: ["gw1 compile", "professional L1–L9"],
      roles: ["arch.market_analyst", "seeded roles (indirect)"],
      releaseGates: [
        "gap:zero",
        "enterprise:discipline",
        "package:prove-reboot (external)",
      ],
    },
    riskClass: "MEDIUM",
    requiresImpactArtifacts: true,
    noGoIfMissing: true,
  };
}
