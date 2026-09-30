/**
 * SAFE inspect of requested PHASE 1–8 + DeepSeek/Copilot 100-lists (P1-1 … P8-100).
 * Requested: auto engines, national KG, COMPUTE execute, durable fill, sci-os-x10/ tree,
 * Electron, hospitality/healthcare desks, PHI sandbox, ALPHA→BETA, InfraEngine ready=true.
 * Actual: analog V1/V2 remain. Those flips stay REFUSED or SKIPPED. No second OS.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. UNKNOWN ≠ 0. executed=false.
 */
import { AUTOMATION_PREP_HOOKS } from "./automation-prep.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { DIGITAL_WORKSPACE_COMPUTE_HOOKS } from "./digital-workspace-compute.js";
import { BUILD_SUITE_V2_HOOKS } from "./engine-suite-v2.js";
import { CLIENT_SUITE_HOOKS } from "./client-suite.js";
import { DURABLE_ADAPTER_HOOKS } from "./durable-adapter.js";
import { buildCopilotBlueprintWave } from "./phase-core-contracts.js";

export type PhaseCoreResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type PhaseCoreCheck = {
  id: string;
  requested: string;
  result: PhaseCoreResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
};

function chk(id: string, requested: string, result: PhaseCoreResult, evidence: string, note: string): PhaseCoreCheck {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false, applied: false };
}

export const PHASE_CORE_HOOKS = {
  schema: "sci-os-phase-core/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoAudit: false as const,
  autoLimits: false as const,
  autoScenarios: false as const,
  autoDecide: false as const,
  freeze: false as const,
  hold: false as const,
  block: false as const,
  calibratedLive: false as const,
  nationalGraph: false as const,
  executed: false as const,
  filled: false as const,
  persisted: false as const,
  durable: false as const,
  computeMode: "INSPECT_ONLY" as const,
  secondWorkflowEngine: false as const,
  secondShell: false as const,
  daemonInBoot: false as const,
  prometheus: false as const,
  otlp: false as const,
  beta: false as const,
  alphaToBeta: false as const,
  parallelTree: false as const,
  sciOsX10Package: false as const,
  inspectionUnlocked: true as const,
  note: "Phase 1–8 inspect of DeepSeek 100 + Copilot 100. Continuous auto engines, causal/national KG, live calibration, auto-execute, durable fill, in-boot daemon, Electron, hospitality/healthcare desks, PHI sandbox, and ALPHA→BETA stay REFUSED or SKIPPED. Analog V1/V2 remain. No sci-os-x10/ second tree. Not READY.",
};

export function inspectPhase1AuditLimit() {
  return [
    chk("P1-1.continuousAudit", "autoAudit=true hash-chain persist", "REFUSED", "autoAudit=" + String(AUTOMATION_PREP_HOOKS.autoAudit), "In-memory audit exists. Continuous auto-audit is not an enterprise hash fabric."),
    chk("P1-2.continuousLimits", "autoLimits=true volatilityAdjust", "REFUSED", "autoLimits=" + String(AUTOMATION_PREP_HOOKS.autoLimits), "limit-engine-v1 uses GuardrailLimits. Missing metrics are UNKNOWN, not ?? 0."),
    chk("P1-3.enforcement", "auto freeze/hold/block", "REFUSED", "freeze=false hold=false block=false", "Advisory ALLOW/HOLD/BLOCK is not account freeze."),
  ];
}

