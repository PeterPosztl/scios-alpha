/**
 * Multi-client inventory — classify, do not fork a second OS.
 * Desktop/Electron stays out (Shell is AppHost). Hospitality/healthcare desks SKIPPED.
 * CLI váz is an ops tool. Daemon is PREPARED_DISABLED, not in canonical boot.
 * ALPHA_NON_PRODUCTION. autoTrade=false. Not READY.
 */
export const CLIENT_SUITE_HOOKS = {
  schema: "sci-os-client-suite/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  ready: false as const,
  autoTrade: false as const,
  secondShell: false as const,
  parallelOS: false as const,
  web: {
    status: "ALPHA" as const,
    surface: "apps/cockpit-ui :4000",
    preview: true as const,
    tradeNow: false as const,
  },
  backend: {
    status: "ALPHA" as const,
    surface: "apps/control-plane-api :3000",
    durableDefault: false as const,
    note: "Optional sci_ecl Postgres DAO. durable=true only after INSERT.",
  },
  durableLedger: {
    status: "PARTIAL" as const,
    schema: "packages/data-fabric/sql/ecl-engine-books-v1.sql",
    dao: "packages/ecl-dil/src/ecl-ledger-dao.ts",
    canonicalAdapter: "packages/data-fabric/adapter/ecl-ledger-adapter.cjs",
    enabled: false as const,
    livePostgresRequired: false as const,
    fabric: "ALPHA_ADAPTER" as const,
    betaFabric: false as const,
    note: "Schema + DAO + pool/retry adapter. pg driver not bundled. Boot remains OPTIONAL_INFRA_DEGRADED until live connect.",
  },
  daemon: {
    status: "PREPARED_DISABLED" as const,
    systemd: "deploy/prepared/sci-ecl-recompute.service",
    windowsService: "deploy/prepared/sci-ecl-recompute.winsw.xml",
    wrapper: "apps/sci-cli/sci-daemon.cjs",
    wiredIntoBoot: false as const,
    autoTrade: false as const,
    note: "HTTP recompute only. Heartbeat via LOCALAPPDATA state. Not started by start-sci-os. --service to loop.",
  },
  desktop: {
    status: "REFUSED" as const,
    reason: "ADR-SHELL-001: Shell is AppHost. Electron/Qt/MAUI would be a second host.",
    appHostOverride: false as const,
    viewerAllowed: false as const,
    viewer: "NOT_SHIPPED" as const,
    tradeNow: false as const,
  },
  cli: {
    status: "ALPHA" as const,
    bin: "sci",
    path: "apps/sci-cli/sci.cjs",
    tradingBot: false as const,
    suite: "SCI_CLI_SUITE_V2" as const,
    note: "SCI_CLI_SUITE_V2 ops preview: audit/limit/compute/ledger/pnl/risk/infra/explain/tail. Not a trading bot.",
  },
  mobile: {
    hospitality: { status: "SKIPPED_RESEARCH_REQUIRED" as const, deskCreated: false as const, catalog: "ABSENT" as const },
    healthcare: { status: "SKIPPED_RESEARCH_REQUIRED" as const, deskCreated: false as const, catalog: "ABSENT" as const },
    autoTrade: false as const,
  },
};

export function buildClientSuiteInventory() {
  return {
    ...CLIENT_SUITE_HOOKS,
    note: "One product, one boot, one Shell. Clients are preview surfaces. Daemon does not execute trades.",
  };
}
