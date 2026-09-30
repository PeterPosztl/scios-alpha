/**
 * Opportunity scoring + adoption gates.
 * Research ≠ production promotion.
 */

export function scoreOpportunity(o) {
  const w = {
    professionalValue: 3,
    uxValue: 2,
    technicalValue: 1,
    scientificValue: 1,
    reliabilityValue: 2,
    securityValue: 2,
    implementationCost: -2,
    dependencyCost: -2,
    risk: -2,
  };
  let score = 0;
  for (const [k, weight] of Object.entries(w)) {
    score += (Number(o[k]) || 0) * weight;
  }
  return score;
}

export function evaluateGates(candidate) {
  const gates = {
    sourceVerified: !!candidate.sourceTier && candidate.sourceTier !== "T5",
    mapsToSciGap: !!candidate.sciGap,
    legalCheck: candidate.licenseKnown !== false,
    securityCheck: candidate.securityRisk !== "HIGH",
    architectureFit: !!candidate.adapter || candidate.decision === "INSPIRE" || candidate.decision === "BUILD",
    sandboxRequired: ["USE", "ADAPT"].includes(candidate.decision),
  };
  const pass = Object.values(gates).every(Boolean) || candidate.decision === "SKIP" || candidate.decision === "INSPIRE";
  return { gates, pass };
}

export function rankOpportunities(items) {
  return [...items]
    .map((o) => ({ ...o, opportunityScore: scoreOpportunity(o) }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

/** What NOT to import */
export const rejectionCatalog = [
  {
    id: "rej.pixel_copy",
    idea: "Pixel-perfect competitor screens",
    reason: "IP + trademark + brittle UX",
  },
  {
    id: "rej.dashboard_per_role",
    idea: "200 role-specific dashboards",
    reason: "Fragments OS; use Experience Compiler",
  },
  {
    id: "rej.kafka_default",
    idea: "Kafka / mesh by default",
    reason: "Overengineering vs foundation needs",
  },
  {
    id: "rej.chatbot_os",
    idea: "Chatbot as primary shell",
    reason: "Breaks evidence/governance/risk chain",
  },
  {
    id: "rej.fake_confidence",
    idea: "Single green confidence badge",
    reason: "Mixes calibration, risk, data quality, health",
  },
  {
    id: "rej.uncontrolled_plugins",
    idea: "Open plugin marketplace without capability declarations",
    reason: "Security + evidence bypass risk",
  },
  {
    id: "rej.oss_museum",
    idea: "Install every GitHub star",
    reason: "Dependency museum; no verified gap",
  },
];
