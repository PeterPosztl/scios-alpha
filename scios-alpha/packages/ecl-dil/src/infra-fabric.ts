/**
 * SAFE inspect of requested INFRA FABRIC (5×200 = 1000 tasks).
 * Requested: src/infra-fabric.ts + npx tsx, depends on sci-os-x10 / domain / kg /
 * scenario / causal / governance fabrics, probe always-up, Prometheus scrape,
 * READY stamps, autoRecovery, daemon in boot.
 * Actual analog: GET /v1/ecl/engine/infra + GET /v1/ecl/infra.
 * pgDriver=ABSENT until pg is installed. Daemon enabledInBoot=false.
 * OPTIONAL_INFRA_DEGRADED without DATABASE_URL. ALPHA_NON_PRODUCTION.
 */
export type InfraFabricResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type InfraFabricCheck = {
  id: string;
  requested: string;
  result: InfraFabricResult;
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
  result: InfraFabricResult,
  evidence: string,
  note: string
): InfraFabricCheck {
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

export const INFRA_FABRIC_HOOKS = {
  schema: "sci-os-infra-fabric/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoDecide: false as const,
  persisted: false as const,
  parallelTree: false as const,
  autoRecovery: false as const,
  daemonInBoot: false as const,
  analogApi: "GET /v1/ecl/engine/infra" as const,
  note: "Infra-fabric 1–1000 inspect. No src/infra-fabric.ts. Degraded without PG is allowed. Not READY.",
};

export function inspectInfraFabricPath() {
  return [
    chk("IF.path", "src/infra-fabric.ts 1000-task file", "REFUSED", "massStub=true parallelOS=true", "Compose into ecl-dil analog. Do not add a second product file."),
    chk("IF.deps", "depends on sci-os-x10 + domain + kg + scenario + causal + governance", "REFUSED", "megaFiles=0", "Those files were refused. Do not invent a dependency graph."),
    chk("IF.npxTsx", "npx tsx src/infra-fabric.ts", "REFUSED", "secondBoot=true packageManager=pnpm", "Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("IF.entry", "new InfraFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "One AppHost. OPTIONAL_INFRA_DEGRADED without DATABASE_URL."),
  ];
}

export function inspectInfraEngine() {
  return [
    chk("IF1_200.probeAlwaysUp", "InfraEngineCore.probeComponent returns 'up'", "REFUSED", "noEvidence=UNKNOWN", "A hardcoded up is not a probe."),
    chk("IF1_200.daemonUp", "checkDaemon status='up'", "REFUSED", "daemonInBoot=false PREPARED_DISABLED", "sci-daemon.cjs is not in start-sci-os."),
    chk("IF1_200.autoRecoveryTrue", "DEFAULT_INFRA_CONFIG.recovery.autoRecovery=true", "REFUSED", "autoRepair=PROPOSAL_ONLY", "Do not auto-restart as an order."),
    chk("IF1_200.degradedMode", "DegradedModeController enter/exit", "ANALOG_CONTRACT", "OPTIONAL_INFRA_DEGRADED without PG", "Missing Postgres is allowed degraded, not a second engine."),
    chk("IF1_200.checkAllUp", "checkAll daemon/shell/cp always healthy", "REFUSED", "noEvidence=UNKNOWN", "Hardcoded healthy is not a health check."),
    chk("IF1_200.percentEmpty1", "PercentageTracker empty → 1", "REFUSED", "missing=UNKNOWN", "Empty success rate is UNKNOWN, never 100%."),
  ];
}

export function inspectInfraMetrics() {
  return [
    chk("IF201_400.prometheusScrape", "metrics.prometheus.scrape live OTLP", "REFUSED", "GET /v1/ecl/infra enabled=false", "Prometheus scrape is not live telemetry."),
    chk("IF201_400.emptyZero", "histogram empty avg/p50/p95=0", "REFUSED", "missing=UNKNOWN", "Empty samples are UNKNOWN, never 0."),
    chk("IF201_400.ratioZero", "ratio denominator 0 → 0", "REFUSED", "missing=UNKNOWN", "Divide-by-zero is UNKNOWN, never 0."),
    chk("IF201_400.metricsDelete", "retention DELETE FROM infra_metrics", "REFUSED", "append-only", "Do not delete metric history."),
  ];
}

export function inspectInfraReadiness() {
  return [
    chk("IF401_600.readyStamp", "ReadinessChecker consecutiveSuccesses → state='ready'", "REFUSED", "ready=false", "No evidence ⇒ UNKNOWN, never READY."),
    chk("IF401_600.gatekeeper", "gatekeeper.canAcceptTraffic every probe ready", "REFUSED", "ready=false", "Do not accept traffic from invented probes."),
    chk("IF401_600.daemonReady", "ReadinessProbeTemplates.daemon-ready", "REFUSED", "daemonInBoot=false", "Daemon is PREPARED_DISABLED."),
    chk("IF401_600.engineInfra", "GET /v1/ecl/engine/infra", "ANALOG_CONTRACT", "pgDriver=ABSENT daemon enabledInBoot=false", "Alpha adapter, not BETA fabric."),
    chk("IF401_600.waitForReady", "ReadinessGate.waitForReady timeout stamps ready", "REFUSED", "ready=false", "Waiting is not evidence."),
    chk("IF401_600.refusedProbes", "kg-ready / causal-ready / scenario-ready templates", "REFUSED", "megaFiles=0", "Those fabrics were refused."),
  ];
}

export function inspectInfraDepRecovery() {
  return [
    chk("IF601_800.depAlwaysHealthy", "DependencyChecker.check healthy=true", "REFUSED", "noEvidence=UNKNOWN", "Hardcoded healthy is not a dependency check."),
    chk("IF601_800.daemonRequiredPg", "DependencyLibrary daemon → postgres required", "REFUSED", "daemonInBoot=false pgDriver=ABSENT", "Boot does not require Pool or daemon."),
    chk("IF601_800.refusedEngines", "compute/governance/causal/kg as required engines", "REFUSED", "megaFiles=0", "Those fabrics were refused."),
    chk("IF801_1000.autoRecover", "AutoRecoveryEngine / orchestrator.recover", "REFUSED", "autoRepair=PROPOSAL_ONLY", "Recovery is a proposal, not an order."),
    chk("IF801_1000.failoverTrue", "FailoverHandler/RollbackHandler success=true", "REFUSED", "noEvidence=UNKNOWN", "Empty try is not failover."),
    chk("IF801_1000.emptySuccess1", "dashboard successRate total=0 → 1", "REFUSED", "missing=UNKNOWN", "Empty recovery is UNKNOWN, never 100%."),
    chk("IF801_1000.sqlInterval", "RecoverySummary INTERVAL string interpolation", "REFUSED", "sqlInjection=true", "Do not interpolate SQL."),
    chk("IF801_1000.mainRequire", "require.main === module InfraFabric.main", "REFUSED", "secondBoot=true", "Canonical boot is start-sci-os."),
    chk("IF801_1000.alwaysTrueSteps", "RecoveryLibrary register run:()=>true", "REFUSED", "executed=false", "Always-true steps are not recovery."),
    chk("IF801_1000.recoveryDelete", "RecoveryRetention DELETE FROM infra_recovery", "REFUSED", "append-only", "Do not delete recovery history."),
  ];
}

export function inspectInfraFabricBoot() {
  return [
    chk("IF7.postgresCtor", "new InfraFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "Do not require Pool at boot."),
    chk("IF7.initialize", "initialize() runAll migrations", "PREPARED_DISABLED", "GET /v1/ecl/engine/infra", "Session analog. Not applied SQL."),
    chk("IF7.startLoop", "fabric.start() InfraEngineCore loop", "REFUSED", "secondBoot=true", "Do not start a parallel probe loop."),
    chk("IF7.checkPostgres", "engine.checker.checkPostgres SELECT 1", "ANALOG_CONTRACT", "GET /v1/ecl/engine/infra pgDriver=ABSENT", "OPTIONAL_INFRA_DEGRADED without DATABASE_URL."),
    chk("IF7.degradedEnter", "degradedMode.enter('maintenance')", "ANALOG_CONTRACT", "OPTIONAL_INFRA_DEGRADED", "Degraded without PG is already the product contract."),
    chk("IF7.daemonBeat", "heartbeat.beat('daemon')", "REFUSED", "daemonInBoot=false", "sci-daemon.cjs is not in start-sci-os."),
    chk("IF7.prometheus", "metrics.prometheus.scrape()", "REFUSED", "liveOtlp=false", "In-memory counters are not Prometheus."),
    chk("IF7.histEmptyZero", "histograms.observe + empty→0 snapshot", "REFUSED", "missing=UNKNOWN", "Empty p50 is UNKNOWN."),
    chk("IF7.postgresReadyTrue", "readiness.checker.check('postgres-ready', true)", "REFUSED", "ready=false", "Do not stamp READY from two true ticks."),
    chk("IF7.canAcceptTraffic", "gatekeeper.canAcceptTraffic()", "REFUSED", "ready=false", "Traffic gate is not flipped by analog probes."),
    chk("IF7.dependsOnCompute", "dependency.graph.dependsOn('compute-engine')", "REFUSED", "megaFiles=0", "Compute/governance fabrics were refused."),
    chk("IF7.detectCycle", "dependency.graph.detectCycle()", "PREPARED_DISABLED", "inspect-only", "Do not persist a second dependency graph."),
    chk("IF7.impactPostgres", "impactAnalyzer.analyze('postgres')", "ANALOG_CONTRACT", "OPTIONAL_INFRA_DEGRADED", "Missing PG is degraded, not a cascade order."),
    chk("IF7.recoverPostgres", "recovery.orchestrator.recover('postgres') run:()=>true", "REFUSED", "autoRepair=PROPOSAL_ONLY executed=false", "Always-true recover is not recovery."),
    chk("IF7.dashboardEmpty1", "recovery.dashboard.dashboard empty→successRate=1", "REFUSED", "missing=UNKNOWN", "Empty COUNT is UNKNOWN, never 100%."),
    chk("IF7.healthOverallUp", "healthCheck healthy=agg.overall==='up'", "REFUSED", "noEvidence=UNKNOWN", "Hardcoded component up is not health."),
    chk("IF7.pgPasswordSecret", "PG_PASSWORD ?? 'secret'", "REFUSED", "secretInSource=true", "Do not ship default secrets."),
    chk("IF7.mainWrites", "main() start + daemon up + recover postgres + process.exit", "REFUSED", "secondBoot=true executed=false", "Do not run a 3s demo as product boot."),
    chk("IF7.versionsSet", "engine.versions.set('postgres','16.0')", "REFUSED", "noEvidence=UNKNOWN", "A hardcoded version string is not live Postgres."),
    chk("IF7.alwaysTrueCtor", "constructor RecoveryLibrary.all run:()=>true", "REFUSED", "autoRepair=PROPOSAL_ONLY", "Do not pre-register auto-success recovery."),
    chk("IF7.waitForReady", "readiness.gate.waitForReady", "REFUSED", "ready=false", "Do not block boot on invented probes."),
  ];
}

export function buildInfraFabricWave() {
  const path = inspectInfraFabricPath();
  const engine = inspectInfraEngine();
  const metrics = inspectInfraMetrics();
  const readiness = inspectInfraReadiness();
  const depRecovery = inspectInfraDepRecovery();
  const boot = inspectInfraFabricBoot();
  const checks = [...path, ...engine, ...metrics, ...readiness, ...depRecovery, ...boot];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...INFRA_FABRIC_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 1000,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      autoRecoveries: 0,
      daemonInBoot: 0,
      applied: 0,
      megaFiles: 0,
    },
    path,
    engine,
    metrics,
    readiness,
    depRecovery,
    boot,
    checks,
  };
}
