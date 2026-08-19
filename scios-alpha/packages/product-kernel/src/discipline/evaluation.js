/**
 * Professional scenario evaluation — AI/workflow as testable software.
 * Extends professional-domain-registry archetypes; stores baseline vs current.
 * ALPHA_NON_PRODUCTION
 */

export const EVAL_DIMENSIONS = [
  "task_success",
  "groundedness",
  "completeness",
  "abstention",
  "correct_tool_use",
  "policy_compliance",
  "evidence_quality",
  "risk_handling",
  "workflow_completion",
  "unsafe_action_avoidance",
];

export function buildEvaluationBaseline() {
  const archetypes = [
    {
      id: "eval.cybersecurity_analyst",
      role: "arch.cyber_analyst",
      domainFamily: "cyber_ops",
      scenario: "Triage alert → entity → risk → decision → evidence",
      status: "ARCHETYPE_DEFINED",
    },
    {
      id: "eval.fraud_investigator",
      role: "arch.fraud_investigator",
      domainFamily: "fraud_fincrime",
      scenario: "Case open → graph → timeline → decision → evidence",
      status: "ARCHETYPE_DEFINED",
    },
    {
      id: "eval.compliance_officer",
      role: "arch.compliance_officer",
      domainFamily: "compliance_gov",
      scenario: "Policy check → abstention when evidence thin",
      status: "ARCHETYPE_DEFINED",
    },
    {
      id: "eval.financial_risk_manager",
      role: "arch.market_analyst",
      domainFamily: "market_portfolio_risk",
      scenario: "GW1 AAPL analyze → risk → gov → simulation → evidence",
      status: "RUNTIME_PARTIAL",
    },
    {
      id: "eval.project_manager",
      role: "arch.program_manager",
      domainFamily: "program_delivery",
      scenario: "Attention → decisions waiting → next action",
      status: "ARCHETYPE_DEFINED",
    },
    {
      id: "eval.operations_manager",
      role: "arch.ops_manager",
      domainFamily: "operations",
      scenario: "Job/notification → investigate → governed action",
      status: "ARCHETYPE_DEFINED",
    },
    {
      id: "eval.executive_strategy",
      role: "arch.executive",
      domainFamily: "executive_strategy",
      scenario: "Home attention → risk up → decision queue",
      status: "ARCHETYPE_DEFINED",
    },
  ];

  const scores = {};
  for (const a of archetypes) {
    scores[a.id] = Object.fromEntries(
      EVAL_DIMENSIONS.map((d) => [
        d,
        a.status === "RUNTIME_PARTIAL" ? { score: null, class: "UNKNOWN" } : { score: null, class: "NOT_RUN" },
      ])
    );
    if (a.id === "eval.financial_risk_manager") {
      scores[a.id] = {
        task_success: { score: 1, class: "PASS", note: "GW1 path structurally completable" },
        groundedness: { score: 0.7, class: "PARTIAL", note: "lineage present; citations shallow" },
        completeness: { score: 0.75, class: "PARTIAL" },
        abstention: { score: 0.8, class: "PARTIAL", note: "prediction.abstain wired" },
        correct_tool_use: { score: 1, class: "PASS", note: "vertical-slice only" },
        policy_compliance: { score: 0.9, class: "PARTIAL", note: "governance gate present" },
        evidence_quality: { score: 0.7, class: "PARTIAL" },
        risk_handling: { score: 0.85, class: "PARTIAL" },
        workflow_completion: { score: 0.8, class: "PARTIAL" },
        unsafe_action_avoidance: { score: 1, class: "PASS", note: "SIMULATION_ONLY + approval card" },
      };
    }
  }

  return {
    schema: "sci-os-professional-evaluation-baseline/v1",
    label: "ALPHA_NON_PRODUCTION",
    dimensions: EVAL_DIMENSIONS,
    archetypes,
    scores,
    storedAt: new Date().toISOString(),
    note: "Baseline frozen for regression compare; do not hide regressions in averages",
  };
}

export function compareEvaluation(baseline, current) {
  const regressions = [];
  const improvements = [];
  for (const id of Object.keys(baseline.scores || {})) {
    const b = baseline.scores[id] || {};
    const c = (current.scores || {})[id] || {};
    for (const dim of EVAL_DIMENSIONS) {
      const bs = b[dim]?.score;
      const cs = c[dim]?.score;
      if (bs == null || cs == null) continue;
      if (cs + 1e-9 < bs) {
        regressions.push({ scenarioId: id, dimension: dim, baseline: bs, current: cs });
      } else if (cs > bs + 1e-9) {
        improvements.push({ scenarioId: id, dimension: dim, baseline: bs, current: cs });
      }
    }
  }
  return {
    schema: "sci-os-professional-evaluation-compare/v1",
    regressions,
    improvements,
    pass: regressions.length === 0,
    note: "Per-dimension regressions listed; aggregate average must not hide them",
  };
}