export function inspectPhase1ScenarioCausalKg() {
  return [
    chk("P1-4.scenarioEngine", "cross-domain scenario run+persist", "REFUSED", "autoScenarios=" + String(AUTOMATION_PREP_HOOKS.autoScenarios), "No data-driven scenario runner."),
    chk("P1-5.hospitalityHealthcareRegistry", "hospitality/healthcare scenarios", "SKIPPED_RESEARCH_REQUIRED", "catalogs=ABSENT", "ABSENT catalogs. Do not invent ICU/occupancy SOPs."),
    chk("P1-6.causalEngine", "do-calculus ATE/CATE", "REFUSED", "causalQueryEngine=" + OS_BLUEPRINT_HOOKS.causalQueryEngine, "Placeholder estimate 0 is not causal science."),
    chk("P1-7.causalLineage", "durable causal lineage", "REFUSED", "durable=false", "GW1 /v1/lineage/:runId remains the run proof path."),
    chk("P1-8.nationalKg", "national graph upsert", "REFUSED", "nationalGraph=" + String(OS_BLUEPRINT_HOOKS.nationalGraph), "Wave-1 analog overlay only."),
    chk("P1-9.kgMigrations", "CREATE kg_nodes/kg_edges", "PREPARED_DISABLED", "sql=packages/data-fabric/sql/ecl-engine-books-v1.sql", "Prepared SQL is not an applied national graph."),
    chk("P1-10.kgIngest", "live source fetch", "REFUSED", "live=false", "No venue-certified ingest loop."),
    chk("P1-11.kgQuery", "multi-hop reasoning", "ANALOG_CONTRACT", "engine=kg-engine-v2", "Registry overlay filter. Empty ⇒ UNKNOWN."),
  ];
}

export function inspectPhase1PredictionRisk() {
  return [
    chk("P1-12.predictionV2", "calibratedLive=true", "REFUSED", "calibratedLive=false", "prediction-engine-v1 is model−implied, not live-calibrated."),
    chk("P1-13.predictionV3", "featureStore+active-model", "REFUSED", "liveFeatureStore=false", "Dummy value/interval 0.95–1.05 refused."),
    chk("P1-14.riskV2", "EWMA/GARCH live", "ANALOG_CONTRACT", "sessionDrawdown=book", "Session analog vol/drawdown. Not a live GARCH engine."),
    chk("P1-15.riskV3", "VaR=gross*0.05", "REFUSED", "inventedVar=true", "Invented 5%/10%/15% ratios are not a risk model."),
  ];
}

export function inspectPhase2StateTracking() {
  return [
    chk("P2-16.drawdown", "durable session DD persist", "ANALOG_CONTRACT", "session.maxDrawdown", "In-memory session drawdown. UPSERT refused without Postgres INSERT."),
    chk("P2-17.exposure", "exposure_book persist", "ANALOG_CONTRACT", "book.exposure", "Guardrail notional. bySector/byGeo empty ≠ padded."),
    chk("P2-18.leverage", "effectiveLeverage=gross/vol", "ANALOG_CONTRACT", "book.leverage", "Uses bankroll margin/equity. Missing equity is UNKNOWN, not /0."),
    chk("P2-19.dailyLoss", "halt at 5%", "REFUSED", "inventedHalt=0.05", "Uses GuardrailLimits.maxDailyLoss absolute. No auto halt."),
    chk("P2-20.multiInstrumentRisk", "correlation VaR aggregator", "REFUSED", "correlations=ABSENT", "Do not invent a correlation matrix."),
    chk("P2-21.multiHorizonPred", "ensemble calibrated=true", "REFUSED", "calibrated=false", "Weighted ensemble of UNKNOWN series is not PASS."),
    chk("P2-22.engineHealth", "healthy without probe", "ANALOG_CONTRACT", "healthz=liveness", "No evidence ⇒ UNKNOWN, never healthy-by-default."),
    chk("P2-23.retryCircuit", "generic SCIError bus", "PREPARED_DISABLED", "durable-adapter withRetry", "Ledger adapter retry exists. Not a second error OS."),
    chk("P2-24.prometheus", "Prometheus export", "REFUSED", "otlp.enabled=false", "Local logs only. OTLP ABSENT."),
    chk("P2-25.orchestrator", "engine graph runner", "REFUSED", "secondWorkflowEngine=false", "Do not add a second workflow engine."),
  ];
}

