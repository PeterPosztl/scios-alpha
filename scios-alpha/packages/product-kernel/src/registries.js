/**
 * Object / Action / Workflow registries — connect existing capabilities; no parallel OS.
 * ALPHA_NON_PRODUCTION
 */

export function buildObjectRegistry() {
  return {
    schema: "sci-os-object-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    types: [
      "Entity",
      "Person",
      "Organization",
      "Account",
      "Wallet",
      "Transaction",
      "Asset",
      "Device",
      "IP",
      "Domain",
      "Event",
      "Alert",
      "Case",
      "Incident",
      "Prediction",
      "FeatureSet",
      "RiskAssessment",
      "Decision",
      "Execution",
      "Outcome",
      "Evidence",
      "Policy",
      "Model",
      "Scenario",
      "Simulation",
      "Task",
      "Workflow",
      "Report",
      "Service",
    ],
    note: "Canonical types; instances via identity.createObjectShell",
  };
}

export function buildActionRegistry() {
  return {
    schema: "sci-os-action-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    actions: [
      {
        actionId: "analyze",
        handler: "product-kernel.action.analyze",
        requires: ["vertical-slice.foundation"],
        maturity: "L6",
        runtimePath: "POST /api/vertical-slice/run",
      },
      {
        actionId: "openLineage",
        handler: "product-kernel.action.openLineage",
        requires: ["vertical-slice.foundation"],
        maturity: "L6",
        runtimePath: "GET /v1/lineage/:runId",
      },
      {
        actionId: "toggleTechnicalView",
        handler: "product-kernel.action.toggleTechnicalView",
        requires: ["cockpit.professional-view"],
        maturity: "L5",
        runtimePath: "cockpit-ui mode toggle",
      },
      {
        actionId: "search",
        handler: "product-kernel.action.search",
        requires: ["control-plane-api"],
        maturity: "L4",
        runtimePath: "GET /v1/search",
      },
      {
        actionId: "openEntity",
        handler: "product-kernel.action.openEntity",
        requires: ["control-plane-api"],
        maturity: "L4",
        runtimePath: "GET /v1/entities/:id",
      },
      {
        actionId: "explain",
        handler: "product-kernel.action.explain",
        maturity: "L3",
        note: "Uses governance/risk explanation fields from slice",
      },
      {
        actionId: "runScenario",
        handler: "product-kernel.action.runScenario",
        maturity: "L3",
        note: "Maps to simulation-only vertical slice re-run",
      },
    ],
  };
}

export function buildWorkflowRegistry() {
  return {
    schema: "sci-os-workflow-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    workflows: [
      {
        workflowId: "gw1.market_prediction_analysis",
        name: "Market / Prediction Analysis (AAPL)",
        role: "arch.market_analyst",
        status: "PARTIAL",
        requiredCapabilities: [
          "vertical-slice.foundation",
          "control-plane-api",
          "cockpit.professional-view",
        ],
        note: "Home → Search → Entity360 → Analyze → Professional Result",
        maturityTarget: "L7",
      },
      {
        workflowId: "gw2.fraud_investigation",
        name: "Fraud Investigation",
        status: "MISSING",
        requiredCapabilities: [],
      },
      {
        workflowId: "gw3.cyber_incident",
        name: "Cyber Incident Investigation",
        status: "MISSING",
        requiredCapabilities: [],
      },
      {
        workflowId: "gw4.entity_intelligence",
        name: "Entity Intelligence",
        status: "PARTIAL",
        requiredCapabilities: ["control-plane-api"],
        note: "Entity360 shell + search; deep graph ABSENT",
      },
      {
        workflowId: "gw5.risk_evaluation",
        name: "Risk Evaluation",
        status: "PARTIAL",
        requiredCapabilities: ["vertical-slice.foundation"],
      },
      {
        workflowId: "gw6.governance_approval",
        name: "Governance Approval",
        status: "PARTIAL",
        requiredCapabilities: ["vertical-slice.foundation"],
      },
      {
        workflowId: "gw7.incident_recovery",
        name: "SCI OS Incident / Recovery",
        status: "PARTIAL",
        requiredCapabilities: ["scaffold.workspace"],
        note: "meta-recovery present; clean-install packaging incomplete",
      },
    ],
  };
}
