/**
 * SAFE inspect of requested SECURITY FABRIC (5×200 = 1000 tasks).
 * Requested: src/security-fabric.ts + npx tsx, depends on pg + prior fabrics,
 * live sandbox isolation, policy eval/block, audit INSERT, domain desks,
 * governance auto-decide.
 * Actual analog: POST /v1/ai/proposals/:id/review + GET /v1/ecl/audit.
 * autoDecide=false. GOVERNANCE > AGENT. ALPHA_NON_PRODUCTION.
 */
export type SecurityFabricResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type SecurityFabricCheck = {
  id: string;
  requested: string;
  result: SecurityFabricResult;
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
  result: SecurityFabricResult,
  evidence: string,
  note: string
): SecurityFabricCheck {
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

export const SECURITY_FABRIC_HOOKS = {
  schema: "sci-os-security-fabric/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoDecide: false as const,
  persisted: false as const,
  parallelTree: false as const,
  analogApi: "POST /v1/ai/proposals/:id/review" as const,
  note: "Security-fabric 1–1000 inspect. No src/security-fabric.ts. HITL remains AGENT→PROPOSAL→HUMAN→DECISION. Not READY.",
};

export function inspectSecurityFabricPath() {
  return [
    chk("XF.path", "src/security-fabric.ts 1000-task file", "REFUSED", "massStub=true parallelOS=true", "Compose into ecl-dil analog. Do not add a second product file."),
    chk("XF.deps", "depends on pg + SCI OS ×10 fabrics", "REFUSED", "megaFiles=0 pgDriver=ABSENT", "Those files were refused. Do not require Pool at boot."),
    chk("XF.npxTsx", "npx tsx src/security-fabric.ts", "REFUSED", "secondBoot=true packageManager=pnpm", "Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("XF.entry", "new SecurityFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "One AppHost. Security is HITL + session audit, not a fabric constructor."),
    chk("XF.sciOsX10Tree", "sci-os-x10/{src,package.json,tsconfig,.env}", "REFUSED", "parallelTree=false oneProduct=scios-alpha", "Do not add a second package tree."),
    chk("XF.envFile", "cat > .env PG_PASSWORD=secret", "REFUSED", "secretInSource=true", "Do not ship default DB secrets. OPTIONAL_INFRA_DEGRADED without DATABASE_URL."),
  ];
}

export function inspectSecuritySandbox() {
  return [
    chk("XF1_200.sandboxIsolate", "live VM/sandbox isolation engine", "REFUSED", "noEvidence=UNKNOWN", "A class named Sandbox is not isolation."),
    chk("XF1_200.functionEval", "sandbox eval / new Function(policy)", "REFUSED", "eval=true autoDecide=false", "Do not eval policy strings as orders."),
    chk("XF1_200.autoBlock", "sandbox deny/freeze as order", "REFUSED", "autoLimits=false freeze=false", "Advisory FAIL is not freeze."),
    chk("XF1_200.runningOnCreate", "instanceManager.create status='running'", "REFUSED", "noEvidence=UNKNOWN", "A Map insert is not a container/VM."),
    chk("XF1_200.healthcarePhiSandbox", "SandboxLibrary.healthcarePHI isolation=container", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Do not invent a PHI sandbox."),
  ];
}

export function inspectSecurityPolicy() {
  return [
    chk("XF201_400.policyInsert", "security_policy INSERT via Pool", "PREPARED_DISABLED", "GET /v1/ecl/engine/limit-eval advisory", "Session analog. Not applied SQL."),
    chk("XF201_400.policyEval", "policy evaluator new Function / always-allow", "REFUSED", "eval=true autoDecide=false", "Do not auto-allow or auto-block from invented rules."),
    chk("XF201_400.mfaBlock", "MFA/encryption rules as live SIEM", "REFUSED", "liveSiem=false", "Cyber analog only. Not a live control plane."),
    chk("XF201_400.adminAllAllow", "PolicyLibrary.defaultRBAC admin-all allow *", "REFUSED", "autoDecide=false", "Wildcard admin-all is not RBAC evidence."),
    chk("XF201_400.regexCond", "PolicyCondition operator=regex new RegExp", "REFUSED", "eval=true", "Do not compile untrusted regex as policy."),
  ];
}

export function inspectSecurityAudit() {
  return [
    chk("XF401_600.auditInsert", "security_audit INSERT hash-chain", "ANALOG_CONTRACT", "GET /v1/ecl/audit persisted=false", "In-memory session audit."),
    chk("XF401_600.hashTrue", "integrity valid=true without recompute", "REFUSED", "noEvidence=UNKNOWN", "Row exists ≠ integrity."),
    chk("XF401_600.auditDelete", "retention DELETE FROM security_audit", "REFUSED", "append-only", "Do not delete audit history."),
    chk("XF401_600.sqlInterval", "SecurityAuditSummary INTERVAL string interpolation", "REFUSED", "sqlInjection=true", "Do not interpolate SQL."),
  ];
}

export function inspectSecurityDomainGov() {
  return [
    chk("XF601_800.hospitalitySec", "hospitality security desk live", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent occupancy/PII policy."),
    chk("XF601_800.healthcarePhi", "healthcare PHI/HIPAA rules live", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Do not invent clinical policy."),
    chk("XF801_1000.autoApprove", "governance auto-approve / DIGITAL_CONTRACT", "REFUSED", "autoDecide=false hitlMode=ANALOG_CONTRACT", "GOVERNANCE > AGENT. Human remains decision maker."),
    chk("XF801_1000.proposalReview", "POST /v1/ai/proposals/:id/review", "ANALOG_CONTRACT", "real HITL mutation only here", "AGENT → PROPOSAL → HUMAN → DECISION."),
    chk("XF801_1000.enforceBlock", "governance.enforce block/freeze", "REFUSED", "autoLimits=false freeze=false", "Enforce is a proposal, not an order."),
    chk("XF801_1000.mainRequire", "require.main === module SecurityFabric.main", "REFUSED", "secondBoot=true", "Canonical boot is start-sci-os."),
    chk("XF801_1000.missingCheckerPass", "ComplianceEngine missing checker → passed:true", "REFUSED", "noEvidence=UNKNOWN", "Missing check is UNKNOWN, never PASS."),
    chk("XF801_1000.accessReviewApprove", "AccessReviewManager.approve without HITL POST", "REFUSED", "autoDecide=false", "Real HITL is POST /v1/ai/proposals/:id/review."),
  ];
}

export function inspectSecurityFabricBoot() {
  return [
    chk("XF7.postgresCtor", "new SecurityFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "Do not require Pool at boot."),
    chk("XF7.initialize", "initialize() runAll migrations", "PREPARED_DISABLED", "GET /v1/ecl/audit", "Session analog. Not applied SQL."),
    chk("XF7.sandboxRun", "sandbox.run / isolate untrusted code", "REFUSED", "noEvidence=UNKNOWN", "Do not claim isolation without a measured boundary."),
    chk("XF7.policyEvaluate", "policy.evaluator.evaluate as order", "REFUSED", "autoDecide=false", "Limit-eval analog is advisory."),
    chk("XF7.auditWrite", "audit.writer.write hash-chain", "ANALOG_CONTRACT", "GET /v1/ecl/audit persisted=false", "In-memory session audit."),
    chk("XF7.domainInstall", "domain bulk-install 7 security packs", "REFUSED", "liveDesks=0 catalogs=ABSENT", "Do not stamp hospitality/healthcare policy."),
    chk("XF7.govEnforce", "governance.enforce / auto-approve", "REFUSED", "autoDecide=false", "Real HITL is POST /v1/ai/proposals/:id/review."),
    chk("XF7.healthCountTrue", "healthCheck COUNT healthy=true", "REFUSED", "noEvidence=UNKNOWN", "A count is not security health."),
    chk("XF7.pgPasswordSecret", "PG_PASSWORD ?? 'secret'", "REFUSED", "secretInSource=true", "Do not ship default secrets."),
    chk("XF7.mainWrites", "main() sandbox + policy block + HITL auto + process.exit", "REFUSED", "secondBoot=true executed=false", "Do not run a demo as product boot."),
    chk("XF7.healthcarePhi", "sandbox.library.healthcarePHI()", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Do not invent clinical isolation."),
    chk("XF7.adminAllWrite", "policy.writer.write admin-all allow *", "REFUSED", "autoDecide=false", "Do not persist wildcard allow as an order."),
    chk("XF7.rbacAssignAdmin", "rbac.assignRole('user-1','admin')", "REFUSED", "AUTH_MODE=local-development", "In-memory role assign is not identity."),
    chk("XF7.integrityPrevOnly", "audit.integrity.verify prev_hash only", "REFUSED", "noHashRecompute", "Unrecomputed hashes are UNKNOWN."),
    chk("XF7.phiRedact", "phiSandbox.redact name/ssn keys", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Key-name matching is not a PHI program."),
    chk("XF7.inMemoryKms", "domain.keyManager / kms.generate in-memory AES", "REFUSED", "noEvidence=UNKNOWN", "A Map of Buffers is not KMS."),
    chk("XF7.missingCheckerPass", "ComplianceEngine checker missing → passed:true", "REFUSED", "noEvidence=UNKNOWN", "No evidence ⇒ UNKNOWN, never PASS."),
    chk("XF7.soc2EvidenceStamp", "SecurityComplianceChecker.check('SOC2', evidence)", "REFUSED", "noEvidence=UNKNOWN", "A boolean bag is not SOC2."),
    chk("XF7.seedInitialize", "initialize() seed RBAC + governance rules", "REFUSED", "applied=false liveDesks=0", "Do not stamp 7-domain isolation as installed."),
  ];
}

export function buildSecurityFabricWave() {
  const path = inspectSecurityFabricPath();
  const sandbox = inspectSecuritySandbox();
  const policy = inspectSecurityPolicy();
  const audit = inspectSecurityAudit();
  const domainGov = inspectSecurityDomainGov();
  const boot = inspectSecurityFabricBoot();
  const checks = [...path, ...sandbox, ...policy, ...audit, ...domainGov, ...boot];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...SECURITY_FABRIC_HOOKS,
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
    sandbox,
    policy,
    audit,
    domainGov,
    boot,
    checks,
  };
}
