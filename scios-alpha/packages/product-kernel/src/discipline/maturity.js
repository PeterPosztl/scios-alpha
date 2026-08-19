/**
 * Asset maturity lifecycle — Cursor must not promote on source existence alone.
 * ALPHA_NON_PRODUCTION
 */

export const MATURITY = {
  DRAFT: { evidence: ["design note or stub schema"] },
  EXPERIMENTAL: { evidence: ["code path exists", "labeled NON-PRODUCTION"] },
  ACTIVE: { evidence: ["wired runtime path", "HTTP or boot proof"] },
  TESTED: { evidence: ["automated or golden scenario executed"] },
  VALIDATED: { evidence: ["fresh diagnostics PASS", "SLO sample or golden scenario"] },
  PROMOTED: { evidence: ["release governor allow", "evaluation non-regression"] },
  DEPRECATED: { evidence: ["replacement named", "consumer migration note"] },
  RETIRED: { evidence: ["removed from boot/HTTP", "tombstone in registry"] },
};

export function buildAssetMaturityRegistry(kernelSnapshot = {}) {
  const caps = kernelSnapshot.capabilities?.capabilities || [];
  const assets = [
    {
      assetId: "capability.vertical-slice.foundation",
      kind: "Capability",
      maturity: "ACTIVE",
      evidence: ["POST /api/vertical-slice/run", "cockpit GW1"],
      mayPromote: false,
      reason: "Needs packaged GW1 VALIDATED evidence for PROMOTED",
    },
    {
      assetId: "workflow.gw1.market_prediction_analysis",
      kind: "Workflow",
      maturity: "ACTIVE",
      evidence: ["professional view", "approval card"],
      mayPromote: false,
    },
    {
      assetId: "model.baseline-logistic",
      kind: "Model",
      maturity: "EXPERIMENTAL",
      evidence: ["NON-PRODUCTION label", "no calibration READY"],
      mayPromote: false,
    },
    {
      assetId: "agent.foundation-smoke-worker",
      kind: "Agent",
      maturity: "EXPERIMENTAL",
      evidence: ["in-process heartbeat only"],
      mayPromote: false,
    },
    {
      assetId: "experience.gw1.compile",
      kind: "ExperienceTemplate",
      maturity: "ACTIVE",
      evidence: ["GET /v1/experience/compile"],
      mayPromote: false,
    },
    {
      assetId: "role.registry.200",
      kind: "RoleComposition",
      maturity: "EXPERIMENTAL",
      evidence: ["roles-seed.json count", "not 200 runtime-proven"],
      mayPromote: false,
    },
    {
      assetId: "integration.oidc",
      kind: "Integration",
      maturity: "DRAFT",
      evidence: ["AUTH_MODE=local-development"],
      mayPromote: false,
    },
    {
      assetId: "discipline.slo-registry",
      kind: "Capability",
      maturity: "EXPERIMENTAL",
      evidence: ["registry defined", "metrics UNKNOWN_UNTIL_MEASURED"],
      mayPromote: false,
    },
  ];

  for (const c of caps.slice(0, 40)) {
    const status = c.implementationStatus || "UNKNOWN";
    let maturity = "DRAFT";
    if (["IMPLEMENTED", "WORKING"].includes(status)) maturity = "ACTIVE";
    else if (["PARTIAL", "STUB"].includes(status)) maturity = "EXPERIMENTAL";
    else if (status === "MISSING") maturity = "DRAFT";
    assets.push({
      assetId: `capability.${c.capabilityId || c.id}`,
      kind: "Capability",
      maturity,
      evidence: [`CAPABILITY_REGISTRY:${status}`],
      mayPromote: false,
      note: "Promotion requires evidence artifacts — source existence insufficient",
    });
  }

  return {
    schema: "sci-os-asset-maturity-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    states: Object.keys(MATURITY),
    evidenceRequirements: MATURITY,
    promotionRule: "NO_PROMOTE_ON_SOURCE_EXISTENCE_ALONE",
    assets,
  };
}
