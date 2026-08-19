/**
 * UX Kernel contract — normalize Shell foundation (extend cockpit, don't fork).
 * ALPHA_NON_PRODUCTION
 */

export function buildUxKernelInventory(cockpitSource = "") {
  const has = (re) => re.test(cockpitSource);
  return {
    schema: "sci-os-ux-kernel/v1",
    label: "ALPHA_NON_PRODUCTION",
    architecture: "MONOLITHIC_SHELL_EXTENDING_TOWARD_KERNEL",
    foundation: {
      designTokens: has(/--snow|--navy|--sci-/),
      componentPrimitives: has(/pro-card|approval-card|cmdk/),
      applicationShell: has(/nav\.primary|brand/),
      workspaceManager: has(/showView|classList\.toggle\("on"/),
      objectRenderers: has(/openEntity|Entity360|entities/),
      actionRenderers: has(/data-action-id|data-act=/),
      evidenceRenderers: has(/lineagePre|proEvidence/),
      aiContextRenderers: has(/aiContextPanel/),
      experienceRenderer: has(/compiledWorkspace|experience\/compile/),
      trustCapsule: has(/trustCapsule|Trust capsule|trust-capsule/i),
    },
    professionalHierarchy: [
      "ATTENTION",
      "UNDERSTANDING",
      "UNCERTAINTY",
      "RISK",
      "DECISION",
      "ACTION",
      "EVIDENCE",
    ],
    rawJsonPolicy: "Technical View only",
    goldenFlow: [
      "HOME",
      "SEARCH",
      "ENTITY360",
      "ANALYSIS",
      "UNCERTAINTY",
      "RISK",
      "GOVERNANCE",
      "DECISION",
      "SIMULATION_ACTION",
      "EVIDENCE",
      "LINEAGE",
    ],
    goldenFlowPresent: {
      HOME: has(/id="home"|loadHome/),
      SEARCH: has(/globalSearch|doSearch|\/v1\/search/),
      ENTITY360: has(/openEntity|entities/),
      ANALYSIS: has(/vertical-slice\/run|id="slice"/),
      UNCERTAINTY: has(/proCertain|uncertainty|abstain/i),
      RISK: has(/proRisk|riskDecision/),
      GOVERNANCE: has(/governance|proDecision|approval/),
      DECISION: has(/approvalCard|proDecision/),
      SIMULATION_ACTION: has(/proExec|SIMULATION/),
      EVIDENCE: has(/proEvidence|lineagePre/),
      LINEAGE: has(/lineage|Full Lineage/),
    },
  };
}

export function auditGoldenUxFlow(uxKernel) {
  const g = uxKernel.goldenFlowPresent || {};
  const missing = Object.entries(g)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  return {
    schema: "sci-os-golden-ux-flow-audit/v1",
    pass: missing.length === 0,
    missing,
    present: Object.entries(g)
      .filter(([, v]) => v)
      .map(([k]) => k),
    deadControlsTarget: 0,
    note: "Structural presence in Shell source — runtime E2E still requires live prove",
  };
}