export function inspectPhase3CockpitCompute() {
  return [
    chk(
      "P3-26.cockpitV3",
      "durable COMPUTE",
      DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode === "INSPECT_ONLY" ? "REFUSED" : "FAIL",
      "computeMode=" + DIGITAL_WORKSPACE_COMPUTE_HOOKS.computeMode,
      "cockpit-compute-v1/v2 remain preview compose. INSPECT_ONLY."
    ),
    chk("P3-27.decisionComposer", "allPassed→execute", "REFUSED", "autoDecide=false executed=false", "UNKNOWN⇒HOLD FAIL⇒BLOCK. ALLOW is not an order."),
    chk("P3-28.evidenceComposer", "causalRefs live", "ANALOG_CONTRACT", "evidence-engine-v2", "Ledger signals. Empty ≠ padded demo."),
    chk("P3-29.lineageComposer", "durable lineage_book", "ANALOG_CONTRACT", "lineage-engine-v1", "Analog labels + GW1 runId. Not durable hash fabric."),
    chk("P3-30.riskComposer", "INSERT risk_book", "ANALOG_CONTRACT", "preview=true", "Preview risk-book. durable=true only after INSERT."),
    chk("P3-31.pnlComposer", "realized+unrealized persist", "ANALOG_CONTRACT", "preview=true realized=false", "size×previewFillPrice is notional, not realized PnL."),
    chk("P3-32.executionV2", "preview=false → filled", "REFUSED", "executed=" + String(BUILD_SUITE_V2_HOOKS.executed), "execution-engine-v1 previewFillPrice only."),
  ];
}

export function inspectPhase4Persistence() {
  return [
    chk("P4-33.executionV3", "5-slice filled+marketImpact", "REFUSED", "status=filled requested", "Simulator never marks filled/executed. Random impact refused."),
    chk("P4-34.durableAdapter", "pool min5 max20 live INSERT", "PREPARED_DISABLED", "adapter=" + DURABLE_ADAPTER_HOOKS.canonicalAdapter, "ALPHA adapter. durable=true only after INSERT. pg driver not bundled."),
    chk("P4-35.connectionPool", "DEFAULT_LEDGER_CONFIG live", "PREPARED_DISABLED", "optionalInfra=DEGRADED_until_connect", "OPTIONAL_INFRA_READY only after live SELECT 1."),
    chk("P4-36.ledgerArchive", "DELETE from hot + S3", "REFUSED", "append-only", "Rotate is a hint. Do not delete ledger history."),
    chk("P4-37.integrityChecker", "valid=true without scan", "REFUSED", "noEvidence=UNKNOWN", "Unscanned chain is UNKNOWN, never PASS."),
    chk("P4-38.pnlBookSql", "CREATE pnl_book applied", "PREPARED_DISABLED", "sci_ecl.pnl_book schema present", "Schema file exists. Not applied without Postgres."),
    chk("P4-39.riskBookSql", "CREATE risk_book applied", "PREPARED_DISABLED", "sci_ecl.risk_book", "Same as analog preview book. Invented VaR columns not live."),
    chk("P4-40.lineageBook", "CREATE lineage_book", "PREPARED_DISABLED", "durableLineage=false", "Prepared only."),
    chk("P4-41.evidenceBook", "CREATE evidence_book", "PREPARED_DISABLED", "durableEvidence=false", "Prepared only."),
    chk("P4-42.kgBook", "CREATE kg_book", "PREPARED_DISABLED", "durableKgRegistry=false", "Prepared only."),
    chk("P4-43.computeBook", "CREATE compute_book", "REFUSED", "INSPECT_ONLY", "Do not persist COMPUTE of UNKNOWN series."),
    chk("P4-44.auditLogSql", "hash-chained audit_log live", "PREPARED_DISABLED", "in-memory audit", "GET persisted=false."),
    chk("P4-45.limitLog", "CREATE limit_log", "PREPARED_DISABLED", "autoLimits=false", "Advisory eval only."),
    chk("P4-46.scenarioLog", "CREATE scenario_log", "REFUSED", "autoScenarios=false", "No generated scenario runner."),
    chk("P4-47.causalLog", "CREATE causal_log", "REFUSED", "causalQueryEngine=ABSENT", "No do-calculus log."),
    chk("P4-48.executionLog", "CREATE execution_log filled", "REFUSED", "executed=false", "Preview-only. No fill blotter."),
    chk("P4-49.errorLog", "CREATE error_log", "PREPARED_DISABLED", "local logs", "Not OTLP."),
    chk("P4-50.infraLog", "CREATE infra_log", "ANALOG_CONTRACT", "GET /v1/ecl/engine/infra", "Pool/daemon heartbeat inspect. Not a metrics fabric."),
  ];
}

