/**
 * Copilot 4-box contract catalog for DeepSeek 1–100.
 * Architecture maps onto the one Control Plane + Shell. Not a second OS.
 * ALPHA_NON_PRODUCTION. GET persisted=false. autoTrade=false. ready=false.
 */
import type { PhaseCoreResult } from "./phase-core.js";

export type BuildoutContract = {
  n: number;
  name: string;
  result: PhaseCoreResult;
  api: string;
  architecture: string;
  table: string;
  pipeline: string;
  orchestrator: string;
  next: string;
  autoTrade: false;
  ready: false;
  applied: false;
  preview: true;
};

function row(
  n: number,
  name: string,
  result: PhaseCoreResult,
  api: string,
  architecture: string,
  table: string,
  pipeline: string,
  orchestrator: string,
  next: string
): BuildoutContract {
  return {
    n,
    name,
    result,
    api,
    architecture,
    table,
    pipeline,
    orchestrator,
    next,
    autoTrade: false,
    ready: false,
    applied: false,
    preview: true,
  };
}

const ONE_BOOT = "start-sci-os.cjs / SCI-OS-Start.bat → CP :3000 + Shell :4000";
const AUDIT_MEM = "in-memory GET /v1/ecl/audit (persisted=false)";
const SQL = "packages/data-fabric/sql/ecl-engine-books-v1.sql (not applied; OPTIONAL_INFRA_DEGRADED)";
const LEDGER = "sci_ecl.ledger / pnl_book / risk_book — durable=true only after INSERT";
const NO_PG = "pgDriver=ABSENT → no live UPSERT";

