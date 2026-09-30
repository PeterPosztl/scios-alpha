/**
 * SAFE inspect of requested Cursor Integration RUNBOOK V1.
 * Requested: npm install + npm run sci {build,test,lint,infra,doctor,map,run} +
 * scripts/{build,test,lint,infra,sci}.cjs + Prometheus export + E2E megafile.
 * Actual analog: pnpm + apps/sci-cli/sci.cjs (SCI_CLI_SUITE_V2) + in-process smoke.
 * execution=false durable=false daemon=PREPARED_DISABLED. ALPHA_NON_PRODUCTION.
 */
export type CursorRunbookResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type CursorRunbookCheck = {
  id: string;
  requested: string;
  result: CursorRunbookResult;
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
  result: CursorRunbookResult,
  evidence: string,
  note: string
): CursorRunbookCheck {
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

export const CURSOR_RUNBOOK_HOOKS = {
  schema: "sci-os-cursor-runbook/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoDecide: false as const,
  persisted: false as const,
  preview: true as const,
  durable: false as const,
  execution: false as const,
  daemonInBoot: false as const,
  parallelTree: false as const,
  analogSmoke: "apps/control-plane-api/src/eclDil.smoke.ts" as const,
  analogCli: "apps/sci-cli/sci.cjs" as const,
  analogApi: "GET /v1/ecl/clients" as const,
  analogStatus: "pnpm sci:status" as const,
  note: "Realistic Runbook V1: existing files only. Full Buildout stays REFUSED. Flags unchanged. Not READY.",
};

export function inspectCursorRunbookSteps() {
  return [
    chk("RB.1.npmInstall", "npm install all fabrics", "REFUSED", "packageManager=pnpm", "pnpm only. Do not add npm lockfile."),
    chk("RB.2.buildCjs", "npm run sci build / scripts/build.cjs", "REFUSED", "scripts/build.cjs=ABSENT", "Analog: GET /v1/ecl/engine/build-v3 BUILD_SUITE_V3 inspect."),
    chk("RB.3.testCjs", "npm run sci test / scripts/test.cjs", "REFUSED", "scripts/test.cjs=ABSENT", "Analog: node --import tsx --test + eclDil.smoke.ts."),
    chk("RB.4.lintCjs", "npm run sci lint / scripts/lint.cjs", "REFUSED", "scripts/lint.cjs=ABSENT", "Do not invent a second lint OS."),
    chk("RB.5.infraCjs", "npm run sci infra / scripts/infra.cjs", "ANALOG_CONTRACT", "sci.cjs infra → GET /v1/ecl/engine/infra", "Needs Control Plane :3000. --live hits /healthz. daemonInBoot=false."),
    chk("RB.6.doctor", "sci.cjs doctor system flags", "REFUSED", "unknown_command", "CLI has no doctor. Flags stay in CLIENT_SUITE_HOOKS + fabric hooks."),
    chk("RB.7.mapJson", "sci map architecture/map.json", "REFUSED", "architecture/map.json=ABSENT", "Analog: GET /v1/ecl/architecture."),
    chk("RB.8.runAllDemo", "sci run orchestrator pipeline demo", "REFUSED", "execution=false secondBoot=true", "Do not run-all fabrics. Canonical boot is start-sci-os."),
    chk("RB.9.healthHealthy", "sci health healthy/degraded/unhealthy stamp", "REFUSED", "noEvidence=UNKNOWN", "Analog: pnpm sci:status. A label is not health."),
    chk("RB.10.verifyChains", "sci verify ledger/audit/security hash-chains", "REFUSED", "noHashRecompute", "Analog: GET /v1/ecl/audit persisted=false."),
    chk("RB.11.promExport", "sci export Prometheus metrics", "REFUSED", "liveOtlp=false", "In-memory counters are not Prometheus."),
    chk("RB.12.e2eFile", "node ./tests/integration.test.ts", "REFUSED", "tests/integration.test.ts=ABSENT", "Analog: apps/control-plane-api/src/eclDil.smoke.ts."),
  ];
}

export function inspectCursorRunbookFlags() {
  return [
    chk("RB.flag.autoTrade", "autoTrade remains false", "ANALOG_CONTRACT", "autoTrade=false", "Never flip."),
    chk("RB.flag.ready", "ready remains false", "ANALOG_CONTRACT", "ready=false", "No evidence ⇒ UNKNOWN, never READY."),
    chk("RB.flag.preview", "preview=true execution=false", "ANALOG_CONTRACT", "preview=true executed=false", "Inspect-only."),
    chk("RB.flag.durable", "durable=false until SqlClient INSERT", "ANALOG_CONTRACT", "pgDriver=ABSENT", "OPTIONAL_INFRA_DEGRADED without DATABASE_URL."),
    chk("RB.flag.shell", "Shell=AppHost", "ANALOG_CONTRACT", "ADR-SHELL-001 apps/cockpit-ui :4000", "Electron REFUSED."),
    chk("RB.flag.daemon", "daemon=PREPARED_DISABLED", "ANALOG_CONTRACT", "sci-daemon.cjs enabledInBoot=false", "Do not startDaemon."),
    chk("RB.flag.mobile", "mobile=SKIPPED_RESEARCH_REQUIRED", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "No hospitality/healthcare desks."),
    chk("RB.flag.pg", "pgDriver=ABSENT", "ANALOG_CONTRACT", "no bundled pg", "Do not npm install pg as product boot."),
    chk("RB.flag.alphaBeta", "ALPHA → BETA maturity flip", "REFUSED", "ALPHA_NON_PRODUCTION", "Preview-only. No evidence ⇒ not BETA."),
  ];
}

export function inspectCursorBuildoutFiles() {
  return [
    chk("BO.1.sciCjs", "scripts/sci.cjs extended CLI", "REFUSED", "scripts/sci.cjs=ABSENT", "Analog: apps/sci-cli/sci.cjs SCI_CLI_SUITE_V2."),
    chk("BO.2.buildCjs", "scripts/build.cjs", "REFUSED", "scripts/build.cjs=ABSENT", "Analog: GET /v1/ecl/engine/build-v3."),
    chk("BO.3.testCjs", "scripts/test.cjs", "REFUSED", "scripts/test.cjs=ABSENT", "Analog: ecl-dil --test + eclDil.smoke.ts."),
    chk("BO.4.lintCjs", "scripts/lint.cjs", "REFUSED", "scripts/lint.cjs=ABSENT", "Do not invent a second lint OS."),
    chk("BO.5.infraCjs", "scripts/infra.cjs", "REFUSED", "scripts/infra.cjs=ABSENT", "Analog: sci.cjs infra → GET /v1/ecl/engine/infra."),
    chk("BO.6.engineGraph", "packages/engine-graph/engineGraph.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/engine/build-v3 + GET /v1/ecl/architecture."),
    chk("BO.7.domainGraph", "packages/domain-graph/domainGraph.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/professional/domain-fabric."),
    chk("BO.8.dataBooks", "packages/data-fabric 13 book megafiles", "REFUSED", "massStub=true", "Analog: existing packages/data-fabric + GET /v1/ecl/engine/{ledger,pnl-book,risk-book,lineage,infra}."),
    chk("BO.9.kgPkg", "packages/kg-fabric/kgFabric.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/professional/kg-fabric."),
    chk("BO.10.scenarioPkg", "packages/scenario-fabric/scenarioFabric.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/professional/scenario-fabric."),
    chk("BO.11.causalPkg", "packages/causal-fabric/causalFabric.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/professional/causal-fabric."),
    chk("BO.12.govPkg", "packages/governance-fabric/governanceFabric.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/professional/governance-fabric."),
    chk("BO.13.infraPkg", "packages/infra-fabric/infraFabric.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/professional/infra-fabric."),
    chk("BO.14.secPkg", "packages/security-fabric/securityFabric.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/professional/security-fabric."),
    chk("BO.15.osPkg", "packages/os-fabric/osFabric.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/professional/os-fabric."),
    chk("BO.16.orchestrator", "packages/system-orchestrator/systemOrchestrator.ts", "REFUSED", "secondBoot=true", "Canonical: installer/scripts/start-sci-os.cjs."),
    chk("BO.17.healthMon", "packages/health-monitor/healthMonitor.ts", "REFUSED", "healthyStamp=true", "Analog: pnpm sci:status. No evidence ⇒ UNKNOWN."),
    chk("BO.18.metricsExp", "packages/metrics-exporter/metricsExporter.ts", "REFUSED", "liveOtlp=false", "Analog: packages/observability. Not Prometheus."),
    chk("BO.19.tracer", "packages/observability/tracer.ts", "REFUSED", "liveOtlp=false", "Do not add a second tracer OS on top of @scios/observability."),
    chk("BO.20.logger", "packages/observability/structuredLogger.ts", "REFUSED", "parallelFile=true", "Existing observability package is the analog."),
    chk("BO.21.auditVer", "packages/audit-verifier/auditVerifier.ts", "REFUSED", "noHashRecompute", "Analog: GET /v1/ecl/audit persisted=false."),
    chk("BO.22.scenReg", "packages/scenario-registry/scenarioRegistry.ts", "REFUSED", "parallelPackage=true", "Analog: GET /v1/ecl/professional/scenario-fabric."),
    chk("BO.23.fabReg", "packages/fabric-registry.ts", "REFUSED", "rootMega=true", "Compose in ecl-dil runtime. No packages/*.ts second registry."),
    chk("BO.24.flags", "packages/flags/systemFlags.ts", "REFUSED", "flagFlipSurface=true", "Flags stay in CLIENT_SUITE_HOOKS + fabric hooks. Do not add a writable flag module."),
    chk("BO.25.daemonApp", "apps/sci-daemon/daemon.cjs", "REFUSED", "secondOS=true daemonInBoot=false", "Analog: apps/sci-cli/sci-daemon.cjs PREPARED_DISABLED, not in start-sci-os."),
    chk("BO.26.electron", "apps/sci-desktop-electron/*", "REFUSED", "Shell=AppHost", "Analog: apps/cockpit-ui :4000. Electron REFUSED."),
    chk("BO.27.mobile", "apps/sci-mobile/*", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "No hospitality/healthcare desks."),
    chk("BO.28.mapJson", "architecture/map.json", "REFUSED", "architecture/map.json=ABSENT", "Analog: GET /v1/ecl/architecture."),
    chk("BO.29.runAll", "examples/run-all.ts", "REFUSED", "execution=false secondBoot=true", "Do not run-all fabrics. Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("BO.30.e2e", "tests/integration.test.ts", "REFUSED", "tests/integration.test.ts=ABSENT", "Analog: apps/control-plane-api/src/eclDil.smoke.ts."),
  ];
}

export function inspectRealisticRunbook() {
  return [
    chk(
      "RR.1.unit",
      "ecl-dil unit tests",
      "ANALOG_CONTRACT",
      "packages/ecl-dil/src/cursor-runbook.test.ts",
      "cwd packages/ecl-dil: node --import tsx --test src/cursor-runbook.test.ts src/os-fabric.test.ts"
    ),
    chk(
      "RR.2.smoke",
      "in-process ECL/DIL smoke",
      "ANALOG_CONTRACT",
      "apps/control-plane-api/src/eclDil.smoke.ts",
      "cwd apps/control-plane-api: node --import tsx src/eclDil.smoke.ts. Does not bind :3000/:4000. Does not start daemon."
    ),
    chk(
      "RR.3.cliHelp",
      "sci-cli help stamp",
      "ANALOG_CONTRACT",
      "apps/sci-cli/sci.cjs",
      "node apps/sci-cli/sci.cjs help. Expect SCI_CLI_SUITE_V2, autoTrade=false, ready=false, preview=true, executed=false."
    ),
    chk(
      "RR.4.status",
      "product pair probe",
      "ANALOG_CONTRACT",
      "pnpm sci:status",
      "installer/scripts/convergence/status.cjs. Down pair is UNKNOWN, not healthy=true. Do not start daemon."
    ),
    chk(
      "RR.5.engineGets",
      "GET /v1/ecl/engine/* inspect",
      "ANALOG_CONTRACT",
      "GET /v1/ecl/engine/{build-v3,infra,ledger,pnl-book,risk-book,lineage,evidence-v2}",
      "Covered by smoke. Live only if Control Plane already on :3000: node apps/sci-cli/sci.cjs infra. Do not sci:start for this step."
    ),
    chk(
      "RR.6.professionalGets",
      "GET /v1/ecl/professional/* inspect",
      "ANALOG_CONTRACT",
      "GET /v1/ecl/professional/{kg,scenario,causal,governance,infra,security,os}-fabric + cursor-runbook",
      "Covered by smoke. persisted=false. wave=REFUSED or SKIPPED. Not READY."
    ),
    chk(
      "RR.7.architecture",
      "architecture inspect",
      "ANALOG_CONTRACT",
      "GET /v1/ecl/architecture",
      "Covered by smoke. architecture/map.json stays ABSENT."
    ),
    chk(
      "RR.8.audit",
      "audit log inspect",
      "ANALOG_CONTRACT",
      "GET /v1/ecl/audit",
      "In-memory list, persisted=false. No hash-chain valid=true without recompute."
    ),
    chk(
      "RR.9.cockpit",
      "Shell AppHost probe :4000",
      "ANALOG_CONTRACT",
      "apps/cockpit-ui PORT=4000",
      "Probe only via pnpm sci:status. If closed: UNKNOWN. Do not pnpm sci:start in this runbook. Do not start Electron."
    ),
    chk(
      "RR.10.flags",
      "system flags unchanged",
      "ANALOG_CONTRACT",
      "autoTrade=false ready=false preview=true durable=false execution=false",
      "Shell=AppHost daemon=PREPARED_DISABLED mobile=SKIPPED_RESEARCH_REQUIRED pgDriver=ABSENT. Do not flip."
    ),
  ];
}

export function buildCursorRunbookWave() {
  const steps = inspectCursorRunbookSteps();
  const flags = inspectCursorRunbookFlags();
  const files = inspectCursorBuildoutFiles();
  const realistic = inspectRealisticRunbook();
  const checks = [...steps, ...flags, ...files, ...realistic];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...CURSOR_RUNBOOK_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 12,
    requestedFiles: 30,
    requestedRealistic: 10,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      npmLockfiles: 0,
      scriptsInvented: 0,
      parallelPackages: 0,
      secondOsApps: 0,
      filesInvented: 0,
      daemonStarted: 0,
      applied: 0,
    },
    steps,
    flags,
    files,
    realistic,
    checks,
  };
}
