/**
 * SAFE inspect of requested SCENARIO FABRIC (5×200 = 1000 tasks).
 * Requested: src/scenario-fabric.ts + npx tsx, depends on sci-os-x10 / domain-fabric / kg-fabric,
 * hospitality registry, causal library, parallel runBatch, load('ready').
 * Actual: analog automation-prep templates. Hospitality/Healthcare ABSENT.
 * causalQueryEngine=ABSENT. executed=false. No second file/boot.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT.
 */
export type ScenarioFabricResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type ScenarioFabricCheck = {
  id: string;
  requested: string;
  result: ScenarioFabricResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
  executed: false;
};

function chk(
  id: string,
  requested: string,
  result: ScenarioFabricResult,
  evidence: string,
  note: string
): ScenarioFabricCheck {
  return {
    id,
    requested,
    result,
    evidence,
    note,
    autoTrade: false,
    ready: false,
    applied: false,
    executed: false,
  };
}

export const SCENARIO_FABRIC_HOOKS = {
  schema: "sci-os-scenario-fabric/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  executed: false as const,
  persisted: false as const,
  parallelTree: false as const,
  analogApi: "GET /v1/ecl/professional/automation-prep" as const,
  note: "Scenario-fabric 1–1000 inspect. No src/scenario-fabric.ts. No sci-os-x10/domain/kg fabric deps. Analog templates remain. Not READY.",
};

export function inspectScenarioFabricPath() {
  return [
    chk("SF.path", "src/scenario-fabric.ts 1000-task file", "REFUSED", "massStub=true parallelOS=true", "Compose into ecl-dil analog. Do not add a second product file."),
    chk("SF.sciOsX10Dep", "depends on sci-os-x10.ts Fabric", "REFUSED", "sci-os-x10=ABSENT", "Durable fabric megafile was refused."),
    chk("SF.domainKgDep", "depends on Domain Fabric + KG Fabric", "REFUSED", "megaFiles=0", "Those files were refused. Do not invent a dependency graph."),
    chk("SF.npxTsx", "npx tsx src/scenario-fabric.ts", "REFUSED", "secondBoot=true packageManager=pnpm", "Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("SF.entry", "new ScenarioFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "One AppHost. Scenarios are analog GET, not a fabric constructor."),
  ];
}

