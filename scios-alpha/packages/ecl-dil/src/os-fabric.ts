/**
 * SAFE inspect of requested OS FABRIC (daemon 300 + desktop 300 + mobile 300 + OS int 100).
 * Requested: src/os-fabric.ts + npx tsx, pg+dotenv, daemon loops in boot, Electron,
 * 4 domain desks, connectAll always-on, lrgReady true 16/16.
 * Actual analog: GET /v1/ecl/clients + GET /v1/ecl/engine/infra.
 * Daemon PREPARED_DISABLED (sci-daemon.cjs not in start-sci-os).
 * Desktop REFUSED (ADR-SHELL-001 Shell is AppHost). Mobile SKIPPED.
 * ALPHA_NON_PRODUCTION.
 */
export type OsFabricResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type OsFabricCheck = {
  id: string;
  requested: string;
  result: OsFabricResult;
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
  result: OsFabricResult,
  evidence: string,
  note: string
): OsFabricCheck {
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

export const OS_FABRIC_HOOKS = {
  schema: "sci-os-os-fabric/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoDecide: false as const,
  persisted: false as const,
  parallelTree: false as const,
  daemonInBoot: false as const,
  analogApi: "GET /v1/ecl/clients" as const,
  note: "OS-fabric 1–1000 inspect. No src/os-fabric.ts. Daemon stays PREPARED_DISABLED. Shell is AppHost. Not READY.",
};

export function inspectOsFabricPath() {
  return [
    chk("OF.path", "src/os-fabric.ts 1000-task file", "REFUSED", "massStub=true parallelOS=true", "Compose into ecl-dil analog. Do not add a second product file."),
    chk("OF.deps", "depends on pg + dotenv + all SCI OS ×10 fabrics", "REFUSED", "megaFiles=0 pgDriver=ABSENT", "Those files were refused. Do not require Pool at boot."),
    chk("OF.npxTsx", "npx tsx src/os-fabric.ts", "REFUSED", "secondBoot=true packageManager=pnpm", "Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("OF.entry", "new OSFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "One AppHost. OPTIONAL_INFRA_DEGRADED without DATABASE_URL."),
    chk("OF.npmInstall", "npm install pg dotenv typescript tsx", "REFUSED", "packageManager=pnpm pgDriver=ABSENT", "pnpm only. Do not add npm lockfile or required pg."),
  ];
}

export function inspectOsDaemon() {
  return [
    chk("OF1_300.startRunning", "DaemonCore.start state=running", "REFUSED", "daemonInBoot=false", "sci-daemon.cjs is PREPARED_DISABLED, not in start-sci-os."),
    chk("OF1_300.autoRecovery", "DEFAULT_DAEMON_CONFIG.autoRecovery=true", "REFUSED", "autoRepair=PROPOSAL_ONLY", "Do not auto-restart as an order."),
    chk("OF1_300.loopSuccess", "recompute/ingest/scenario status='success' after INSERT", "REFUSED", "noEvidence=UNKNOWN", "An INSERT is not a recompute."),
    chk("OF1_300.rotateDelete", "DELETE FROM os_rotation_queue INTERVAL SQL", "REFUSED", "append-only sqlInjection=true", "Do not delete ledger history. Do not interpolate SQL."),
    chk("OF1_300.recoveryResolvedTrue", "os_failures SET resolved=TRUE without repair", "REFUSED", "autoRepair=PROPOSAL_ONLY", "A flag flip is not recovery."),
    chk("OF1_300.setInterval", "DaemonLoopOrchestrator setInterval in boot", "REFUSED", "secondBoot=true", "Do not start a parallel daemon farm."),
    chk("OF1_300.engineInfra", "GET /v1/ecl/engine/infra daemon heartbeat", "ANALOG_CONTRACT", "enabledInBoot=false", "Prepared wrapper only. Not started by start-sci-os."),
  ];
}

export function inspectOsDesktop() {
  return [
    chk("OF301_600.electron", "DesktopViewerCore platform=electron", "REFUSED", "ADR-SHELL-001 Shell is AppHost", "Electron/Qt/MAUI would be a second host."),
    chk("OF301_600.mountTrue", "viewer.mount() mounted=true", "REFUSED", "viewer=NOT_SHIPPED", "A boolean is not a desktop app."),
    chk("OF301_600.lrgReadyTrue", "cockpit lrgReady/strictReady true 16/16 healthy", "REFUSED", "ready=false", "No evidence ⇒ UNKNOWN, never READY."),
    chk("OF301_600.inventedPnl", "pnl/VaR/exposure 1.25e6 as live panel", "REFUSED", "invented=true missing=UNKNOWN", "Empty VaR is UNKNOWN, never 0. Book maxExposure=25000."),
    chk("OF301_600.chainValidTrue", "audit panel chainValid=true default", "REFUSED", "noEvidence=UNKNOWN", "Default true is not integrity."),
    chk("OF301_600.clients", "GET /v1/ecl/clients desktop=REFUSED", "ANALOG_CONTRACT", "apps/cockpit-ui :4000", "Web Shell is the AppHost."),
  ];
}

export function inspectOsMobile() {
  return [
    chk("OF601_900.mobileMount", "MobileViewerCore.mount", "SKIPPED_RESEARCH_REQUIRED", "mobile=SKIPPED", "No mobile product surface in first release."),
    chk("OF601_900.hospitalityDesk", "MobileHospitalityDesk occupancy/adr", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent a hospitality desk."),
    chk("OF601_900.healthcareDesk", "MobileHealthcareDesk PHI compliance", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Do not invent a clinical desk."),
    chk("OF601_900.biometricTrue", "MobileBiometricAuth.authenticate success=true", "REFUSED", "noEvidence=UNKNOWN", "Enrolled Set is not biometrics."),
    chk("OF601_900.qrSimulated", "scanQRCode data=scan-simulated", "REFUSED", "noEvidence=UNKNOWN", "A stub string is not a camera."),
  ];
}

export function inspectOsIntegration() {
  return [
    chk("OF901_1000.cp8080", "ControlPlaneIntegration endpoint :8080", "REFUSED", "canonicalPort=:3000", "Control Plane is :3000. Do not invent :8080."),
    chk("OF901_1000.connectTrue", "connect() connected=true without HTTP", "REFUSED", "noEvidence=UNKNOWN", "A flag is not a ping."),
    chk("OF901_1000.alwaysOn4", "connectAll +4 always-on integrations", "REFUSED", "noEvidence=UNKNOWN", "Do not count unprobed components as connected."),
    chk("OF901_1000.shellExit0", "ShellIntegration.execute exitCode=0 simulated", "REFUSED", "noEvidence=UNKNOWN", "Simulated stdout is not a command."),
    chk("OF901_1000.infraHealthyTrue", "InfraIntegration.register healthy=true", "REFUSED", "noEvidence=UNKNOWN", "Hardcoded healthy is not a probe."),
    chk("OF901_1000.healthEveryConnected", "healthCheck every connected → healthy=true", "REFUSED", "noEvidence=UNKNOWN", "A count is not OS health."),
    chk("OF901_1000.mainRequire", "require.main === module OSFabric.main", "REFUSED", "secondBoot=true", "Canonical boot is start-sci-os."),
  ];
}

export function inspectOsFabricBoot() {
  return [
    chk("OF7.postgresCtor", "new OSFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "Do not require Pool at boot."),
    chk("OF7.initialize", "initialize() runAll migrations", "PREPARED_DISABLED", "GET /v1/ecl/engine/infra", "Session analog. Not applied SQL."),
    chk("OF7.startDaemon", "fabric.startDaemon() setInterval loops", "REFUSED", "daemonInBoot=false", "sci-daemon.cjs is not in start-sci-os."),
    chk("OF7.recomputeRun", "daemon.recompute.run status=success", "REFUSED", "executed=false", "PnL/risk analog is GET /v1/ecl/engine/pnl-book."),
    chk("OF7.heartbeatBeat", "daemon.heartbeat.beat", "ANALOG_CONTRACT", "GET /v1/ecl/engine/infra enabledInBoot=false", "Prepared heartbeat only."),
    chk("OF7.desktopMount", "desktop.viewer.mount Electron", "REFUSED", "ADR-SHELL-001", "Shell is apps/cockpit-ui :4000."),
    chk("OF7.pnlUpdate", "DesktopPnlRiskPanel.update invented pnl/VaR", "REFUSED", "missing=UNKNOWN inventedExposure=1.25e6", "Do not stamp live P&L from demo numbers."),
    chk("OF7.mobileMount", "mobile.viewer.mount + registerDesk", "SKIPPED_RESEARCH_REQUIRED", "mobile=SKIPPED", "Investment analog stays GET, not a mobile desk."),
    chk("OF7.connectAll", "integration.orchestrator.connectAll", "REFUSED", "noEvidence=UNKNOWN", "Do not claim 6/6 connected without probes."),
    chk("OF7.lrgReadyDemo", "main() lrgReady true rocket 16/16", "REFUSED", "ready=false", "Do not print READY from a demo."),
    chk("OF7.pgPasswordSecret", "PG_PASSWORD ?? 'secret'", "REFUSED", "secretInSource=true", "Do not ship default secrets."),
    chk("OF7.mainWrites", "main() startDaemon + Electron + 4 desks + process.exit", "REFUSED", "secondBoot=true executed=false", "Do not run a demo as product boot."),
  ];
}

export function buildOsFabricWave() {
  const path = inspectOsFabricPath();
  const daemon = inspectOsDaemon();
  const desktop = inspectOsDesktop();
  const mobile = inspectOsMobile();
  const integration = inspectOsIntegration();
  const boot = inspectOsFabricBoot();
  const checks = [...path, ...daemon, ...desktop, ...mobile, ...integration, ...boot];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...OS_FABRIC_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 1000,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      daemonInBoot: 0,
      electronHosts: 0,
      liveDesks: 0,
      applied: 0,
      megaFiles: 0,
    },
    path,
    daemon,
    desktop,
    mobile,
    integration,
    boot,
    checks,
  };
}