export function inspectPhase5Daemon() {
  const d = CLIENT_SUITE_HOOKS.daemon;
  return [
    chk("P5-51.sciDaemonStart", "SCIDaemon.start in-process", "REFUSED", "wiredIntoBoot=" + String(d.wiredIntoBoot), "sci-daemon.cjs is PREPARED_DISABLED. Not start-sci-os."),
    chk("P5-52.daemonHealthTrue", "postgres/shell/cp true", "REFUSED", "noEvidence=UNKNOWN", "Do not self-declare healthy connectivity."),
    chk("P5-53.pnlLoop", "30s persist recompute", "PREPARED_DISABLED", "wrapper=" + d.wrapper, "HTTP GET pnl-book only if --service. Preview."),
    chk("P5-54.ledgerRotateLoop", "60s archive+delete", "REFUSED", "append-only", "Heartbeat rotate hint only."),
    chk("P5-55.kgIngestLoop", "300s live ingest", "REFUSED", "live=false", "No certified feed loop."),
    chk("P5-56.scenarioLoop", "600s auto scenarios", "REFUSED", "autoScenarios=false", "HITL remains human."),
    chk("P5-57.errorRecovery", "auto-repair loop", "REFUSED", "autoRepair=PROPOSAL_ONLY", "LDA auto-patch stays false."),
    chk("P5-58.shutdownHandlers", "process.exit in child", "PREPARED_DISABLED", "orchestrator SIGTERM", "Canonical stop is pnpm sci:stop."),
    chk("P5-59.checkCPTrue", "checkCP()=>true", "REFUSED", "probeRequired", "Return UNKNOWN without fetch evidence."),
    chk("P5-60.checkShellTrue", "checkShell()=>true", "REFUSED", "probeRequired", "Return UNKNOWN without fetch evidence."),
  ];
}

