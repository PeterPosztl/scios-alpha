/**
 * SAFE inspect of requested LEDGER-CORE (1–100) + ARCHIVE (101–200).
 * Requested: src/ledger/core with pg Pool, DurableActivator.durable=true,
 * DELETE from hot after 90d, archive verify valid=true from COUNT.
 * Actual: analog in-memory ledger + optional DAO. durable=true only after INSERT.
 * pgDriver=ABSENT. Append-only. No second src/ledger tree.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT.
 */
import { DURABLE_ADAPTER_HOOKS } from "./durable-adapter.js";
import { BUILD_SUITE_V2_HOOKS } from "./engine-suite-v2.js";

export type LedgerCoreResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type LedgerCoreCheck = {
  id: string;
  requested: string;
  result: LedgerCoreResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
  durable: false;
};

function chk(
  id: string,
  requested: string,
  result: LedgerCoreResult,
  evidence: string,
  note: string
): LedgerCoreCheck {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false, applied: false, durable: false };
}

export const LEDGER_CORE_HOOKS = {
  schema: "sci-os-ledger-core/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  durable: false as const,
  persisted: false as const,
  pgRequired: false as const,
  parallelTree: false as const,
  appendOnly: true as const,
  analogApi: "POST /v1/ledger/append" as const,
  adapter: DURABLE_ADAPTER_HOOKS.canonicalAdapter,
  sql: "packages/data-fabric/sql/ecl-engine-books-v1.sql" as const,
  note: "Ledger-core 1–200 inspect. No src/ledger/core second package. durable=true only after INSERT. Hot DELETE refused. Not READY.",
};

export function inspectLedgerCoreWriter() {
  return [
    chk("LC1.writerPgPool", "LedgerCoreWriter constructor(pool: Pool)", "PREPARED_DISABLED", "pgDriver=ABSENT adapter=" + DURABLE_ADAPTER_HOOKS.canonicalAdapter, "Do not import pg as a required boot dep. Optional Function import only."),
    chk("LC2.validatorZeroCoerce", "debit ?? 0 + credit ?? 0", "REFUSED", "missing≠0", "Missing debit/credit is UNKNOWN, not a balanced zero."),
    chk("LC3.schemaValidator", "required domain/account/debit/credit", "ANALOG_CONTRACT", "engine-suite-v2 LedgerEntry", "In-memory append validates kind/instrument. GET persisted=false."),
    chk("LC4.txBoundary", "withTransaction BEGIN/COMMIT on Pool", "PREPARED_DISABLED", "DAO dual-write memory+optional INSERT", "No Pool without driver."),
    chk("LC5.pgAdapter", "LedgerPgAdapter pool.query", "PREPARED_DISABLED", DURABLE_ADAPTER_HOOKS.canonicalAdapter, "ALPHA adapter. durable=true only after INSERT."),
    chk("LC6.retry", "withRetry exponential 5 attempts", "PREPARED_DISABLED", "ecl-ledger-adapter.cjs withRetry 40/80/160", "Already analog. Not a second retry OS."),
    chk("LC7.memoryFallback", "InMemoryLedgerFallback", "ANALOG_CONTRACT", "BUILD_SUITE_V2 in-memory ledger durable=" + String(BUILD_SUITE_V2_HOOKS.durable), "Memory is the default, not a fallback after claiming durable=true."),
    chk("LC8.degradedFlagger", "LedgerDegradedModeFlagger", "ANALOG_CONTRACT", "OPTIONAL_INFRA_DEGRADED", "Boot without Postgres allowed. DEGRADED ≠ READY."),
    chk("LC9.durableActivatorTrue", "DurableActivator durable=true default", "REFUSED", "durable=false until INSERT", "Do not stamp durable by constructor default."),
    chk("LC10.durableFallback", "DurableFallback deactivate", "ANALOG_CONTRACT", "in-memory until INSERT", "Fallback is the current truth."),
  ];
}