/** DeepSeek 1–100 = Copilot 1–80 plus residual 81–100 plans. One row per module. */
export function buildoutContracts(): BuildoutContract[] {
  return [
    row(1, "continuous-audit-engine", "REFUSED", "POST /v1/ecl/engine/audit-eval", "packages/ecl-dil/src/engine-audit.ts", AUDIT_MEM, "request → evaluateAuditLimit → envelope", ONE_BOOT, "Keep analog eval. Do not flip autoAudit."),
    row(2, "continuous-limit-engine", "REFUSED", "POST /v1/ecl/engine/limit-eval", "packages/ecl-dil/src/engine-suite.ts evaluateLimitV1", "GuardrailLimits in-memory", "book metrics → UNKNOWN if missing → HOLD", ONE_BOOT, "No volatility auto-adjust. No ?? 0."),
    row(3, "freeze-hold-block-enforcement", "REFUSED", "decision ALLOW|HOLD|BLOCK (advisory)", "packages/ecl-dil/src/engine-suite.ts evaluateDecisionV1", "none", "FAIL→BLOCK UNKNOWN→HOLD PASS_CONSTRAINT→ALLOW", ONE_BOOT, "ALLOW is not an order. No account freeze."),
    row(4, "scenario-engine-v1", "REFUSED", "GET /v1/dil/scenario/:id", "packages/ecl-dil/src/engines.ts", "none", "simulated scenario read, autoTrade=false", ONE_BOOT, "No data-driven generator."),
    row(5, "scenario-registry", "SKIPPED_RESEARCH_REQUIRED", "GET /v1/ecl/professional/automation-prep", "packages/ecl-dil/src/automation-prep.ts", "none", "ABSENT catalogs ignore payload", ONE_BOOT, "No hospitality/healthcare SOP registry."),
    row(6, "causal-engine-v1", "REFUSED", "none (causalQueryEngine=ABSENT)", "packages/ecl-dil/src/os-blueprint-integration.ts", "none", "inspect only", ONE_BOOT, "Do-calculus placeholder 0 is not science."),
    row(7, "causal-query-api", "REFUSED", "GW1 GET /v1/lineage/:runId", "apps/control-plane-api lineage route", "none", "run proof, not ATE/CATE", ONE_BOOT, "Do not add a second causal API."),
    row(8, "causal-lineage-builder", "REFUSED", "GET /v1/ecl/engine/lineage", "packages/ecl-dil/src/engine-suite.ts evaluateLineageV1", "none", "analog labels", ONE_BOOT, "Not a durable causal fabric."),
    row(9, "national-kg-engine", "REFUSED", "GET /v1/ecl/engine/kg-v2", "packages/ecl-dil/src/engine-suite-v2.ts", "none", "in-memory registry overlay", ONE_BOOT, "nationalGraph=false."),
    row(10, "kg-durable-registry", "PREPARED_DISABLED", "POST /v1/ecl/engine/kg/registry", "engine-suite-v2 kg registry", NO_PG, "add node/edge in memory", ONE_BOOT, "durableKgRegistry=false until INSERT."),
    row(11, "kg-ingest-macro", "REFUSED", "none", "feeds.ts simulated_alpha", "none", "no live fetch loop", ONE_BOOT, "No macro ingest."),
    row(12, "kg-ingest-sector", "REFUSED", "none", "feeds.ts", "none", "no sector feed", ONE_BOOT, "No sector ingest."),
    row(13, "kg-ingest-news", "REFUSED", "none", "feeds.ts", "none", "no news loop", ONE_BOOT, "No news ingest."),
    row(14, "kg-ingest-hospitality", "SKIPPED_RESEARCH_REQUIRED", "GET /v1/ecl/professional/modules?professionId=hospitality", "profession-module-expansion.ts", "none", "ABSENT catalog ignores payload", ONE_BOOT, "Do not invent occupancy graph."),
    row(15, "kg-ingest-healthcare", "SKIPPED_RESEARCH_REQUIRED", "GET /v1/ecl/professional/modules?professionId=healthcare", "profession-module-expansion.ts", "none", "ABSENT + PHI=ABSENT", ONE_BOOT, "No EHR pipeline."),
    row(16, "kg-ingest-cyber", "REFUSED", "GET /v1/ecl/professional/os-blueprints?blueprintId=cyber", "os-blueprint-integration.ts", "none", "analog overlay, liveSiem=false", ONE_BOOT, "No certified threat-feed loop."),
    row(17, "kg-ingest-investment", "REFUSED", "GET /v1/dil/markets", "feeds.ts simulated_alpha", "none", "simulated snapshots", ONE_BOOT, "Not venue-certified market ingest."),
    row(18, "prediction-engine-v3", "REFUSED", "POST /v1/ecl/engine/prediction", "engine-suite.ts evaluatePredictionV1", "none", "model−implied, not live feature store", ONE_BOOT, "calibratedLive=false. No dummy 0.025."),
    row(19, "prediction-engine-v4", "REFUSED", "POST /v1/ecl/engine/prediction", "engine-suite.ts", "none", "single analog horizon", ONE_BOOT, "No calibrated ensemble."),
    row(20, "risk-engine-v3-ewma", "ANALOG_CONTRACT", "POST /v1/ecl/engine/risk-eval", "engine-suite.ts evaluateRiskV1", "session analog vol", "book → UNKNOWN if missing", ONE_BOOT, "Not live GARCH/EWMA."),
    row(21, "risk-engine-v4-book", "ANALOG_CONTRACT", "GET /v1/ecl/engine/risk-book", "engine-suite-v2.ts", LEDGER, "preview risk-book; skip non-finite", ONE_BOOT, "Invented VaR ratios refused."),
    row(22, "drawdown-engine-durable", "ANALOG_CONTRACT", "GET /v1/ecl/guardrail + session", "packages/ecl-dil/src/engines.ts maxDrawdown", "in-memory session", "peak/trough analog; no /0", ONE_BOOT, "UPSERT only after pg INSERT."),
    row(23, "exposure-engine-durable", "ANALOG_CONTRACT", "POST /v1/ecl/engine/limit-eval", "evaluateLimitV1 maxExposure", "book notional", "empty bySector ≠ padded", ONE_BOOT, "No exposure_book persist without pg."),
    row(24, "leverage-engine-durable", "ANALOG_CONTRACT", "POST /v1/ecl/engine/limit-eval", "evaluateLimitV1 maxLeverage", "bankroll margin/equity", "missing equity UNKNOWN", ONE_BOOT, "No gross/vol invention."),
    row(25, "dailyloss-engine-durable", "ANALOG_CONTRACT", "POST /v1/ecl/engine/limit-eval", "GuardrailLimits.maxDailyLoss", "absolute default 2500", "no 5% halt", ONE_BOOT, "Do not auto-halt accounts."),
    row(26, "cockpit-compute-v3", "REFUSED", "POST /v1/ecl/engine/cockpit-compute-v2", "engine-suite-v2.ts", "INSPECT_ONLY", "compose audit+limit+decision+preview", ONE_BOOT, "Do not flip COMPUTE."),
    row(27, "cockpit-compute-v4", "REFUSED", "POST /v1/ecl/engine/cockpit-compute", "engine-suite.ts", "INSPECT_ONLY", "V1 compose", ONE_BOOT, "No multi-engine orchestrator."),
    row(28, "decision-composer-durable", "REFUSED", "POST /v1/ecl/engine/decision", "evaluateDecisionV1", AUDIT_MEM, "FAIL BLOCK / UNKNOWN HOLD / PASS ALLOW", ONE_BOOT, "allPassed→execute refused."),
    row(29, "evidence-composer-durable", "ANALOG_CONTRACT", "GET /v1/ecl/engine/evidence-v2", "engine-suite-v2.ts", "ledger signals", "empty ≠ padded", ONE_BOOT, "causalRefs stay empty."),
    row(30, "lineage-composer-durable", "ANALOG_CONTRACT", "GET /v1/ecl/engine/lineage", "evaluateLineageV1 + GW1 runId", "none", "analog labels", ONE_BOOT, "No lineage_book INSERT without pg."),
    row(31, "risk-composer-durable", "ANALOG_CONTRACT", "GET /v1/ecl/engine/risk-book", "engine-suite-v2 aggregatePreviewBooks", LEDGER, "preview=true", ONE_BOOT, "durable after INSERT only."),
    row(32, "pnl-composer-durable", "ANALOG_CONTRACT", "GET /v1/ecl/engine/pnl-book", "engine-suite-v2.ts", LEDGER, "preview=true realized=false", ONE_BOOT, "Notional size×previewFillPrice."),
    row(33, "execution-engine-v2-preview", "ANALOG_CONTRACT", "POST /v1/ecl/engine/execution-sim", "evaluateExecutionSimV1", "none", "previewFillPrice executed=false", ONE_BOOT, "preview=false→filled refused."),
    row(34, "execution-engine-v3-multifill", "REFUSED", "POST /v1/ecl/engine/execution-sim", "evaluateExecutionSimV1", "none", "single preview slice", ONE_BOOT, "No marketImpact fills."),
    row(35, "durable-ledger-adapter", "PREPARED_DISABLED", "POST /v1/ledger/append", "packages/data-fabric/adapter/ecl-ledger-adapter.cjs", SQL, "memory + optional DAO dual-write", ONE_BOOT, "durable=true only after INSERT."),
    row(36, "ledger-retry-backoff", "PREPARED_DISABLED", "adapter withRetry delays 40/80/160", "ecl-ledger-adapter.cjs + ecl-ledger-dao.ts", SQL, "retry on connect; DRIVER_ABSENT otherwise", ONE_BOOT, "Not a second error OS."),
    row(37, "ledger-archival-pipeline", "REFUSED", "sci-daemon rotate-hint", "apps/sci-cli/sci-daemon.cjs", "append-only", "no DELETE from hot", ONE_BOOT, "Do not S3-delete history."),
    row(38, "ledger-integrity-checker", "REFUSED", "none", "no scan implemented", "UNKNOWN without scan", "do not return valid=true", ONE_BOOT, "No evidence ⇒ UNKNOWN."),
    row(39, "durable-pnl-book", "PREPARED_DISABLED", "GET /v1/pnl-book", "sci_ecl.pnl_book", LEDGER, "preview books", ONE_BOOT, "Not applied without Postgres."),
    row(40, "durable-risk-book", "PREPARED_DISABLED", "GET /v1/risk-book", "sci_ecl.risk_book", LEDGER, "skip non-finite", ONE_BOOT, "Not applied without Postgres."),
    row(41, "durable-lineage-book", "PREPARED_DISABLED", "GET /v1/ecl/engine/lineage", SQL, "none live", "prepared only", ONE_BOOT, "durableLineage=false."),
    row(42, "durable-evidence-book", "PREPARED_DISABLED", "GET /v1/ecl/engine/evidence-v2", SQL, "none live", "prepared only", ONE_BOOT, "durableEvidence=false."),
    row(43, "durable-kg-book", "PREPARED_DISABLED", "GET /v1/ecl/engine/kg-v2", SQL, "memory registry", "prepared only", ONE_BOOT, "durableKgRegistry=false."),
    row(44, "durable-compute-book", "REFUSED", "POST /v1/ecl/engine/cockpit-compute-v2", "INSPECT_ONLY", "do not persist UNKNOWN compute", "preview compose only", ONE_BOOT, "No compute_book of UNKNOWN series."),
    row(45, "durable-audit-log", "PREPARED_DISABLED", "GET /v1/ecl/audit", AUDIT_MEM, "session array", "GET must not mutate", ONE_BOOT, "Hash-chain fabric not shipped."),
    row(46, "durable-limit-log", "PREPARED_DISABLED", "POST /v1/ecl/engine/limit-eval", "in-memory", "advisory", "autoLimits=false", ONE_BOOT, "No limit_log INSERT."),
    row(47, "durable-scenario-log", "REFUSED", "GET /v1/dil/scenario/:id", "none", "no generator", "autoScenarios=false", ONE_BOOT, "No scenario_log."),
    row(48, "durable-causal-log", "REFUSED", "none", "causalQueryEngine=ABSENT", "none", "no do-calculus", ONE_BOOT, "No causal_log."),
    row(49, "durable-execution-log", "REFUSED", "POST /v1/ecl/engine/execution-sim", "preview only", "no fill blotter", "executed=false", ONE_BOOT, "No execution_log filled."),
    row(50, "durable-infra-log", "ANALOG_CONTRACT", "GET /v1/ecl/engine/infra", "durable-adapter.ts + client-suite.ts", "heartbeat json (optional)", "pgDriver ABSENT | PRESENT; daemon age", ONE_BOOT, "Not Prometheus."),
    row(51, "daemon-v1", "PREPARED_DISABLED", "node apps/sci-cli/sci-daemon.cjs", "sci-daemon.cjs + deploy/prepared/*.service", "sci-daemon-heartbeat.json", "PREPARED_DISABLED unless --service", "NOT start-sci-os", "daemonInBoot=false."),
    row(52, "daemon-heartbeat-api", "PREPARED_DISABLED", "GET /v1/ecl/engine/infra", "readDaemonHeartbeat()", "LOCALAPPDATA/SCI OS X10/state", "running if ageMs<90s", "NOT in boot", "Do not claim postgres/shell/cp true."),
    row(53, "daemon-pnl-recompute", "PREPARED_DISABLED", "HTTP GET /v1/pnl-book", "sci-daemon.cjs 30s tick", "preview book", "--service only", "NOT in boot", "Preview recompute, not persist-fill."),
    row(54, "daemon-ledger-rotate", "REFUSED", "rotate-hint", "sci-daemon.cjs", "append-only", "no delete", "NOT in boot", "Archive DELETE refused."),
    row(55, "daemon-kg-ingest", "REFUSED", "none", "sci-daemon.cjs", "none", "no live ingest loop", "NOT in boot", "No 300s feed."),
    row(56, "daemon-scenario-loop", "REFUSED", "none", "sci-daemon.cjs", "none", "autoScenarios=false", "NOT in boot", "HITL remains human."),
    row(57, "daemon-error-recovery", "REFUSED", "none", "autoRepair=PROPOSAL_ONLY", "none", "no LDA auto-patch", "NOT in boot", "Proposal only."),
    row(58, "daemon-shutdown", "PREPARED_DISABLED", "pnpm sci:stop", "start-sci-os SIGTERM", "none", "canonical orchestrator stop", ONE_BOOT, "Do not process.exit a second OS."),
    row(59, "daemon-cp-monitor", "REFUSED", "sci infra --live", "apps/sci-cli/sci.cjs", "probe fetch :3000/healthz", "UNKNOWN without fetch", "CLI, not boot", "checkCP()=>true refused."),
    row(60, "daemon-shell-monitor", "REFUSED", "sci infra --live", "apps/sci-cli/sci.cjs", "probe :4000", "UNKNOWN without fetch", "CLI, not boot", "checkShell()=>true refused."),
    row(61, "desktop-viewer-electron", "REFUSED", "none", "ADR-SHELL-001 apps/cockpit-ui", "none", "Shell is AppHost", ONE_BOOT, "No Electron boot."),
    row(62, "desktop-viewer-qt", "REFUSED", "none", "ADR-SHELL-001", "none", "no second host", ONE_BOOT, "No Qt boot."),
    row(63, "desktop-viewer-maui", "REFUSED", "none", "ADR-SHELL-001", "none", "no second host", ONE_BOOT, "No MAUI boot."),
    row(64, "desktop-cockpit-preview", "ANALOG_CONTRACT", "http://127.0.0.1:4000", "apps/cockpit-ui", "none", "one Shell", ONE_BOOT, "No Trade now. Ports 3000/4000 not 8080."),
    row(65, "desktop-ledger-viewer", "ANALOG_CONTRACT", "GET /v1/ledger", "cockpit + CLI sci ledger", LEDGER, "preview list", ONE_BOOT, "Not a second desktop app."),
    row(66, "desktop-pnl-risk-viewer", "ANALOG_CONTRACT", "GET /v1/pnl-book + /v1/risk-book", "cockpit + CLI", LEDGER, "preview=true", ONE_BOOT, "Not Electron panels."),
    row(67, "desktop-kg-lineage-viewer", "ANALOG_CONTRACT", "GET /v1/ecl/engine/kg-v2 + /lineage", "cockpit analog overlay", "memory", "Wave-1 overlay", ONE_BOOT, "Not Palantir."),
    row(68, "mobile-hospitality-desk", "SKIPPED_RESEARCH_REQUIRED", "none", "profession-module-expansion.ts", "none", "catalog ABSENT", "no mobile boot", "No rooms/ADR desk."),
    row(69, "mobile-healthcare-desk", "SKIPPED_RESEARCH_REQUIRED", "none", "profession-module-expansion.ts", "none", "PHI=ABSENT", "no mobile boot", "No clinical desk."),
    row(70, "mobile-cyber-desk", "REFUSED", "GET /v1/ecl/professional/os-blueprints", "one Cockpit", "none", "cyber analog on Shell", ONE_BOOT, "No four domain apps."),
    row(71, "mobile-investment-desk", "REFUSED", "GET /v1/ecl/workspace", "one Cockpit DIL", "none", "PCT-ROLE-COMPOSITION", ONE_BOOT, "No mobile investment OS."),
    row(72, "mobile-compute-preview", "SKIPPED_RESEARCH_REQUIRED", "POST /v1/ecl/engine/cockpit-compute-v2", "INSPECT_ONLY on Shell/CLI", "none", "desksCreated=0", "no mobile boot", "Use CP compose, not RN."),
    row(73, "mobile-kg-viewer", "SKIPPED_RESEARCH_REQUIRED", "GET /v1/ecl/engine/kg-v2", "Shell overlay", "none", "not shipped", "no mobile boot", "nationalGraph=false."),
    row(74, "mobile-ledger-viewer", "SKIPPED_RESEARCH_REQUIRED", "GET /v1/ledger", "CLI sci ledger", LEDGER, "not shipped mobile", "no mobile boot", "durable=false."),
    row(75, "mobile-infra-viewer", "SKIPPED_RESEARCH_REQUIRED", "GET /v1/ecl/engine/infra + sci infra", "apps/sci-cli/sci.cjs", "heartbeat optional", "ops CLI", "no mobile boot", "Not a mobile OS."),
    row(76, "hospitality-domain-catalog", "SKIPPED_RESEARCH_REQUIRED", "GET /v1/ecl/professional/modules", "profession-module-expansion.ts", "none", "ABSENT ignores payload", ONE_BOOT, "Do not invent RevPAR instruments."),
    row(77, "healthcare-domain-catalog", "SKIPPED_RESEARCH_REQUIRED", "GET /v1/ecl/professional/modules", "profession-module-expansion.ts", "none", "ABSENT + PHI", ONE_BOOT, "Do not invent bed/OR instruments."),
    row(78, "cyber-domain-catalog", "ANALOG_CONTRACT", "GET /v1/ecl/professional/os-blueprints", "os-blueprint-integration.ts", "none", "PARTIAL analog", ONE_BOOT, "Not a live SIEM catalog."),
    row(79, "investment-domain-catalog", "ANALOG_CONTRACT", "GET /v1/dil/markets + /v1/ecl/guardrail", "feeds.ts + schemas.ts", "simulated_alpha", "bankroll/guardrail analog", ONE_BOOT, "Not certified feeds."),
    row(80, "phi-sandbox", "SKIPPED_RESEARCH_REQUIRED", "none", "no PHI processor", "none", "do not tokenize invented records", ONE_BOOT, "enabled=true refused."),
    row(81, "domain-kg-hospitality", "SKIPPED_RESEARCH_REQUIRED", "none", "no ingest", "none", "ingested++ without fetch refused", ONE_BOOT, "Research required."),
    row(82, "domain-kg-healthcare", "SKIPPED_RESEARCH_REQUIRED", "none", "no EHR", "none", "no de-id pipeline", ONE_BOOT, "Research required."),
    row(83, "domain-kg-cyber", "REFUSED", "os-blueprints cyber", "analog overlay", "none", "liveSiem=false", ONE_BOOT, "No threat-feed upsert."),
    row(84, "domain-kg-investment", "REFUSED", "GET /v1/dil/markets", "simulated_alpha", "none", "not ingest", ONE_BOOT, "No filings/news loop."),
    row(85, "hitl-governance-v2", "ANALOG_CONTRACT", "POST /v1/ai/proposals/:id/review", "eclDil.ts proposals", AUDIT_MEM, "AGENT→PROPOSAL→HUMAN→DECISION", ONE_BOOT, "No second HITL bus."),
    row(86, "hitl-governance-v3", "REFUSED", "POST /v1/ai/proposals/:id/review", "ANALOG_CONTRACT", "none", "no clinician/ciso role matrix", ONE_BOOT, "Do not auto-approve large_trade."),
    row(87, "governance-audit-trail", "PREPARED_DISABLED", "GET /v1/ecl/audit", AUDIT_MEM, "in-memory", "GET persisted=false", ONE_BOOT, "No governance_audit table applied."),
    row(88, "governance-risk-rules", "ANALOG_CONTRACT", "POST /v1/ecl/engine/risk-eval", "GuardrailLimits + RiskBucket", "in-memory", "advisory", ONE_BOOT, "Not durable policy fabric."),
    row(89, "governance-limit-rules", "ANALOG_CONTRACT", "POST /v1/ecl/engine/limit-eval", "evaluateLimitV1", "in-memory", "autoLimits=false", ONE_BOOT, "Keep analog."),
    row(90, "governance-scenario-rules", "REFUSED", "GET /v1/dil/scenario/:id", "none", "no generator", "autoScenarios=false", ONE_BOOT, "No rule table."),
    row(91, "governance-causal-rules", "REFUSED", "none", "ABSENT", "none", "no do-calculus rules", ONE_BOOT, "No causal rules table."),
    row(92, "infra-engine-v2", "REFUSED", "GET /v1/ecl/engine/infra", "durable-adapter.ts", "heartbeat optional", "probe required; no status=up default", ONE_BOOT, "Self-declared up refused."),
    row(93, "infra-metrics-prometheus", "REFUSED", "local logs", "ENTERPRISE_HOOKS.otlp.enabled=false", "none", "OTLP ABSENT", ONE_BOOT, "Not product Prometheus."),
    row(94, "infra-error-recovery", "REFUSED", "none", "autoRepair=PROPOSAL_ONLY", "none", "no auto-patch", ONE_BOOT, "Proposal only."),
    row(95, "infra-degraded-mode", "ANALOG_CONTRACT", "GET /v1/ecl/engine/build-v3", "OPTIONAL_INFRA_DEGRADED", SQL, "boot without Postgres allowed", ONE_BOOT, "DEGRADED ≠ READY."),
    row(96, "infra-dependency-checker", "ANALOG_CONTRACT", "GET /v1/ecl/engine/infra", "pgDriverPresent + heartbeat", "none", "ABSENT until resolve('pg')", ONE_BOOT, "Probe, do not invent."),
    row(97, "infra-readiness-checker", "REFUSED", "GET /v1/ecl/engine/infra", "ready=false product stamp", "none", "OPTIONAL_INFRA_READY only after SELECT 1", ONE_BOOT, "readiness ready=true refused."),
    row(98, "security-sandbox", "PREPARED_DISABLED", "PolicyEngine live_execution=off", "ecl-dil policy", "none", "simulation only", ONE_BOOT, "Not isolate/quarantine product."),
    row(99, "security-audit", "PREPARED_DISABLED", "GET /v1/ecl/audit", AUDIT_MEM, "in-memory", "GET persisted=false", ONE_BOOT, "No security_audit INSERT."),
    row(100, "security-policy-engine", "ANALOG_CONTRACT", "PolicyEngine", "live_execution held off", "none", "default deny live trade", ONE_BOOT, "Empty invented policies ≠ IAM."),
  ];
}

