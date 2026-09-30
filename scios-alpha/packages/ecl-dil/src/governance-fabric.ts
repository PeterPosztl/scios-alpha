/**
 * SAFE inspect of requested GOVERNANCE FABRIC (5×200 = 1000 tasks).
 * Requested: src/governance-fabric.ts + npx tsx, depends on sci-os-x10 / domain / kg /
 * scenario / causal fabrics, live rules, HITL auto, audit INSERT, override, domain desks.
 * Actual: HITL is POST /v1/ai/proposals/:id/review. autoDecide=false.
 * GOVERNANCE > AGENT. No second file/boot. ALPHA_NON_PRODUCTION.
 */
export type GovernanceFabricResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type GovernanceFabricCheck = {
  id: string;
  requested: string;
  result: GovernanceFabricResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
  autoDecide: false;
};

function chk(
  id: string,
  requested: string,
  result: GovernanceFabricResult,
  evidence: string,
  note: string
): GovernanceFabricCheck {
  return {
    id,
    requested,
    result,
    evidence,
    note,
    autoTrade: false,
    ready: false,
    applied: false,
    autoDecide: false,
  };
}

export const GOVERNANCE_FABRIC_HOOKS = {
  schema: "sci-os-governance-fabric/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoDecide: false as const,
  persisted: false as const,
  parallelTree: false as const,
  analogApi: "POST /v1/ai/proposals/:id/review" as const,
  note: "Governance-fabric 1–1000 inspect. No src/governance-fabric.ts. HITL remains AGENT→PROPOSAL→HUMAN→DECISION. Not READY.",
};

export function inspectGovernanceFabricPath() {
  return [
    chk("GF.path", "src/governance-fabric.ts 1000-task file", "REFUSED", "massStub=true parallelOS=true", "Compose into ecl-dil analog. Do not add a second product file."),
    chk("GF.deps", "depends on sci-os-x10 + domain + kg + scenario + causal", "REFUSED", "megaFiles=0", "Those files were refused. Do not invent a dependency graph."),
    chk("GF.npxTsx", "npx tsx src/governance-fabric.ts", "REFUSED", "secondBoot=true packageManager=pnpm", "Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("GF.entry", "new GovernanceFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "One AppHost. Governance is HITL review, not a fabric constructor."),
  ];
}

export function inspectGovernanceRules() {
  return [
    chk("GF1_200.liveRulesInsert", "governance_rules INSERT via Pool", "PREPARED_DISABLED", "GET /v1/ecl/audit persisted=false", "Session analog. Not applied SQL."),
    chk("GF1_200.enforceBlock", "enforcement freeze|block as order", "REFUSED", "autoLimits=false freeze=false", "Advisory FAIL is not freeze."),
    chk("GF1_200.autoApproveConf", "approved=confidence>=0.7", "REFUSED", "autoDecide=false", "GOVERNANCE > AGENT. Do not auto-approve."),
  ];
}

export function inspectGovernanceHitl() {
  return [
    chk("GF201_400.hitlLoop", "HITL engine auto-decide", "REFUSED", "autoDecide=false", "Human remains decision maker."),
    chk("GF201_400.proposalReview", "POST /v1/ai/proposals/:id/review", "ANALOG_CONTRACT", "real HITL mutation only here", "AGENT → PROPOSAL → HUMAN → DECISION."),
    chk("GF201_400.digitalContract", "DIGITAL_CONTRACT HITL stamp", "REFUSED", "hitlMode=ANALOG_CONTRACT", "Do not flip to DIGITAL_CONTRACT."),
  ];
}

export function inspectGovernanceAuditOverride() {
  return [
    chk("GF401_600.auditInsert", "governance_audit INSERT hash-chain", "ANALOG_CONTRACT", "GET /v1/ecl/audit persisted=false", "In-memory session audit."),
    chk("GF401_600.riskScoreZero", "riskScore ?? 0", "REFUSED", "missing=UNKNOWN", "Missing riskScore is UNKNOWN, never 0."),
    chk("GF601_800.overrideAuto", "override without human review", "REFUSED", "autoDecide=false", "Override is a proposal, not an order."),
    chk("GF601_800.overrideReady", "override stamps READY", "REFUSED", "ready=false", "No evidence ⇒ UNKNOWN, never PASS."),
  ];
}

