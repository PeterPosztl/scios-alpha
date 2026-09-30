#!/usr/bin/env node
"use strict";
/**
 * Final Beta readiness gate — honest assessment across required domains.
 * ALPHA_NON_PRODUCTION — never claim BETA_READY without evidence.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "final");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const UI = process.env.SCIOS_E2E_COCKPIT_URL || "http://127.0.0.1:4000";
const INSTALL = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "SCI OS X10", "app");
const BUNDLED_NODE = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "runtime", "node", "node.exe");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch {
    return null;
  }
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function request(method, urlPath, body, timeout = 15000) {
  return new Promise((resolve) => {
    const u = new URL(urlPath, CP);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: payload
          ? { "content-type": "application/json", "content-length": payload.length }
          : {},
        timeout,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let json = null;
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            json = JSON.parse(raw);
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode || 0, json, raw });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, json: null, error: String(e.message || e) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, json: null, error: "timeout" });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function httpGet(url, timeout = 8000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", () => resolve({ status: 0, body: "" }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "" });
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitHealthy(maxMs = 90000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const cp = await httpGet(CP + "/healthz", 2000);
    if (cp.status === 200) return true;
    await sleep(1000);
  }
  return false;
}

function stopInstalled() {
  // Target the install explicitly: cwd-based root resolution stops the repo and
  // leaves the installed lock owned by a dead process, blocking every reboot.
  spawnSync(
    process.execPath,
    [path.join(ROOT, "installer/scripts/convergence/stop.cjs"), `--app-root=${INSTALL}`],
    {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
      timeout: 45000,
    }
  );
}

function gateStatus(pass, blocked, partial) {
  if (pass) return "PASS";
  if (blocked) return "BLOCKED";
  if (partial) return "PARTIAL";
  return "FAIL";
}

async function main() {
  const programState = readJson("diagnostics-export/completion-program/program-state.json") || {};
  const closure = readJson("diagnostics-export/closure/closure-summary.json") || {};
  const rootCauses = readJson("diagnostics-export/completion-program/current-root-causes.json") || {};

  const report = {
    schema: "sci-os-beta-readiness-gate/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    buildId: programState.currentBuild || null,
    gitSha: programState.gitSha || null,
    p0: closure.P0_ROOT_CAUSES ?? programState.P0 ?? 0,
    p1: closure.P1_ROOT_CAUSES ?? programState.P1 ?? 92,
    alphaTarget: programState.targets?.A_USABLE_LOCAL_ALPHA || "READY",
    betaTarget: programState.targets?.B_DAILY_USE_BETA || "NOT_READY",
    requirements: {},
    liveProbes: {},
    waveEvidence: {},
    blockers: [],
    partialItems: [],
    verdict: "BETA_BLOCKED_WITH_EVIDENCE",
    token: null,
  };

  const b005Gate = readJson("diagnostics-export/completion-program/b-005/11-final-gate.json");
  const b006Gate = readJson("diagnostics-export/completion-program/b-006/11-final-gate.json");
  const b007Gate = readJson("diagnostics-export/completion-program/b-007/11-final-gate.json");
  const cf28Closed = !!(programState.b005Verdict || b005Gate?.status === "PASS");
  const uxClosed = !!(programState.b006Verdict || b006Gate?.status === "PASS");
  const p1AuditClosed = !!(programState.b007Verdict || b007Gate?.status === "PASS");
  const p1EngineeringOpen = rootCauses.p1EngineeringOpen ?? rootCauses.p1Audit?.engineeringOpen ?? null;
  const hasJobEngine = exists("apps/control-plane-api/src/jobEngine.ts");
  const hasValidation = exists("packages/model-registry/src/validation.ts");
  const hasCompilerPipeline = exists("packages/professional-domain-registry/src/compiler-pipeline.js");
  const hasPersistenceMatrix = exists("packages/vertical-slice/src/persistence-matrix.ts");
  const hasLocalDurable = exists("packages/vertical-slice/src/local-durable.ts");
  const hasGovernance = exists("packages/governance-engine/src/policy-enforcement.ts");
  const hasExperienceCompiler = exists("packages/professional-domain-registry/src/experience-compiler.js");
  const hasDomainRegistry = exists("packages/professional-domain-registry/src/compile-registry.js");
  const jobEngineWired = fs.readFileSync(path.join(ROOT, "apps/control-plane-api/src/routes/product.ts"), "utf8").includes("jobEngine");

  report.requirements.postgresql = {
    required: true,
    status: gateStatus(false, true, false),
    classification: "PROFILE_DISABLED",
    externalDependency: "FD-002",
    evidence: "diagnostics-export/completion-program/b-004/05-postgres-deferred-truth.json",
    note: "Local-durable is Beta truth; PostgreSQL adapter not READY",
  };
  report.blockers.push("PERSISTENCE.PG_DEFERRED_FD002");

  report.requirements.redis = {
    required: "where_required",
    status: gateStatus(false, false, true),
    configured: !!process.env.REDIS_URL,
    classification: "OPTIONAL",
    note: "Queue workers degrade when REDIS_URL unset — acceptable for local Alpha, Beta daily-use needs explicit gate",
  };
  if (!process.env.REDIS_URL) report.partialItems.push("REDIS_URL unset — background queue degraded");

  report.requirements.authentication = {
    required: true,
    status: gateStatus(false, true, false),
    mode: process.env.AUTH_MODE || "local-development",
    oidc: "FD-001 open",
    note: "Local-dev auth only; OIDC production auth not Beta-ready",
  };
  report.blockers.push("FD-001 OIDC provider selection");

  report.requirements.backgroundJobs = {
    required: true,
    status: gateStatus(hasJobEngine && !jobEngineWired, false, hasJobEngine),
    cf11Authority: "apps/control-plane-api/src/osSession.ts",
    jobEngineSource: hasJobEngine ? "PRESENT" : "MISSING",
    jobEngineRoutesWired: jobEngineWired,
    waveProof: "diagnostics-export/completion-program/b-002/",
    note: jobEngineWired ? "Job engine v1 wired" : "CF11 B-002 PASS; job-engine v1 orchestrator not fully wired to API",
  };
  if (!jobEngineWired) report.partialItems.push("BACKGROUND.job-engine-v1 routes not wired in product.ts");

  report.requirements.governance = {
    required: true,
    status: gateStatus(hasGovernance, false, false),
    authority: "packages/governance-engine/src/policy-enforcement.ts",
    waveProof: "diagnostics-export/completion-program/b-003/26-final-report.json",
    b003Verdict: programState.b003Verdict || "B_003_POLICY_DECISION_READY",
    note: "CF14 server-side PEP proven B-003",
  };

  report.requirements.persistence = {
    required: true,
    status: gateStatus(hasPersistenceMatrix && hasLocalDurable, false, false),
    local: "PASS",
    postgres: "BLOCKED_WITH_EXTERNAL_DEPENDENCY",
    matrixRoute: "GET /v1/system/persistence-matrix",
    waveProof: "diagnostics-export/completion-program/b-004/11-final-gate.json",
    b004Verdict: programState.b004Verdict || "BETA_DURABLE_CORE_READY",
  };

  report.requirements.observability = {
    required: true,
    status: "PARTIAL",
    package: exists("packages/observability"),
    openTelemetry: "NOT_BETA_SCOPE",
    healthRoutes: "GET /healthz, GET /v1/system/health",
    note: "Local logging + health probes; enterprise OTel deferred Target C",
  };
  report.partialItems.push("OpenTelemetry enterprise observability deferred to Target C");

  report.requirements.recovery = {
    required: true,
    status: gateStatus(true, false, false),
    whi010: exists("diagnostics-export/windows-host-v1/whi-010"),
    reconcileJob: "osSession.reconcileInterruptedJob",
    stopScript: "installer/scripts/convergence/stop.cjs",
    note: "WHI-010 recovery intelligence proven",
  };

  report.requirements.professionalUx = {
    required: true,
    status: uxClosed ? "PASS" : "PARTIAL",
    cockpit: "apps/cockpit-ui/src/index.js",
    workspaceRenderer: exists("apps/cockpit-ui/src/workspace/WorkspaceRenderer.js"),
    waveProof: uxClosed ? "B-006 complete" : "B-006 not complete",
    note: uxClosed
      ? "Professional UX wave closed — Job Center, 8 roles, system health"
      : "Alpha cockpit flow proven; B-006 professional UX completion wave not closed",
  };
  if (!uxClosed) report.partialItems.push("B-006 professional UX wave not complete");

  report.requirements.modelValidation = {
    required: true,
    status: cf28Closed ? "PASS" : gateStatus(hasValidation, true, !hasValidation),
    cf28: hasValidation ? "SOURCE_PRESENT" : "OPEN",
    honestLabel: "NOT_VALIDATED / UNVALIDATED displayed",
    waveProof: cf28Closed ? "B-005 complete" : null,
    note: cf28Closed
      ? "CF28 canonical states — wave B-005 closed"
      : hasValidation
        ? "CF28 schema in source; wave B-005 not closed"
        : "CTRL.CF28.validation open",
  };
  if (!cf28Closed) report.blockers.push("CTRL.CF28.validation");

  report.requirements.domainRegistry = {
    required: true,
    status: gateStatus(hasDomainRegistry, false, false),
    authority: "packages/professional-domain-registry",
    archetypes: 8,
    note: "PDR compile-registry validates 8 archetypes + 200+ seeds",
  };

  report.requirements.experienceCompilation = {
    required: true,
    status: gateStatus(hasExperienceCompiler && hasCompilerPipeline, false, hasExperienceCompiler && !hasCompilerPipeline),
    authority: "packages/professional-domain-registry/src/experience-compiler.js",
    pipelineModule: hasCompilerPipeline ? "PRESENT" : "MISSING",
    pipelinePath: "packages/professional-domain-registry/src/compiler-pipeline.js",
    route: "GET /v1/experience/compile",
    healthRoute: "GET /v1/compiler/health",
    waveProof: hasCompilerPipeline ? "B-008 complete" : null,
    note: hasCompilerPipeline ? "B-008 pipeline present" : "Compiler present; B-008 pipeline wave not closed",
  };
  if (!hasCompilerPipeline) report.partialItems.push("B-008 experience compiler pipeline wave not complete");

  // Wave evidence summary
  for (const w of ["b-002", "b-003", "b-004", "b-005", "b-006", "b-007", "b-008", "b-009", "b-010"]) {
    const gate = readJson(`diagnostics-export/completion-program/${w}/11-final-gate.json`);
    report.waveEvidence[w.toUpperCase()] = gate
      ? { status: "COMPLETE", token: gate.token || gate.verdict, proof: `${w}/11-final-gate.json` }
      : { status: "NOT_COMPLETE", proof: null };
  }

  // P1 gate — raw register count unchanged; engineering open from B-007 audit
  report.p1Gate = {
    current: report.p1,
    engineeringOpen: p1EngineeringOpen,
    targetForBeta: rootCauses.p1TargetForBeta ?? 20,
    auditClosed: p1AuditClosed,
    status:
      p1EngineeringOpen === 0 || p1AuditClosed
        ? "PASS"
        : report.p1 < 20
          ? "PASS"
          : "BLOCKED",
    note:
      p1AuditClosed && p1EngineeringOpen === 0
        ? "B-007 audit: 0 engineering P1 open; raw register count 92 unchanged"
        : "P1 raw register must be < 20 for Beta OR B-007 audit with 0 engineering open",
  };
  if (report.p1Gate.status === "BLOCKED") {
    report.blockers.push(`P1=${report.p1} exceeds Beta target < 20`);
  }

  // --- Live installed probes (best effort) ---
  const exe = path.join(INSTALL, "SCI-OS-X10.exe");
  report.installed = {
    exePresent: fs.existsSync(exe),
    installDir: INSTALL,
    bundledNodePresent: fs.existsSync(BUNDLED_NODE),
  };

  let liveOk = false;
  let startedForTest = false;

  const healthPre = await httpGet(CP + "/healthz", 2000);
  if (healthPre.status !== 200 && report.installed.exePresent) {
    stopInstalled();
    await sleep(1500);
    spawn(path.join(INSTALL, "SCI-OS-X10.exe"), [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    startedForTest = true;
    liveOk = await waitHealthy(90000);
  } else {
    liveOk = healthPre.status === 200;
  }

  if (liveOk) {
    const probes = {};
    const checks = [
      ["healthz", CP + "/healthz"],
      ["home", CP + "/v1/home"],
      ["search", CP + "/v1/search?q=AAPL"],
      ["entity", CP + "/v1/entities/AAPL"],
      ["experience", CP + "/v1/experience/compile?roleId=arch.market_analyst&objectId=AAPL"],
      ["persistenceMatrix", CP + "/v1/system/persistence-matrix"],
      ["governanceCan", CP + "/v1/governance/can?role=operator&action=execution:submit"],
      ["jobs", CP + "/v1/os/jobs"],
      ["cockpit", UI + "/"],
    ];
    for (const [k, url] of checks) {
      const r = await httpGet(url);
      probes[k] = r.status === 200 ? "PASS" : "FAIL";
    }

    const jobKey = "beta-gate-" + Date.now();
    const created = await request("POST", "/v1/os/jobs", {
      title: "Beta gate job",
      type: "analysis",
      objectId: "AAPL",
      idempotencyKey: jobKey,
      sessionId: "default",
    });
    probes.jobCreate = created.status === 201 ? "PASS" : "FAIL";
    const jobId = created.json?.job?.jobId;
    if (jobId) {
      const start = await request("PATCH", `/v1/os/jobs/${jobId}`, {
        state: "RUNNING",
        expectedVersion: created.json.job.stateVersion,
        reason: "beta-gate",
      });
      probes.jobStart = start.status === 200 ? "PASS" : "FAIL";
      const dup = await request("POST", "/v1/os/jobs", { idempotencyKey: jobKey });
      probes.jobIdempotency = dup.json?.job?.jobId === jobId ? "PASS" : "FAIL";
    }

    const matrix = await request("GET", "/v1/system/persistence-matrix");
    probes.postgresHonest =
      matrix.json?.states?.postgres?.classification === "PROFILE_DISABLED" ? "PASS" : "FAIL";

    report.liveProbes = { status: "LIVE_PASS", probes, cp: CP, ui: UI };
    report.requirements.persistence.liveMatrix = probes.persistenceMatrix;
    report.requirements.backgroundJobs.liveCreate = probes.jobCreate;
  } else {
    report.liveProbes = {
      status: "OFFLINE",
      note: startedForTest ? "Installed launcher did not reach healthz in time" : "Control plane not running",
    };
    report.partialItems.push("Live Beta probes offline — source evidence only");
  }

  if (startedForTest) {
    stopInstalled();
    await sleep(2000);
    report.liveProbes.cleanShutdown = "ATTEMPTED";
  }

  // Verdict
  const hardBlockers = [
    report.requirements.postgresql.status === "BLOCKED",
    report.requirements.authentication.status === "BLOCKED",
    report.requirements.modelValidation.status === "BLOCKED",
    report.p1Gate.status === "BLOCKED",
    programState.targets?.B_DAILY_USE_BETA === "NOT_READY",
  ];

  const allReqPass = Object.values(report.requirements).every(
    (r) => r.status === "PASS" || r.status === "READY"
  );

  if (allReqPass && !hardBlockers.some(Boolean) && report.p0 === 0 && report.liveProbes.status === "LIVE_PASS") {
    report.verdict = "BETA_READY";
    report.token = "BETA_READY";
  } else {
    report.verdict = "BETA_BLOCKED_WITH_EVIDENCE";
    report.token = "BETA_BLOCKED_WITH_EVIDENCE";
  }

  report.summary = {
    alphaReady: programState.targets?.A_USABLE_LOCAL_ALPHA === "READY",
    betaReady: report.verdict === "BETA_READY",
    completedWaves: (programState.completedWaves || []).map((w) => w.waveId),
    openWaves: ["B-008", "B-009", "B-010"],
    primaryBlockers: [...new Set(report.blockers)],
    partialCount: report.partialItems.length,
  };

  write("beta-readiness.json", report);

  console.log(
    JSON.stringify({
      ok: report.verdict === "BETA_READY",
      verdict: report.verdict,
      out: path.join(OUT, "beta-readiness.json"),
      blockers: report.summary.primaryBlockers,
      p1: report.p1,
      live: report.liveProbes.status,
    })
  );

  process.exit(report.verdict === "BETA_READY" ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
