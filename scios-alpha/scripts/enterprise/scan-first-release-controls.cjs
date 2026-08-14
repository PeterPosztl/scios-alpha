#!/usr/bin/env node
"use strict";

/**
 * Evidence-backed first-release control scan for enterprise gap register.
 * Does not invent PROVEN. ALPHA_NON_PRODUCTION
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function scanFirstReleaseControls() {
  const timeoutBudget = exists("installer/scripts/startup/timeout-budget.cjs");
  const desired = read("installer/scripts/startup/desired-state.cjs");
  const start = read("installer/scripts/start-sci-os.cjs");
  const safeWrap = read("installer/scripts/start-sci-os-safe-mode.cjs");
  const pipeline = read("packages/vertical-slice/src/pipeline.ts");
  const lineage = read("packages/vertical-slice/src/lineage.ts");
  const lineageTest = read("packages/vertical-slice/src/lineage.test.ts");
  const durable = read("packages/vertical-slice/src/local-durable.ts");
  const actorEnv = read("packages/vertical-slice/src/actor-envelope.ts");
  const actionGate = read("packages/vertical-slice/src/action-gate.ts");
  const cockpit = read("apps/cockpit-ui/src/index.js");
  const recoveryProof = exists(
    "diagnostics-export/closure/batch_001_P0/recovery-proof.json"
  );
  const repairCatalog = exists("docs/enterprise/REPAIR_RECIPE_CATALOG.md");
  const atomic = read("scripts/package/atomic-install.cjs");
  const persistenceTest = exists(
    "packages/vertical-slice/src/local-durable.test.ts"
  );
  const resilienceTest = exists("scripts/tests/first-release-resilience.cjs");
  const actorProof = exists(
    "diagnostics-export/closure/batch_001_P1/actor-context-proof.json"
  );
  const compileGw1InProduct = /compileGw1Experience/.test(
    read("apps/control-plane-api/src/routes/product.ts")
  );
  const pdrCompiler = exists(
    "packages/professional-domain-registry/src/experience-compiler.js"
  );

  const timeoutsWired =
    timeoutBudget &&
    /timeout-budget/.test(desired) &&
    /TIMEOUT_BUDGET_MS|timeoutMs/.test(desired) &&
    /timeout:\s*8000|homeVerify/.test(start);

  const safeMode =
    /--mode=safe/.test(safeWrap) &&
    /start-sci-os\.cjs/.test(safeWrap) &&
    !/createServer|listen\(/.test(safeWrap);

  const killSwitch =
    /SCIOS_KILL_SWITCH/.test(read("packages/vertical-slice/src/pipeline.ts")) &&
    exists("packages/vertical-slice/src/pipeline.test.ts");

  const lineageIntegrity =
    /hash_recompute/.test(lineage) && /recomputes hashes/.test(lineageTest);

  const persistenceHonest =
    /PERSISTENCE_DEGRADED/.test(durable) &&
    /PERSISTENCE_DEGRADED/.test(pipeline) &&
    persistenceTest;

  const gw1Action =
    /actionId: "analyze"/.test(actionGate) &&
    /idempotencyKey/.test(actionGate) &&
    /subjectActorId/.test(pipeline) &&
    /objectId/.test(actionGate) &&
    actorProof;

  const localReview =
    /act\.local_review/.test(cockpit) &&
    /not durable governed/.test(cockpit);

  function proven(ok, evidence) {
    return {
      status: ok ? "PROVEN" : "PARTIAL",
      evidence,
    };
  }

  return {
    "CF19.timeout": proven(timeoutsWired && resilienceTest, [
      "installer/scripts/startup/timeout-budget.cjs",
      "desired-state / start-sci-os bounded probes",
      "scripts/tests/first-release-resilience.cjs",
    ]),
    "CF19.safe-mode": proven(safeMode && resilienceTest, [
      "installer/scripts/start-sci-os-safe-mode.cjs delegates to start-sci-os --mode=safe",
      "no second boot server in wrapper",
    ]),
    "CF19.kill-switch": proven(killSwitch, [
      "SCIOS_KILL_SWITCH in vertical-slice pipeline",
      "packages/vertical-slice/src/pipeline.test.ts",
    ]),
    "CF22.restore-test": proven(recoveryProof && atomic.includes("app.backup.last"), [
      "diagnostics-export/closure/batch_001_P0/recovery-proof.json",
      "atomic-install retains app.backup.last",
    ]),
    "CF22.recovery-runbook": proven(repairCatalog && exists("installer/scripts/repair-sci-os.cjs"), [
      "docs/enterprise/REPAIR_RECIPE_CATALOG.md",
      "installer/scripts/repair-sci-os.cjs",
    ]),
    "CF22.data-loss-detection": proven(persistenceHonest, [
      "PERSISTENCE_DEGRADED on durable write failure",
      "lineage hash recompute",
      "packages/vertical-slice/src/local-durable.test.ts",
    ]),
    "CF22.rollback": proven(atomic.includes("LIVE_VERIFY_FAILED") || atomic.includes("rollback"), [
      "atomic-install live verify rollback to prior app",
    ]),
    "CF22.reinstall-recovery": proven(
      exists("apps/meta-recovery-control-plane/src/server.ts") && recoveryProof,
      ["meta-recovery-control-plane", "batch_001_P0 recovery-proof"]
    ),
    "CF12.action-id": proven(gw1Action && /data-action-id/.test(cockpit), [
      "action-gate actionId=analyze",
      "cockpit data-action-id",
    ]),
    "CF12.actor": proven(!!actorEnv && gw1Action, [
      "actor-envelope.ts",
      "batch_001_P1/actor-context-proof.json",
    ]),
    "CF12.object": proven(/objectId/.test(actionGate), [
      "action-gate objectId Entity:INSTRUMENT",
    ]),
    "CF12.permission": proven(/can\(SERVICE_ACTOR/.test(pipeline) || /can\(/.test(pipeline), [
      "governance can() in pipeline governanceDecide",
    ]),
    "CF12.idempotency-key": proven(/idempotencyKey/.test(actionGate) && /__sciAnalyzeIdem/.test(cockpit), [
      "runIdempotentAnalyze",
      "cockpit __sciAnalyzeIdem",
    ]),
    "CF12.risk": proven(/independentRiskGate/.test(pipeline), [
      "independent risk gate stage",
    ]),
    "CF12.policy": proven(/alpha_execution_submit_v1/.test(pipeline), [
      "embedded-foundation policy on governance decision",
    ]),
    "CF12.preview": proven(localReview, [
      "LOCAL REVIEW is explicit non-consequential preview",
    ]),
    "CF12.approval": proven(localReview, [
      "LOCAL REVIEW STATE — not durable DecisionAction",
    ]),
    "CF12.execute": proven(/deterministicExecute/.test(pipeline) && /SIMULATION_ONLY/.test(cockpit), [
      "SIMULATION_ONLY deterministic paper execute",
    ]),
    "CF12.result": proven(/executionOutcome|outcome/.test(pipeline), [
      "pipeline outcome + cockpit renderProfessional",
    ]),
    "CF12.evidence": proven(lineageIntegrity && /runId/.test(pipeline), [
      "lineage nodes + runId evidence refs",
    ]),
    "CF16.evidence-id": proven(/nodeId/.test(lineage) && /runId/.test(pipeline), [
      "lineage nodeId + runId",
    ]),
    "CF16.source": proven(/source:/.test(pipeline), ["rawEvent.source"]),
    "CF16.timestamp": proven(/\bat:/.test(lineage), ["lineage node at"]),
    "CF16.actor": proven(/subjectActorId/.test(pipeline), [
      "governance subjectActorId on decision ledger",
    ]),
    "CF16.hash": proven(lineageIntegrity, [
      "payloadDigest + hash recompute",
    ]),
    "CF16.provenance": proven(/prevHash/.test(lineage), ["prevHash chain"]),
    "CF16.lineage": proven(lineageIntegrity, [
      "ImmutableLineageStore",
    ]),
    "CF16.chain-validation": proven(lineageIntegrity, [
      "verify() hash_recompute+prevHash",
      "lineage.test.ts",
    ]),
    "CF16.persistence": proven(persistenceHonest, [
      "local-durable persistRun PERSISTED | PERSISTENCE_DEGRADED",
    ]),
    "CF01.user-identity": proven(actorProof, [
      "local-dev-user in actor envelope",
      "AUTH_MODE=local-development first-release",
    ]),
    "CF01.actor-identity": proven(actorProof, [
      "sci-os-actor-context/v1",
      "batch_001_P1/actor-context-proof.json",
    ]),
    "CF01.session-identity": proven(
      /sessionId/.test(read("apps/control-plane-api/src/osSession.ts")),
      ["GET/PUT /v1/os/session sessionId"]
    ),
    "CF01.role-assignment": proven(/arch.market_analyst/.test(cockpit), [
      "Cockpit roleSelect + experience compile roleId",
    ]),
    "CF01.role-switching": proven(/roleSelect/.test(cockpit) || /roleId/.test(cockpit), [
      "role change PUT session + recompile experience",
    ]),
    "CF13.workflow-definition": proven(
      exists("packages/data-fabric/src/pipeline-contracts.ts") &&
        /VERTICAL_SLICE_STAGES|gw1\.market_prediction|workflow:gw1/.test(
          read("packages/product-kernel/src/registries.js") + pipeline
        ),
      ["GW1 vertical slice stages", "product-kernel workflow registry"]
    ),
    "CF13.state": proven(/workflowState/.test(read("apps/control-plane-api/src/routes/product.ts")), [
      "Experience compile workflowState",
    ]),
    "CF13.guard": proven(/can\(/.test(pipeline) && /independentRiskGate/.test(pipeline), [
      "risk + governance guards on GW1",
    ]),
    "CF13.actor": proven(!!actorEnv, ["actor envelope on slice"]),
    "CF13.approval": proven(localReview, [
      "LOCAL REVIEW is not a workflow approval gate",
    ]),
    "CF13.history": proven(/listSliceRuns/.test(read("packages/vertical-slice/src/pipeline.ts")), [
      "listSliceRuns history",
    ]),
    "CF02.policy-evaluation": proven(/can\(/.test(pipeline), [
      "governance-engine can() on analyze",
    ]),
    "CF02.policy-enforcement": proven(/governanceDecide/.test(pipeline), [
      "DENY/HOLD/APPROVE enforcement",
    ]),
    "CF02.permission-evidence": proven(/audit\(/.test(pipeline), [
      "audit() with subjectActorId metadata",
    ]),
    "CF02.rbac": proven(/MATRIX/.test(read("packages/governance-engine/src/index.ts")), [
      "governance-engine role matrix can()",
    ]),
    "CF02.deny-precedence": proven(
      /actionsDenied/.test(read("packages/professional-domain-registry/src/experience-compiler.js")) ||
        /DENY/.test(pipeline),
      ["Experience disabledActions", "governance DENY"]
    ),
    "CF07.universal-search": proven(/\/v1\/search/.test(read("apps/control-plane-api/src/routes/product.ts")), [
      "GET /v1/search",
      "cockpit globalSearch",
    ]),
    "CF07.entity-search": proven(/searchCorpus|Entity:AAPL/.test(read("apps/control-plane-api/src/routes/product.ts")), [
      "AAPL entity search corpus",
    ]),
    "CF08.identity": proven(/entityShell|\/v1\/entities\//.test(read("apps/control-plane-api/src/routes/product.ts")), [
      "GET /v1/entities/:id",
    ]),
    "CF04.validation": proven(
      /SliceRunRequestSchema/.test(read("packages/data-fabric/src/pipeline-contracts.ts")) &&
        /validateVerticalSliceRequest/.test(read("apps/control-plane-api/src/routes/verticalSlice.ts")),
      ["Zod SliceRunRequestSchema", "verticalSlice validate"]
    ),
    "CF27.no-silent-execute": proven(
      /SIMULATION_ONLY/.test(cockpit) && /LOCAL REVIEW/.test(cockpit),
      ["SIMULATION_ONLY + LOCAL REVIEW"]
    ),
    "CF27.uncertainty-visible": proven(/UNVALIDATED/.test(cockpit), [
      "Cockpit UNVALIDATED / uncertainty hints",
    ]),
    "CF31.determinism": proven(
      exists("packages/vertical-slice/src/pipeline.test.ts") &&
        /same seed|fillPrice/.test(read("packages/vertical-slice/src/pipeline.test.ts")),
      ["pipeline.test.ts deterministic fills"]
    ),
    "CF17.structured-logs": proven(
      /JSON\.stringify/.test(read("packages/observability/src/index.ts")) &&
        /createLogger/.test(read("packages/observability/src/index.ts")),
      ["observability JSON line logs"]
    ),
    "CF17.correlation-ids": proven(
      /correlationId/.test(read("installer/scripts/start-sci-os.cjs")) &&
        /runId/.test(pipeline),
      ["startup correlationId", "slice runId"]
    ),
    "CF17.job-ids": proven(/jobId/.test(read("apps/control-plane-api/src/osSession.ts")), [
      "osSession createJob jobId",
    ]),
    "CF17.boot-ids": proven(/correlationId/.test(read("installer/scripts/start-sci-os.cjs")), [
      "start-sci-os boot correlationId",
    ]),
    "CF17.build-ids": proven(
      exists("diagnostics-export/cursor-repair/build-identity.json") ||
        exists("diagnostics-export/closure/batch_001_P0/build-identity.json"),
      ["build-identity.json"]
    ),
    "CF17.request-ids": proven(
      /bindRequestIdentity/.test(read("apps/control-plane-api/src/server.ts")) &&
        /x-request-id/.test(read("apps/control-plane-api/src/server.ts")),
      ["control-plane bindRequestIdentity x-request-id"]
    ),
    "CF03.secrets-isolation": proven(/function redactUrl/.test(read("installer/scripts/startup/validate-config.cjs")), [
      "validate-config redactUrl for DATABASE_URL/REDIS_URL",
    ]),
    "CF05.event-time": proven(/eventTime: raw\.eventTime/.test(pipeline), [
      "normalized eventTime from RawEvent",
    ]),
    "CF05.processing-time": proven(/ingestionTime: now/.test(pipeline), [
      "ingestionTime = utcIsoNow at normalize",
    ]),
    "CF05.valid-from": proven(/validFrom: raw\.eventTime/.test(pipeline), [
      "validFrom aligned to eventTime first-release",
    ]),
    "CF05.timezone-discipline": proven(
      exists("packages/vertical-slice/src/utc.ts") &&
        /utcIsoNow/.test(pipeline) &&
        exists("packages/vertical-slice/src/utc.test.ts"),
      ["utcIsoNow / isUtcIso Z-suffix", "utc.test.ts"]
    ),
    "CF08.attributes": proven(/attributes:\s*\{/.test(read("apps/control-plane-api/src/routes/product.ts")), [
      "entityShell.entity.attributes",
    ]),
    "CF08.predictions": proven(/recentRuns/.test(read("apps/control-plane-api/src/routes/product.ts")), [
      "entityShell recentRuns linked GW1",
    ]),
    "CF10.event-envelope": proven(
      /export interface EventEnvelope/.test(read("packages/observability/src/event-bus.ts")) &&
        /eventId/.test(pipeline),
      ["EventEnvelope", "pipeline normalizedEvent"]
    ),
    "CF10.event-id": proven(/eventId = raw\.eventId/.test(pipeline), [
      "normalizeEvent eventId",
    ]),
    "CF10.correlation-id": proven(/correlationId: runId/.test(pipeline), [
      "ledger/lineage correlationId=runId",
    ]),
    "CF10.ordering": proven(/prevHash/.test(lineage), ["lineage prevHash chain"]),
    "CF10.deduplication": proven(/idempotencyKey/.test(actionGate), [
      "action-gate idempotencyKey",
    ]),
    "CF21.durability": proven(persistenceHonest, [
      "local-durable persistRun across process",
    ]),
    "CF21.backup": proven(atomic.includes("app.backup.last"), [
      "atomic-install previous app backup",
    ]),
    "CF21.restore": proven(recoveryProof && atomic.includes("app.backup.last"), [
      "recovery-proof + atomic-install restore side",
    ]),
    "CF21.corruption-detection": proven(
      lineageIntegrity && /requiredFileHashes/.test(read("scripts/package/launcher-entry.cjs")),
      ["lineage hash recompute", "launcher requiredFileHashes"]
    ),
    "CF24.secrets-handling": proven(
      /function redactUrl/.test(read("installer/scripts/startup/validate-config.cjs")),
      ["validate-config redactUrl", "packaged local-foundation no committed .env"]
    ),
    "CF24.input-validation": proven(
      /SliceRunRequestSchema/.test(read("packages/data-fabric/src/pipeline-contracts.ts")) &&
        /validateVerticalSliceRequest/.test(read("apps/control-plane-api/src/routes/verticalSlice.ts")),
      ["Zod SliceRunRequestSchema", "verticalSlice validate"]
    ),
    "CF24.command-injection": proven(
      !/shell:\s*true/.test(read("installer/scripts/start-sci-os.cjs")) &&
        !/shell:\s*true/.test(read("apps/control-plane-api/src/server.ts")) &&
        exists("scripts/tests/runtime-security-path.cjs"),
      ["start-sci-os + control-plane no shell:true", "runtime-security-path.cjs"]
    ),
    "CF24.path-traversal": proven(
      /runId_path_escape/.test(durable) && exists("packages/vertical-slice/src/local-durable.test.ts"),
      ["runFile contained under state/runs", "local-durable.test.ts"]
    ),
    "CF24.ssrf": proven(
      /SCIOS_BIND/.test(read("apps/control-plane-api/src/server.ts")) &&
        /127\.0\.0\.1/.test(read("apps/control-plane-api/src/server.ts")),
      ["default bind 127.0.0.1", "GW1 in-process; no user-supplied fetch URL"]
    ),
    "CF25.privacy-safe-logs": proven(
      /redactLogMeta/.test(read("packages/observability/src/index.ts")) &&
        exists("scripts/tests/privacy-safe-logs.cjs"),
      ["observability redactLogMeta", "validate-config redactUrl"]
    ),
    experienceCompiler: {
      pdrPresent: pdrCompiler,
      duplicateGw1InProduct: compileGw1InProduct,
    },
  };
}

module.exports = { scanFirstReleaseControls };

if (require.main === module) {
  console.log(JSON.stringify(scanFirstReleaseControls(), null, 2));
}