export function inspectLedgerCoreAdvanced() {
  return [
    chk("LC11_20.connectionPool", "Pool min5 max20 healthCheck SELECT 1", "PREPARED_DISABLED", "OPTIONAL_INFRA_READY only after live SELECT 1", "healthCheck without probe is UNKNOWN, not false-as-PASS."),
    chk("LC21_30.integrityPrevOnly", "verify prev_hash chain valid=true", "REFUSED", "noHashRecompute", "Unrecomputed hashes are UNKNOWN. Empty table is not PASS."),
    chk("LC31_40.queryApi", "byAccount/byDomain live SQL", "ANALOG_CONTRACT", "GET /v1/ledger list memory", "Preview list. No ledger_entries table applied."),
    chk("LC41_50.metrics", "LedgerMetrics histograms", "PREPARED_DISABLED", "otlp.enabled=false", "Local logs. Not Prometheus."),
    chk("LC51_60.alerting", "slack/email/pagerduty", "REFUSED", "noAlertBus", "Do not invent a pager OS."),
    chk("LC61_70.auditHooks", "onWrite emit to 1s audit-engine", "REFUSED", "audit loopStarted=false", "Audit core is inspect-only."),
    chk("LC71_80.recovery", "replay/rebuild/repairBroken", "REFUSED", "append-only", "Do not rewrite hash history."),
    chk("LC81_90.export", "toJSON/toCSV from Pool", "PREPARED_DISABLED", "GET /v1/ledger", "Preview JSON via analog list. No pg dump."),
    chk("LC91_100.migrationsLedgerEntries", "CREATE ledger_entries applied", "PREPARED_DISABLED", "sci_ecl.ledger not ledger_entries", "Prepared SQL exists. Not applied. Kind DECISION|EXECUTION_PREVIEW."),
  ];
}

export function inspectLedgerArchive() {
  return [
    chk("LA101.archiveSchema", "CREATE ledger_archive applied", "PREPARED_DISABLED", "append-only sci_ecl.ledger", "Archive table is not applied."),
    chk("LA102.rotateDelete", "DELETE FROM ledger_entries after INSERT archive", "REFUSED", "append-only", "Rotate is a hint. Do not delete hot history."),
    chk("LA103.retention90", "hotDays=90 then delete", "REFUSED", "retentionDelete=false", "ALPHA keeps analog history in session memory."),
    chk("LA104.archiveVerifyCount", "valid=true from COUNT(*)", "REFUSED", "noEvidence=UNKNOWN", "A count is not integrity."),
    chk("LA105.archiveFallbackDisk", "write to disk if DB down", "PREPARED_DISABLED", "session memory buffer", "No second disk ledger OS."),
    chk("LA106_200.archiveExt", "scheduler runDaily DELETE", "REFUSED", "daemon rotate-hint only", "sci-daemon.cjs is PREPARED_DISABLED. Not in boot."),
  ];
}

export function inspectLedgerCorePath() {
  return [
    chk("LX.path", "src/ledger/core/index.ts second tree", "REFUSED", "parallelTree=false", "Compose into packages/ecl-dil + data-fabric adapter. No src/ledger package."),
    chk("LX.importPg", "import { Pool } from 'pg'", "REFUSED", "pgDriver=ABSENT", "Do not add pg as a required dependency."),
    chk("LX.sciOsX10File", "src/sci-os-x10.ts 1000-task file", "REFUSED", "massStub=true parallelOS=true", "Do not add a second product file. Compose into ecl-dil analog."),
    chk("LX.npmInit", "npm init + npm install pg", "REFUSED", "packageManager=pnpm", "pnpm is the only package manager. Do not add npm lockfiles or required pg."),
    chk("LX.dockerPostgresBoot", "docker run postgres:16 as product boot", "REFUSED", "OPTIONAL_INFRA_DEGRADED", "First-release boot does not require Postgres. Adapter is optional."),
    chk("LX.envSecrets", "PG_PASSWORD=secret in tree", "REFUSED", "noSecretsCommitted", "Do not commit credentials. Live PG is optional after explicit connect."),
  ];
}

