/**
 * Dual digital twin — Enterprise + SCI System — extends meta-recovery twin pattern.
 * Do not create a duplicate graph database.
 * ALPHA_NON_PRODUCTION
 */

export function buildDualDigitalTwin(opts = {}) {
  return {
    schema: "sci-os-dual-digital-twin/v1",
    label: "ALPHA_NON_PRODUCTION",
    extends: ["@scios/meta-recovery StartupDigitalTwin", "product-kernel registries"],
    enterpriseTwin: {
      purpose: "Business/intelligence reality",
      nodes: [
        "Entity",
        "Case",
        "Event",
        "Prediction",
        "RiskAssessment",
        "Decision",
        "Outcome",
        "Evidence",
      ],
      relationships: ["ABOUT", "GATES", "DECIDES", "EVIDENCES", "LINEAGE_OF"],
      workflows: ["gw1.market_prediction_analysis"],
      status: "PARTIAL",
      store: "data-fabric ontology + vertical-slice runs (local durable)",
    },
    sciSystemTwin: {
      purpose: "Platform self-model",
      nodes: [
        "Service",
        "Package",
        "Capability",
        "Model",
        "Agent",
        "Policy",
        "Dependency",
        "Health",
        "Release",
      ],
      relationships: ["depends_on", "provides", "binds_action"],
      status: "PARTIAL",
      store: "meta-recovery inventory + product-kernel capability graph + integrity engine",
      host: {
        slice: "WHI-011",
        pointer: "diagnostics-export/host/digital-twin.json",
        authority: "installer/scripts/host/digital-twin.cjs",
        processOwnership: "ProcessSupervisor",
        note: "View only — does not duplicate process truth",
      },
    },
    portsExpected: {
      controlPlane: opts.controlPlanePort || 3000,
      shell: opts.shellPort || 4000,
      recovery: 5299,
    },
    note: "No second graph system — twin is a view over existing registries/evidence",
  };
}
