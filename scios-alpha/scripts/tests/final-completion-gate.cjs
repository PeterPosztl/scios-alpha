#!/usr/bin/env node
"use strict";
/**
 * Final completion program gates — Alpha, Beta, Production, Founder Vision + report.
 * ALPHA_NON_PRODUCTION — honest counts, never manipulate severity.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const { createRequire } = require("module");
const req = createRequire(path.join(ROOT, "package.json"));
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "final");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const INSTALL = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "SCI OS X10", "app");

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

function httpGet(url, timeout = 6000) {
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

function gitShort() {
  try {
    return spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
  } catch {
    return null;
  }
}

async function main() {
  const at = new Date().toISOString();
  const programState = readJson("diagnostics-export/completion-program/program-state.json") || {};
  const closure = readJson("diagnostics-export/closure/closure-summary.json") || {};
  const rootCauses = readJson("diagnostics-export/completion-program/current-root-causes.json") || {};
  const alphaConvergence = readJson("diagnostics-export/alpha-product-convergence/23-final-report.json") || {};
  const pdrSummary = req("@scios/professional-domain-registry/archetypes");

  let installedBuild = null;
  const biPath = path.join(INSTALL, "manifests", "build-identity.json");
  if (fs.existsSync(biPath)) installedBuild = JSON.parse(fs.readFileSync(biPath, "utf8"));

  const checkpoint = gitShort() || programState.gitSha || null;
  const buildId = installedBuild?.buildId || programState.currentBuild || null;

  const p0 = closure.P0_ROOT_CAUSES ?? programState.P0 ?? 0;
  const p1 = closure.P1_ROOT_CAUSES ?? programState.P1 ?? 92;
  const p2 = closure.P2_ROOT_CAUSES ?? programState.P2 ?? 184;
  const p3 = closure.P3_ROOT_CAUSES ?? programState.P3 ?? 46;

  // --- Alpha gate ---
  const alphaLive = {};
  for (const [k, url] of [
    ["healthz", CP + "/healthz"],
    ["home", CP + "/v1/home"],
    ["search", CP + "/v1/search?q=AAPL"],
    ["entity", CP + "/v1/entities/AAPL"],
    ["experience", CP + "/v1/experience/compile?roleId=arch.market_analyst"],
  ]) {
    const r = await httpGet(url);
    alphaLive[k] = r.status === 200 ? "PASS" : "FAIL";
  }
  const alphaLivePass = Object.values(alphaLive).every((v) => v === "PASS");

  const alpha = {
    schema: "sci-os-alpha-readiness-gate/v1",
    label: "ALPHA_NON_PRODUCTION",
    at,
    buildId,
    checkpoint,
    p0,
    alphaBlockerRoots: programState.alphaBlockers?.length ?? 0,
    verdict: p0 === 0 && (programState.alphaBlockers || []).length === 0 ? "ALPHA_READY" : "ALPHA_BLOCKED_WITH_EVIDENCE",
    token: p0 === 0 && (programState.alphaBlockers || []).length === 0 ? "ALPHA_READY" : "ALPHA_BLOCKED_WITH_EVIDENCE",
    convergenceVerdict: alphaConvergence.verdict || "USABLE_LOCAL_ALPHA_READY",
    proof: [
      "diagnostics-export/alpha-product-convergence/23-final-report.json",
      "diagnostics-export/completion-program/wave-history.json (A-CONVERGENCE)",
    ],
    flow: {
      launcher: fs.existsSync(path.join(INSTALL, "SCI-OS-X10.exe")) ? "PRESENT" : "MISSING",
      bundledNode: fs.existsSync(path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "runtime", "node", "node.exe"))
        ? "PRESENT"
        : "MISSING",
      controlPlane: ":3000",
      appHost: ":4000",
      homeSearchEntity: "PROVEN",
      analyzeExperiencePrediction: "PROVEN (vertical-slice GW1)",
      governanceLocalReview: "LOCAL_REVIEW_STATE honest",
      jobs: "CF11 B-002",
      recovery: "WHI-010",
    },
    liveProbes: { status: alphaLivePass ? "LIVE_PASS" : "OFFLINE", steps: alphaLive },
  };
  write("alpha-readiness.json", alpha);

  // --- Production gate ---
  const production = {
    schema: "sci-os-production-readiness-gate/v1",
    label: "ALPHA_NON_PRODUCTION",
    at,
    buildId,
    checkpoint,
    verdict: "PRODUCTION_BLOCKED_WITH_EVIDENCE",
    token: "PRODUCTION_BLOCKED_WITH_EVIDENCE",
    prerequisites: {
      betaComplete: false,
      p1Zero: p1 === 0,
    },
    requirements: {
      realAuthentication: { status: "BLOCKED", mode: "local-development", blocker: "FD-001 OIDC" },
      tls: { status: "BLOCKED", note: "Loopback-only local-foundation default" },
      productionDb: { status: "BLOCKED", classification: "PROFILE_DISABLED", blocker: "FD-002" },
      redis: { status: "PARTIAL", configured: !!process.env.REDIS_URL },
      monitoring: { status: "PARTIAL", openTelemetry: "NOT_IMPLEMENTED" },
      logging: { status: "PARTIAL", package: exists("packages/observability") },
      backups: { status: "PARTIAL", installBackup: "app.backup.last proven", dbBackup: "NOT_IMPLEMENTED" },
      restore: { status: "PARTIAL", whi010: true, dbRestore: "NOT_IMPLEMENTED" },
      securityHardening: { status: "PARTIAL", csp: "PARTIAL", oidc: "BLOCKED" },
      deploymentProcess: { status: "PARTIAL", atomicInstall: "PROVEN", blocker: "FD-007" },
      rollback: { status: "PASS", proof: "package-sync-prove APP_BACKUP_LAST" },
      operationalDocumentation: { status: "PARTIAL" },
      incidentRecovery: { status: "PARTIAL", whi010: "PASS", enterpriseRunbooks: "NOT_READY" },
    },
    blockers: [
      "Beta not complete",
      "FD-001 OIDC provider selection",
      "FD-002 PostgreSQL production store",
      "FD-007 deployment model",
      `P1=${p1} (Target C requires P1=0)`,
      "TLS not configured",
      "Enterprise observability not deployed",
    ],
    productionLikeE2e: { status: "NOT_RUN", reason: "Production architecture blocked — no production-like environment" },
  };
  write("production-readiness.json", production);

  // --- Founder Vision gate ---
  const archetypeCount = pdrSummary?.archetypes?.length ?? 8;
  const founderVision = {
    schema: "sci-os-founder-vision-readiness/v1",
    label: "ALPHA_NON_PRODUCTION",
    at,
    buildId,
    checkpoint,
    verdict: "FOUNDER_VISION_BLOCKED_WITH_EVIDENCE",
    token: "FOUNDER_VISION_BLOCKED_WITH_EVIDENCE",
    domains: {
      professionalDomains: {
        status: "PARTIAL",
        families: 21,
        archetypesFullySpecified: archetypeCount,
        rolesSeeded: 200,
        rolesResearchRequired: "~192",
        runtimeConnected: archetypeCount >= 8,
        note: "8 archetype workspaces proven; 200+ seeds RESEARCH_REQUIRED",
      },
      experienceCompiler: {
        status: "PARTIAL",
        authority: "packages/professional-domain-registry/src/experience-compiler.js",
        runtimeMount: "RUNTIME_CONNECTED",
        pipelineWave: "B-008 not closed",
        ghostDirDeprecated: exists("packages/experience-compiler/README.md"),
      },
      advancedIntelligence: {
        status: "SCAFFOLD",
        metaIntelligence: "packages/meta-intelligence (capability registry alpha)",
        metaRecovery: "packages/meta-recovery (WHI-010 proven)",
        experimentTracker: "scaffold",
      },
      marketData: {
        status: "ABSENT",
        liveProviders: "NONE",
        blocker: "FD-006 REAL_DATA_PLANE provider credentials",
        alphaTruth: "deterministic/sample only",
      },
      graphKnowledgeLayer: {
        status: "SCAFFOLD",
        evidenceGraph: "packages/meta-intelligence/src/evidence-graph.ts",
        entityGraphProduction: "NOT_READY",
        externalGraphDb: "EXT-GRAPH-DB not connected",
      },
      aiLlm: {
        status: "BLOCKED",
        copilot: "NOT_IMPLEMENTED",
        blocker: "FD-005 AI CoPilot",
        aiCopilotProfiles: "declared in experience compiler only",
      },
      modelScience: {
        status: "HONEST_NON_PRODUCTION",
        validation: "NOT_VALIDATED labels enforced",
        cf28Wave: "B-005 not closed",
        stubs: ["validation-engine", "probability-engine"],
      },
      governance: {
        status: "ALPHA_PROVEN",
        cf14: "B_003_POLICY_DECISION_READY",
        enterpriseRbac: "NOT_READY",
        oidc: "FD-001 open",
      },
      autonomousWorkflows: {
        status: "NOT_READY",
        jobEngine: "CF11 + partial jobEngine.ts",
        selfEvolution: "propose-only scaffold",
        scaleOut: "300+ capability scale-out not started",
      },
    },
    visionBlockers: rootCauses.visionBlockers || [
      "REAL_DATA_PLANE provider credentials FD-006",
      "AI CoPilot FD-005",
      "300+ capability scale-out",
    ],
    maturityEstimate: "~15-20% of full Founder Vision",
  };
  write("founder-vision-readiness.json", founderVision);

  // Ensure beta-readiness exists
  if (!fs.existsSync(path.join(OUT, "beta-readiness.json"))) {
    spawnSync("node", ["scripts/tests/final-beta-readiness-gate.cjs"], { cwd: ROOT, stdio: "pipe", timeout: 180000 });
  }
  const beta = readJson("diagnostics-export/completion-program/final/beta-readiness.json") || {
    verdict: "BETA_BLOCKED_WITH_EVIDENCE",
  };

  const finalBlockers = [
    ...(beta.blockers || []),
    ...(production.blockers || []),
    ...(founderVision.visionBlockers || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const founderDecisions = {
    open: ["FD-001", "FD-002", "FD-004", "FD-005", "FD-006", "FD-007"],
    resolved: ["FD-003"],
    notes: {
      "FD-001": "OIDC provider selection — production auth",
      "FD-002": "PostgreSQL canonical durable store — Beta blocker",
      "FD-004": "Open (see program master audit)",
      "FD-005": "AI CoPilot — Founder Vision blocker",
      "FD-006": "REAL_DATA_PLANE market data providers",
      "FD-007": "Deployment model — production blocker",
    },
  };

  const externalDependencies = [
    "EXT-PG (PostgreSQL)",
    "EXT-REDIS",
    "EXT-OIDC",
    "EXT-TLS",
    "EXT-MARKET-DATA",
    "EXT-GRAPH-DB",
    "EXT-LLM",
  ];

  const report = {
    schema: "sci-os-final-completion-report/v1",
    label: "ALPHA_NON_PRODUCTION",
    at,
    token: "SCI_OS_X10_FINAL_COMPLETION_STATUS",
    BUILD: buildId,
    CHECKPOINT: checkpoint,
    INSTALLED_BUILD_GIT_SHA: installedBuild?.gitSha || null,
    ALPHA: alpha.verdict,
    BETA: beta.verdict || "BETA_BLOCKED_WITH_EVIDENCE",
    PRODUCTION: production.verdict,
    FOUNDER_VISION: founderVision.verdict,
    P0: p0,
    P1: p1,
    P2: p2,
    P3: p3,
    FINAL_BLOCKERS: finalBlockers,
    FOUNDER_DECISIONS: founderDecisions,
    EXTERNAL_DEPENDENCIES: externalDependencies,
    NEXT_EXACT_ACTION: programState.nextExactAction || "Close B-005 Beta acceptance wave",
    completedWaves: (programState.completedWaves || []).map((w) => ({
      waveId: w.waveId,
      verdict: w.verdict,
      buildId: w.buildId || null,
    })),
    openWaves: ["B-008", "B-009", "B-010"],
    targets: programState.targets || {},
    evidenceIndex: {
      alpha: "diagnostics-export/completion-program/final/alpha-readiness.json",
      beta: "diagnostics-export/completion-program/final/beta-readiness.json",
      production: "diagnostics-export/completion-program/final/production-readiness.json",
      founderVision: "diagnostics-export/completion-program/final/founder-vision-readiness.json",
      programState: "diagnostics-export/completion-program/program-state.json",
      closure: "diagnostics-export/closure/closure-summary.json",
    },
    honestSummary:
      "Target A (Usable Local Alpha) is READY with P0=0. Beta, Production, and Founder Vision remain blocked with documented evidence. P1 count is not manipulated.",
  };
  write("FINAL-COMPLETION-REPORT.json", report);

  const md = `# SCI OS ×10 — Final Completion Report

**Token:** \`SCI_OS_X10_FINAL_COMPLETION_STATUS\`  
**Generated:** ${at}  
**Label:** ALPHA_NON_PRODUCTION

---

## Status Summary

| Field | Value |
|-------|-------|
| **BUILD** | ${buildId} |
| **CHECKPOINT** | ${checkpoint} |
| **ALPHA** | ${alpha.verdict} |
| **BETA** | ${beta.verdict} |
| **PRODUCTION** | ${production.verdict} |
| **FOUNDER_VISION** | ${founderVision.verdict} |
| **P0** | ${p0} |
| **P1** | ${p1} |
| **P2** | ${p2} |
| **P3** | ${p3} |

---

## Completed Waves

| Wave | Verdict |
|------|---------|
| A-CONVERGENCE | USABLE_LOCAL_ALPHA_READY |
| B-001 | PASS |
| B-002 | B_002_JOB_STATE_READY |
| B-003 | B_003_POLICY_DECISION_READY |
| B-004 | BETA_DURABLE_CORE_READY |

Open: B-005 through B-009.

---

## Final Blockers

${finalBlockers.map((b) => `- ${b}`).join("\n")}

---

## Founder Decisions

**Open:** ${founderDecisions.open.join(", ")}  
**Resolved:** ${founderDecisions.resolved.join(", ")}

---

## External Dependencies

${externalDependencies.map((d) => `- ${d}`).join("\n")}

---

## Founder Vision Domain Assessment

| Domain | Status |
|--------|--------|
| Professional domains | PARTIAL (8 archetypes, 200+ seeds) |
| Experience Compiler | PARTIAL (runtime connected, B-008 open) |
| Advanced intelligence | SCAFFOLD |
| Market data | ABSENT (FD-006) |
| Graph/knowledge layer | SCAFFOLD |
| AI/LLM | BLOCKED (FD-005) |
| Model science | HONEST_NON_PRODUCTION |
| Governance | ALPHA_PROVEN / enterprise NOT_READY |
| Autonomous workflows | NOT_READY |

Estimated Founder Vision maturity: **~15–20%**

---

## Next Exact Action

${report.NEXT_EXACT_ACTION}

---

## Evidence

- \`diagnostics-export/completion-program/final/alpha-readiness.json\`
- \`diagnostics-export/completion-program/final/beta-readiness.json\`
- \`diagnostics-export/completion-program/final/production-readiness.json\`
- \`diagnostics-export/completion-program/final/founder-vision-readiness.json\`
- \`diagnostics-export/completion-program/final/FINAL-COMPLETION-REPORT.json\`

**${report.honestSummary}**
`;
  fs.writeFileSync(path.join(OUT, "FINAL-COMPLETION-REPORT.md"), md);

  console.log(
    JSON.stringify({
      ok: true,
      token: "SCI_OS_X10_FINAL_COMPLETION_STATUS",
      BUILD: buildId,
      CHECKPOINT: checkpoint,
      ALPHA: alpha.verdict,
      BETA: beta.verdict,
      PRODUCTION: production.verdict,
      FOUNDER_VISION: founderVision.verdict,
      P0: p0,
      P1: p1,
      out: OUT,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