export function inspectDurableFabricMegafile() {
  return [
    chk("F0.domainHospitalityHealthcare", "Domain hospitality|healthcare live", "SKIPPED_RESEARCH_REQUIRED", "catalogs=ABSENT", "Do not invent desks or PHI."),
    chk("F0.enforcementFreezeBlock", "EnforcementAction freeze|block", "REFUSED", "autoLimits=false", "Advisory FAIL is not freeze."),
    chk("F201_300.pnlBookLiveInsert", "PnLBookWriter INSERT via Pool", "ANALOG_CONTRACT", "GET /v1/pnl-book preview=true realized=false", "Notional preview. durable after INSERT only."),
    chk("F201_300.dailyLossPct", "DailyLossTracker lossPct", "ANALOG_CONTRACT", "GuardrailLimits.maxDailyLoss absolute", "startEquity=0 is UNKNOWN, not 0%."),
    chk("F301_400.riskVaREmptyZero", "VaRCalculator empty returns 0", "REFUSED", "empty=UNKNOWN", "No series ⇒ UNKNOWN, never 0 VaR."),
    chk("F301_400.leverageMissingZero", "equity>0 ? gross/equity : 0", "REFUSED", "missingEquity=UNKNOWN", "Missing equity is UNKNOWN, not 0 leverage."),
    chk("F301_400.ewmaLive", "RiskEWMAIntegrator lambda=0.94 live", "ANALOG_CONTRACT", "POST /v1/ecl/engine/risk-eval session", "Session analog vol. Not live GARCH."),
    chk("F401_500.lineageInsert", "LineageBookWriter INSERT", "ANALOG_CONTRACT", "GET /v1/ecl/engine/lineage", "Analog labels + GW1 runId. Not applied SQL."),
    chk("F401_500.causalIntegrator", "causal: refs", "REFUSED", "causalQueryEngine=ABSENT", "Prefixing strings is not do-calculus."),
    chk("F501_600.evidenceInsert", "EvidenceBookWriter INSERT", "ANALOG_CONTRACT", "GET /v1/ecl/engine/evidence-v2", "Ledger signals. Empty ≠ padded."),
    chk("F601_1000.remainder", "truncated 601–1000 in one file", "REFUSED", "emptyClasses=false", "Do not invent the remaining 400 as stubs. Analog V1/V2 remain."),
    chk("F601_700.kgBookCascade", "kg_edges ON DELETE CASCADE + causal type", "REFUSED", "nationalGraph=false", "Wave-1 analog overlay only. No Palantir graph fabric."),
    chk("F701_800.computePassedTrue", "ComputeAudit/Limit/RiskStage passed=true", "REFUSED", "noEvidence=UNKNOWN", "Stages must not self-declare PASS. INSPECT_ONLY compose remains."),
    chk("F701_800.secondOrchestrator", "ComputeOrchestrator engine graph", "REFUSED", "secondWorkflowEngine=false", "One start-sci-os. No fabric orchestrator."),
    chk("F801_900.auditLogLive", "AuditBookWriter INSERT hash-chain", "PREPARED_DISABLED", "GET /v1/ecl/audit persisted=false", "In-memory session audit. Not applied."),
    chk("F901_1000.limitSqlInterval", "INTERVAL '${minutes} minutes' interpolation", "REFUSED", "sqlInjection=true", "Do not interpolate SQL. Analog limit-eval stays parameterized."),
    chk("F901_1000.limitEnforcementLog", "logEnforcement action freeze", "REFUSED", "freeze=false", "Do not persist freeze as an order."),
    chk("F12.sciosFabricBoot", "SCIOSFabric.initialize + main()", "REFUSED", "secondBoot=true", "Canonical boot is start-sci-os / SCI-OS-Start.bat. Not sci-os-x10.ts."),
    chk("F13.healthBooksAllTrue", "healthCheck books all true", "REFUSED", "noEvidence=UNKNOWN", "SELECT 1 does not prove 10 books. Missing probe ⇒ UNKNOWN."),
    chk("F13.mainFreezeWrite", "main() limit freeze 1.2M vs 1e6", "REFUSED", "invented=1e6 autoTrade=false", "Bootstrap freeze write is not analog eval."),
  ];
}

export function buildLedgerCoreWave() {
  const writer = inspectLedgerCoreWriter();
  const advanced = inspectLedgerCoreAdvanced();
  const archive = inspectLedgerArchive();
  const path = inspectLedgerCorePath();
  const fabric = inspectDurableFabricMegafile();
  const checks = [...writer, ...advanced, ...archive, ...path, ...fabric];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...LEDGER_CORE_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 1000,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      durableStamps: 0,
      hotDeletes: 0,
      applied: 0,
      parallelPackages: 0,
      megaFiles: 0,
    },
    writer,
    advanced,
    archive,
    path,
    fabric,
    checks,
  };
}