export function inspectScenarioRegistry() {
  return [
    chk("SF1_200.hospitalityHighSeason", "RegistryTemplates.hospitalityHighSeason write", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent occupancy scenarios."),
    chk("SF1_200.healthcareSurge", "healthcare pandemic/staff_shortage registry", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Do not invent clinical scenarios."),
    chk("SF1_200.investmentRateToEquity", "CausalScenarioLibrary.investmentRateToEquity", "REFUSED", "causalQueryEngine=ABSENT", "A named template is not an identified effect."),
    chk("SF1_200.cyberThreatToDowntime", "CausalScenarioLibrary.cyberThreatToDowntime", "ANALOG_CONTRACT", "cyber-research-bridge inspect liveSiem=false", "Analog label. Not a live SOC scenario engine."),
    chk("SF1_200.readyStamp", "registry status='ready' as PASS", "REFUSED", "noEvidence=UNKNOWN", "A status string is not READY."),
  ];
}

export function inspectScenarioLoader() {
  return [
    chk("SF201_400.validateId", "loader.validator.validate('scenario-id')", "ANALOG_CONTRACT", "automation-prep analog templates", "Id lookup is inspect. Missing catalog ⇒ UNKNOWN."),
    chk("SF201_400.loadReady", "loader.byStatus.load('ready')", "REFUSED", "ready=false", "Do not load READY. Analog templates stay inspect-only."),
    chk("SF201_400.loadInvestment", "byDomain.domainIntegrator.loadByDomain('investment')", "ANALOG_CONTRACT", "GET /v1/pnl-book preview=true", "Investment analog remains. Not a live domain pack."),
    chk("SF201_400.loadHospitality", "loadByDomain('hospitality')", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "No hospitality loader."),
  ];
}

export function inspectScenarioRunner() {
  return [
    chk("SF401_600.coreRun", "runner.core.run(def, contextFor(def))", "REFUSED", "executed=false autoTrade=false", "Run is preview. AGENT → PROPOSAL → HUMAN → DECISION."),
    chk("SF401_600.recordResult", "registryIntegration.recordResult live write", "PREPARED_DISABLED", "GET persisted=false", "Session analog only. Not durable."),
    chk("SF401_600.parallelBatch", "parallelExecutor.runBatch(..., 4)", "REFUSED", "parallelTree=false", "One orchestrator. No four-way scenario farm."),
    chk("SF401_600.monteCarlo", "Math.random scenario outcomes", "REFUSED", "Math.random forbidden", "Deterministic analog only."),
    chk("SF401_600.metricZero", "resolveMetric missing → 0", "REFUSED", "empty=UNKNOWN", "Missing metric is UNKNOWN, never 0."),
    chk("SF401_600.statusPassed", "stepResults.every passed → status passed", "REFUSED", "noEvidence=UNKNOWN", "Self-declared passed is not PASS."),
  ];
}

export function inspectScenarioDomainCausal() {
  return [
    chk("SF601_800.domainIntegration", "Scenario Domain Integration live 7 domains", "REFUSED", "liveDomainData=false", "Hospitality/Healthcare SKIPPED. Cyber/investment analog only."),
    chk("SF601_800.hospitalityPaddedHistory", "HospitalityDemandForecaster historical ?? [0.6..0.8]", "REFUSED", "paddedSeries=true", "Do not invent occupancy series."),
    chk("SF601_800.healthcareLosEngine", "HealthcareLOSPredictor invented age/ICU formula", "REFUSED", "noModel=UNKNOWN", "Hardcoded LOS is not evidence."),
    chk("SF601_800.cyberMttrHardcoded", "CyberMTTRCalculator return 45", "REFUSED", "hardcoded=45 empty=UNKNOWN", "No incidents ⇒ UNKNOWN, never 45."),
    chk("SF601_800.registerAll", "MultiDomainScenarioOrchestrator.registerAll", "REFUSED", "secondWorkflowEngine=false", "One start-sci-os. No fabric orchestrator."),
    chk("SF801_1000.causalRegister", "causalIntegration.registry.register live", "REFUSED", "causalQueryEngine=ABSENT", "Registering a string is not do-calculus."),
    chk("SF801_1000.governanceAutoApprove", "CausalGovernanceEngine approved=confidence>=0.7", "REFUSED", "autoDecide=false", "GOVERNANCE > AGENT. Do not auto-approve."),
    chk("SF801_1000.causalMonteCarlo", "CausalMonteCarloEngine Math.random Box-Muller", "REFUSED", "Math.random forbidden", "No Monte Carlo SSE."),
    chk("SF801_1000.healthCountTrue", "healthCheck COUNT(*) healthy=true", "REFUSED", "noEvidence=UNKNOWN", "A count is not fabric health."),
    chk("SF801_1000.initialize", "fabric.initialize() migrations", "PREPARED_DISABLED", "sql not applied", "Analog templates. Not product boot."),
    chk("SF801_1000.mainRequire", "require.main === module ScenarioFabric.main", "REFUSED", "secondBoot=true", "Canonical boot is start-sci-os."),
    chk("SF801_1000.mainWritesAll", "main() write 7 domain templates + run + batch", "REFUSED", "executed=false liveDesks=0", "Do not persist hospitality/healthcare/causal runs."),
  ];
}

export function buildScenarioFabricWave() {
  const path = inspectScenarioFabricPath();
  const registry = inspectScenarioRegistry();
  const loader = inspectScenarioLoader();
  const runner = inspectScenarioRunner();
  const domainCausal = inspectScenarioDomainCausal();
  const checks = [...path, ...registry, ...loader, ...runner, ...domainCausal];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...SCENARIO_FABRIC_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 1000,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      executedRuns: 0,
      parallelBatches: 0,
      liveDesks: 0,
      applied: 0,
      megaFiles: 0,
    },
    path,
    registry,
    loader,
    runner,
    domainCausal,
    checks,
  };
}