export const COPILOT_BOXES = {
  engines: { id: 1 as const, items: [1, 21] as const, title: "Engines + KG + prediction/risk" },
  stateCompute: { id: 2 as const, items: [22, 34] as const, title: "State tracking + cockpit composers" },
  persistenceDaemon: { id: 3 as const, items: [35, 60] as const, title: "Durable books + daemon (not in boot)" },
  clientsGov: { id: 4 as const, items: [61, 100] as const, title: "Clients + domains + HITL + infra + security" },
} as const;

export function copilotResidualPlans(): BuildoutContract[] {
  return [
    row(81, "plan-alpha-to-beta", "REFUSED", "none", "ALPHA_NON_PRODUCTION", "none", "no BETA stamp", ONE_BOOT, "Fabric stays ALPHA_ADAPTER."),
    row(82, "plan-sci-os-x10-tree", "REFUSED", "none", "scios-alpha only", "none", "no src/phase1…phase8 package", ONE_BOOT, "Compose into ecl-dil."),
    row(83, "plan-100-markdown-files", "REFUSED", "GET /v1/ecl/professional/phase-core", "phase-core-contracts.ts", "none", "one catalog, not 100 docs", ONE_BOOT, "No mass stubs."),
    row(84, "plan-second-orchestrator", "REFUSED", "none", "ADR-BOOT-001", "none", "one start-sci-os", ONE_BOOT, "No engine graph runner."),
    row(85, "plan-electron-boot", "REFUSED", "none", "ADR-SHELL-001", "none", "Shell=AppHost", ONE_BOOT, "No desktop boot."),
    row(86, "plan-daemon-boot", "REFUSED", "sci-daemon.cjs", "PREPARED_DISABLED", "heartbeat optional", "not in start-sci-os", "NOT in boot", "Keep disabled."),
    row(87, "plan-mobile-boot", "REFUSED", "none", "PCT-ROLE-COMPOSITION", "none", "no RN host", "no mobile boot", "SKIPPED desks."),
    row(88, "plan-prometheus-otlp", "REFUSED", "none", "OTLP ABSENT", "none", "local logs", ONE_BOOT, "No product scrape."),
    row(89, "plan-apply-seals", "REFUSED", "GET /v1/ecl/professional/activation-pass", "activation-pass.ts", "none", "applied=NONE", ONE_BOOT, "No apply*Seal."),
    row(90, "plan-ultimate-master", "REFUSED", "applyUltimateMasterActivationSuite", "activation-pass.ts", "none", "requested only", ONE_BOOT, "No ULTIMATE_MASTER apply."),
    row(91, "plan-false-ready", "REFUSED", "none", "constitution no evidence⇒UNKNOWN", "none", "ready=false", ONE_BOOT, "Do not stamp READY."),
    row(92, "plan-auto-trade", "REFUSED", "envelope autoTrade=false", "all engine envelopes", "none", "executable=false", ONE_BOOT, "Human remains decision maker."),
    row(93, "plan-filled-persist", "REFUSED", "execution-sim", "executed=false", "none", "preview only", ONE_BOOT, "No fill blotter."),
    row(94, "plan-5pct-daily-halt", "REFUSED", "limit-eval", "maxDailyLoss absolute", "none", "no invented 0.05", ONE_BOOT, "No auto halt."),
    row(95, "plan-phi-tokenize", "SKIPPED_RESEARCH_REQUIRED", "none", "PHI=ABSENT", "none", "no sandbox", ONE_BOOT, "Do not fake healthcare."),
    row(96, "plan-national-graph", "REFUSED", "kg-v2", "nationalGraph=false", "none", "analog overlay", ONE_BOOT, "Not Palantir."),
    row(97, "plan-compute-mode-flip", "REFUSED", "cockpit-compute-v2", "INSPECT_ONLY", "none", "no COMPUTE stamp", ONE_BOOT, "Preview compose only."),
    row(98, "plan-hospitality-instruments", "SKIPPED_RESEARCH_REQUIRED", "modules", "ABSENT", "none", "ignore payload", ONE_BOOT, "Research required."),
    row(99, "plan-pg-required-boot", "REFUSED", "build-v3", "OPTIONAL_INFRA_DEGRADED", SQL, "boot without pg", ONE_BOOT, "Do not require pg."),
    row(100, "plan-default-healthy", "REFUSED", "engine/infra", "UNKNOWN without probe", "none", "no status=up default", ONE_BOOT, "No evidence ⇒ UNKNOWN."),
  ];
}