export function inspectPhase6Clients() {
  return [
    chk("P6-61.desktopElectron", "Electron viewer AppHost", "REFUSED", "status=" + CLIENT_SUITE_HOOKS.desktop.status, "ADR-SHELL-001: Shell is AppHost. No override."),
    chk("P6-62.desktopPort8080", "apiBaseUrl localhost:8080", "REFUSED", "ports=3000/4000", "Canonical CP :3000 Shell :4000."),
    chk("P6-63.desktopTradePanels", "cockpit 1s live", "REFUSED", "tradeNow=false", "No Trade now. Preview only if a viewer is ever allowed."),
    chk("P6-68.hospitalityDesk", "React Native hospitality", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "No hospitality instrument set."),
    chk("P6-69.healthcareDesk", "React Native healthcare", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT PHI=ABSENT", "No healthcare desk."),
    chk("P6-70.cyberMobile", "mobile cyber desk", "REFUSED", "secondShell=false", "Cyber analog stays on the one Cockpit."),
    chk("P6-71.investmentMobile", "mobile investment desk", "REFUSED", "PCT-ROLE-COMPOSITION", "No 200 apps / four domain desks."),
    chk("P6-72.mobileCompute", "ComputePreview component", "SKIPPED_RESEARCH_REQUIRED", "desksCreated=0", "Not shipped."),
    chk("P6-73.mobileKg", "KGViewer component", "SKIPPED_RESEARCH_REQUIRED", "nationalGraph=false", "Not shipped."),
    chk("P6-74.mobileLedger", "LedgerViewer component", "SKIPPED_RESEARCH_REQUIRED", "durable=false", "Not shipped."),
    chk("P6-75.mobileInfra", "InfraViewer component", "SKIPPED_RESEARCH_REQUIRED", "CLI infra exists", "Use sci infra on ops CLI, not a mobile OS."),
  ];
}

export function inspectPhase7Domains() {
  return [
    chk("P7-76.hospitalityCatalog", "DOMAIN_CATALOGS.hospitality live", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent rooms/ADR/RevPAR instruments."),
    chk("P7-77.healthcareCatalog", "DOMAIN_CATALOGS.healthcare live", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT PHI=ABSENT", "Do not invent beds/OR/ventilator instruments."),
    chk("P7-78.cyberCatalog", "DOMAIN_CATALOGS.cyber live", "ANALOG_CONTRACT", "os-blueprint cyber PARTIAL", "Analog overlay on the one Cockpit. Not a live SIEM catalog."),
    chk("P7-79.investmentCatalog", "DOMAIN_CATALOGS.investment live", "ANALOG_CONTRACT", "DIL simulated_alpha", "Bankroll/guardrail analog. Not venue-certified feeds."),
    chk("P7-80.phiSandbox", "DEFAULT_PHI_SANDBOX.enabled=true", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "No PHI to tokenize. Do not ship a fake healthcare sandbox."),
    chk("P7-81.kgIngestHospitality", "ingestDomain hospitality", "SKIPPED_RESEARCH_REQUIRED", "ingested++ without fetch", "Counting sources is not ingest."),
    chk("P7-82.kgIngestHealthcare", "ingestDomain healthcare", "SKIPPED_RESEARCH_REQUIRED", "EHR=ABSENT", "No de-identified EHR pipeline."),
    chk("P7-83.kgIngestCyber", "ingestDomain cyber", "REFUSED", "liveSiem=false", "No certified threat-feed loop."),
    chk("P7-84.kgIngestInvestment", "ingestDomain investment", "REFUSED", "liveBroker=false", "simulated_alpha is not market-data ingest."),
  ];
}

export function inspectPhase8Governance() {
  return [
    chk("P8-85.hitlV2", "HITLGovernanceV2 second bus", "ANALOG_CONTRACT", "POST /v1/ai/proposals/:id/review", "Existing HITL remains AGENT→PROPOSAL→HUMAN→DECISION. No second approval OS."),
    chk("P8-86.hitlV3", "healthcare 3-step / large_trade auto", "REFUSED", "hitlMode=ANALOG_CONTRACT", "Domain role matrices without catalogs stay SKIPPED. Do not auto-approve."),
    chk("P8-87.governanceAuditSql", "CREATE governance_audit applied", "PREPARED_DISABLED", "GET persisted=false", "Audit events stay in-memory unless INSERT succeeds."),
    chk("P8-88.governanceRiskRules", "live risk rule table", "ANALOG_CONTRACT", "GuardrailLimits + RiskBucket", "Advisory eval. Not durable policy fabric."),
    chk("P8-89.governanceLimitRules", "live limit rule table", "ANALOG_CONTRACT", "limit-engine-v1", "autoLimits=false."),
    chk("P8-90.governanceScenarioRules", "live scenario rule table", "REFUSED", "autoScenarios=false", "No generated scenario runner."),
    chk("P8-91.governanceCausalRules", "live causal rule table", "REFUSED", "causalQueryEngine=ABSENT", "No do-calculus rules."),
    chk("P8-92.infraEngineV2", "check() status=up persist", "REFUSED", "noEvidence=UNKNOWN", "Do not self-declare up."),
    chk("P8-93.infraPrometheus", "Prometheus metrics", "REFUSED", "otlp.enabled=false", "Local logs only."),
    chk("P8-94.infraErrorRecovery", "auto error recovery", "REFUSED", "autoRepair=PROPOSAL_ONLY", "LDA auto-patch stays false."),
    chk("P8-95.infraDegraded", "degradedMode switcher", "ANALOG_CONTRACT", "OPTIONAL_INFRA_DEGRADED", "Allowed without Postgres. Not a second infra OS."),
    chk("P8-96.infraDependency", "dependency checker live", "ANALOG_CONTRACT", "GET /v1/ecl/engine/infra", "pgDriver ABSENT. Probe required."),
    chk("P8-97.infraReadinessTrue", "readiness ready=true", "REFUSED", "ready=false", "No evidence ⇒ UNKNOWN, never ready=true."),
    chk("P8-98.securitySandbox", "isolate domain resources", "PREPARED_DISABLED", "PolicyEngine live_execution=off", "Not a new isolate/quarantine product."),
    chk("P8-99.securityAudit", "INSERT security_audit", "PREPARED_DISABLED", "in-memory audit", "GET persisted=false."),
    chk("P8-100.securityPolicy", "default-deny engine", "ANALOG_CONTRACT", "PolicyEngine", "Empty invented policies are not a second IAM."),
  ];
}

export function inspectCopilotBlueprintBoxes() {
  return [
    chk("C-box1.engines", "100 engine blueprints + APIs", "REFUSED", "massStubs=false", "Do not emit 100 empty dirs. Analog V1/V2 + inspect notes are the contract."),
    chk("C-box2.stateCompute", "composer/orchestrator blueprints", "REFUSED", "secondWorkflowEngine=false", "Cockpit stays INSPECT_ONLY. No execute composer."),
    chk("C-box3.persistenceDaemon", "migrations/ under sci-os-x10", "REFUSED", "parallelTree=false", "SQL lives in packages/data-fabric/sql. Optional, not applied."),
    chk("C-box4.clientsGov", "desktop/mobile/PHI/HITL/security plans", "REFUSED", "AppHost=Shell", "Electron/Qt/MAUI REFUSED. Mobile SKIPPED. HITL analog."),
  ];
}

export function inspectBuildoutConstraints() {
  return [
    chk("X.alphaToBeta", "MODE ALPHA→BETA transition", "REFUSED", "label=ALPHA_NON_PRODUCTION", "BETA is not stamped. Fabric remains ALPHA_ADAPTER."),
    chk("X.sciOsX10Tree", "src/phase1…phase8 second package", "REFUSED", "oneProduct=scios-alpha", "Compose into packages/ecl-dil. No parallel boot."),
    chk("X.deepSeekImplement", "DeepSeek implement 100 live engines", "REFUSED", "inspectOnly=true", "Named inspect functions return REFUSED/SKIPPED/ANALOG."),
    chk("X.copilot81to100", "20 extra implementation plans", "REFUSED", "emptyFiles=0", "No mass stub encyclopedia."),
  ];
}

export function buildPhaseCoreWave() {
  const p1a = inspectPhase1AuditLimit();
  const p1b = inspectPhase1ScenarioCausalKg();
  const p1c = inspectPhase1PredictionRisk();
  const p2 = inspectPhase2StateTracking();
  const p3 = inspectPhase3CockpitCompute();
  const p4 = inspectPhase4Persistence();
  const p5 = inspectPhase5Daemon();
  const p6 = inspectPhase6Clients();
  const p7 = inspectPhase7Domains();
  const p8 = inspectPhase8Governance();
  const copilot = inspectCopilotBlueprintBoxes();
  const constraints = inspectBuildoutConstraints();
  const contracts = buildCopilotBlueprintWave();
  const checks = [...p1a, ...p1b, ...p1c, ...p2, ...p3, ...p4, ...p5, ...p6, ...p7, ...p8, ...copilot, ...constraints];
  const refused = checks.filter((c) => c.result === "REFUSED").length;
  const skipped = checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;
  const analog = checks.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const prepared = checks.filter((c) => c.result === "PREPARED_DISABLED").length;
  const fail = checks.filter((c) => c.result === "FAIL" || contracts.wave === "FAIL").length;
  return {
    ...PHASE_CORE_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 200,
    deepSeekItems: 100,
    copilotItems: 100,
    inspected: checks.length,
    health: {
      refused,
      skipped,
      analog,
      prepared,
      fail,
      executed: 0,
      filled: 0,
      desksCreated: 0,
      daemonStarted: 0,
      applied: 0,
      blueprintsWritten: 0,
      parallelPackages: 0,
      contractRows: contracts.deepseek.length,
    },
    boxes: {
      engines: "REFUSED",
      stateCompute: "REFUSED",
      persistenceDaemonClients: "REFUSED",
      domainsGovInfraSecurity: "REFUSED",
    },
    p1: [...p1a, ...p1b, ...p1c],
    p2,
    p3,
    p4,
    p5,
    p6,
    p7,
    p8,
    copilot,
    constraints,
    contracts,
    checks,
  };
}
