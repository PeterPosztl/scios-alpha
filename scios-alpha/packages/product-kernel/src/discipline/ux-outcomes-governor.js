/**
 * Progressive disclosure UX audit + outcome metrics + dimensional readiness.
 * ALPHA_NON_PRODUCTION
 */

export const DISCLOSURE_LAYERS = [
  { id: "L1", name: "situation" },
  { id: "L2", name: "meaning" },
  { id: "L3", name: "recommendation" },
  { id: "L4", name: "uncertainty" },
  { id: "L5", name: "risk" },
  { id: "L6", name: "decision_action" },
  { id: "L7", name: "explanation" },
  { id: "L8", name: "evidence" },
  { id: "L9", name: "lineage_technical" },
];

export function auditProgressiveDisclosure(cockpitSource = "") {
  const has = (re) => re.test(cockpitSource);
  const surfaces = [
    {
      surface: "Home",
      prioritizes: ["attention", "next action"],
      layersPresent: has(/homeHeadline|What needs/) ? ["L1", "L6"] : [],
      status: has(/homeHeadline/) ? "PARTIAL" : "ABSENT",
    },
    {
      surface: "Entity360",
      prioritizes: ["situation"],
      layersPresent: has(/entEmpty|entities/) ? ["L1"] : [],
      status: "PARTIAL",
    },
    {
      surface: "Analysis_GW1",
      prioritizes: ["attention", "decision", "next action"],
      layersPresent: [
        has(/L1|What happened/) && "L1",
        has(/L2|Expected outcome|Meaning/) && "L2",
        has(/proCertain|uncertainty|Uncertainty/) && "L4",
        has(/L4|proRisk|What is the risk/) && "L5",
        has(/L5|proDecision|approval/) && "L6",
        has(/aiContext|approvalReason|explanation/) && "L7",
        has(/proEvidence|Evidence/) && "L8",
        has(/modeTech|lineage|Technical/) && "L9",
      ].filter(Boolean),
      status: has(/renderProfessional/) ? "PARTIAL" : "ABSENT",
      note: "Default professional mode; technical is deliberate",
    },
    {
      surface: "System",
      prioritizes: ["dimensional status"],
      layersPresent: ["L9"],
      status: "PARTIAL",
    },
  ];

  return {
    schema: "sci-os-progressive-disclosure-ux-audit/v1",
    label: "ALPHA_NON_PRODUCTION",
    layers: DISCLOSURE_LAYERS,
    defaultPriority: ["attention", "decision", "next_action"],
    surfaces,
    noFalseSimplicity: {
      bannedUniversalScores: ["single risk score as sole truth", "single READY flag"],
      dimensionalStatuses: [
        "BOOT_READY",
        "CORE_READY",
        "CAPABILITY_READY",
        "DATA_QUALITY",
        "SCIENTIFIC_MATURITY",
        "RISK_STATE",
        "POLICY_STATE",
        "UX_STATE",
      ],
    },
  };
}

export function buildWorkflowOutcomeMetrics() {
  return {
    schema: "sci-os-workflow-outcome-metrics/v1",
    label: "ALPHA_NON_PRODUCTION",
    principle: "Optimize professional work outcomes — not only CPU/API/test vanity",
    metrics: [
      { id: "timeToUnderstanding", unit: "seconds", current: "UNKNOWN_UNTIL_MEASURED" },
      { id: "timeToDecision", unit: "seconds", current: "UNKNOWN_UNTIL_MEASURED" },
      { id: "manualSteps", unit: "count", current: "UNKNOWN_UNTIL_MEASURED" },
      { id: "contextSwitches", unit: "count", current: "UNKNOWN_UNTIL_MEASURED" },
      { id: "evidenceCompleteness", unit: "ratio", current: "UNKNOWN_UNTIL_MEASURED" },
      { id: "decisionReversalRate", unit: "ratio", current: "UNKNOWN_UNTIL_MEASURED" },
      { id: "falseEscalations", unit: "count", current: "UNKNOWN_UNTIL_MEASURED" },
      { id: "successfulWorkflowCompletion", unit: "ratio", current: "UNKNOWN_UNTIL_MEASURED" },
      { id: "recoveryTime", unit: "seconds", current: "UNKNOWN_UNTIL_MEASURED" },
    ],
    workflowId: "gw1.market_prediction_analysis",
  };
}

export function buildReleaseGovernor(input = {}) {
  const p0 = input.knownP0StructuralGaps ?? null;
  const p1 = input.knownP1ProductGaps ?? null;
  const budgetsExhausted = !!input.anyExhausted;
  const evalRegressions = input.evalRegressions ?? 0;
  const deadEnds = input.primaryDeadEnds ?? 0;
  const disconnected = input.disconnectedMandatory ?? 0;
  const evidenceFresh = input.evidenceFresh !== false;
  const externalValidationOpen = input.externalValidationOpen ?? 1;

  const blockExpansion =
    budgetsExhausted ||
    (p0 != null && p0 > 0) ||
    (p1 != null && p1 > 0) ||
    evalRegressions > 0 ||
    deadEnds > 0 ||
    disconnected > 0;

  let verdict = "ALLOW_CAUTIOUS_EXPANSION";
  if (blockExpansion) verdict = "PRIORITIZE_CLOSURE";
  if (externalValidationOpen > 0 && !blockExpansion) {
    verdict = "ALLOW_INTERNAL_ONLY_EXTERNAL_VALIDATION_PENDING";
  }

  return {
    schema: "sci-os-release-governor/v1",
    label: "ALPHA_NON_PRODUCTION",
    inputs: {
      reliabilityStatus: input.reliabilityStatus || "UNKNOWN_UNTIL_MEASURED",
      knownP0StructuralGaps: p0,
      knownP1ProductGaps: p1,
      sloErrorBudgetsExhausted: budgetsExhausted,
      evaluationRegressions: evalRegressions,
      uxDeadEnds: deadEnds,
      disconnectedMandatoryCapabilities: disconnected,
      evidenceFreshnessOk: evidenceFresh,
      technicalDebtNotes: input.technicalDebtNotes || [
        "monolithic shell",
        "enterprise PG lineage P2",
        "packaged GW1 external validation",
      ],
      externalValidationOpen,
    },
    policy:
      "If structural/reliability debt exceeds policy, prioritize closure before expansion",
    verdict,
    blockUnrelatedFeatureExpansion: blockExpansion,
  };
}