function sliceBox(all: BuildoutContract[], from: number, to: number) {
  return all.filter((r) => r.n >= from && r.n <= to);
}

export function buildCopilotBlueprintWave() {
  const deepseek = buildoutContracts();
  const residual = copilotResidualPlans();
  const fail = [...deepseek, ...residual].some((r) => r.result === "FAIL");
  return {
    schema: "sci-os-copilot-blueprints/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    ready: false as const,
    autoTrade: false as const,
    persisted: false as const,
    preview: true as const,
    durable: false as const,
    beta: false as const,
    filesWritten: 0 as const,
    parallelTree: false as const,
    note: "Four boxes map DeepSeek 1–100 onto existing analog APIs. Residual Copilot 81–100 are refuse-plans, not extra engines. No sci-os-x10/ tree.",
    boxes: {
      box1: { ...COPILOT_BOXES.engines, rows: sliceBox(deepseek, 1, 21) },
      box2: { ...COPILOT_BOXES.stateCompute, rows: sliceBox(deepseek, 22, 34) },
      box3: { ...COPILOT_BOXES.persistenceDaemon, rows: sliceBox(deepseek, 35, 60) },
      box4: { ...COPILOT_BOXES.clientsGov, rows: sliceBox(deepseek, 61, 100) },
    },
    residual81to100: residual,
    deepseek,
  };
}