export function inspectGovernanceDomain() {
  return [
    chk("GF801_1000.hospitalityGov", "hospitality governance desk live", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent occupancy policy."),
    chk("GF801_1000.healthcareGov", "healthcare governance / PHI rules live", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Do not invent clinical policy."),
    chk("GF801_1000.healthTrue", "healthCheck COUNT healthy=true", "REFUSED", "noEvidence=UNKNOWN", "A count is not governance health."),
    chk("GF801_1000.mainRequire", "require.main === module GovernanceFabric.main", "REFUSED", "secondBoot=true", "Canonical boot is start-sci-os."),
  ];
}

export function inspectGovernanceFabricBoot() {
  return [
    chk("GF7.postgresCtor", "new GovernanceFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "Do not require Pool at boot."),
    chk("GF7.installDefaults", "installDefaults 7 domain packs", "REFUSED", "liveDesks=0 catalogs=ABSENT", "Do not stamp hospitality/healthcare policy as installed."),
    chk("GF7.functionEval", "RuleEvaluator new Function(condition)", "REFUSED", "eval=true autoDecide=false", "Do not eval rule strings as orders."),
    chk("GF7.invented1e6", "Max exposure > 1000000 block", "REFUSED", "invented=1e6 book=25000", "Use RiskBucket maxExposure 25000."),
    chk("GF7.dailyLossPct05", "dailyLossPct > 0.05 block", "REFUSED", "invented=5pct GuardrailLimits.maxDailyLoss=2500", "Absolute daily loss, not invented 5%."),
    chk("GF7.leverage15", "leverage > 1.5 block", "REFUSED", "bookLeverage=2", "Do not invent 1.5 vs RiskBucket 2."),
    chk("GF7.strictReadyBlock", "!strictReady block", "REFUSED", "ready=false", "Missing READY is UNKNOWN, not an auto-block order."),
    chk("GF7.hitlInMemoryApprove", "HitlHumanReview.approve majority auto", "REFUSED", "autoDecide=false", "Real HITL is POST /v1/ai/proposals/:id/review."),
    chk("GF7.sqlInterval", "HITL/audit INTERVAL string interpolation", "REFUSED", "sqlInjection=true", "Do not interpolate SQL."),
    chk("GF7.auditPrevOnly", "integrity valid=true from prev_hash only", "REFUSED", "noHashRecompute", "Unrecomputed hashes are UNKNOWN."),
    chk("GF7.auditDelete", "retention DELETE FROM governance_audit", "REFUSED", "append-only", "Do not delete audit history."),
    chk("GF7.autoApproveFreeze", "OverrideAutoApprovalPolicy freeze <=15m auto", "REFUSED", "autoDecide=false freeze=false", "Freeze is not auto-approved."),
    chk("GF7.overrideApproveCeo", "override.approver.approve ceo", "REFUSED", "autoDecide=false", "A writer.approve is not HITL review."),
    chk("GF7.hashVerifierTrue", "hashVerifier valid=true without recompute", "REFUSED", "noEvidence=UNKNOWN", "Row exists ≠ integrity."),
    chk("GF7.bulkInstallAll", "domain.bulkInstaller.installAll", "REFUSED", "liveDesks=0", "Do not persist 7 domain rule packs."),
    chk("GF7.healthCountTrue", "healthCheck COUNT healthy=true", "REFUSED", "noEvidence=UNKNOWN", "A count is not governance health."),
    chk("GF7.mainWrites", "main() write block rule + HITL approve + freeze override", "REFUSED", "executed=false freeze=false", "Do not persist freeze as an order."),
    chk("GF7.hospitalityHitlFalse", "DomainConfigLibrary.hospitality hitlRequired=false", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent hospitality policy, even as warn-only."),
    chk("GF7.cyberEval", "domain.policyEvaluator.evaluate('cyber')", "ANALOG_CONTRACT", "GET /v1/ecl/engine/limit-eval advisory", "Cyber analog only. MFA/threatLevel are not live SIEM."),
  ];
}

export function buildGovernanceFabricWave() {
  const path = inspectGovernanceFabricPath();
  const rules = inspectGovernanceRules();
  const hitl = inspectGovernanceHitl();
  const auditOverride = inspectGovernanceAuditOverride();
  const domain = inspectGovernanceDomain();
  const boot = inspectGovernanceFabricBoot();
  const checks = [...path, ...rules, ...hitl, ...auditOverride, ...domain, ...boot];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...GOVERNANCE_FABRIC_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 1000,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      autoApprovals: 0,
      liveDesks: 0,
      applied: 0,
      megaFiles: 0,
    },
    path,
    rules,
    hitl,
    auditOverride,
    domain,
    boot,
    checks,
  };
}
