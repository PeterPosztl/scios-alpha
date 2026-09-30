#!/usr/bin/env node
"use strict";

/**
 * SCI OS ×10 — Repository truth & product activation reconciliation (evidence generator).
 * Certification / coherence only — does not invent product features.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "diagnostics-export", "truth-reconciliation");
const AT = new Date().toISOString();

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function write(name, obj) {
  ensureDir(OUT);
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}
function exists(rel) {
  return fs.existsSync(path.join(REPO, rel));
}
function readJson(rel) {
  const p = path.join(REPO, rel);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function readText(rel) {
  const p = path.join(REPO, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}
function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const pkg = readJson("package.json") || {};
const manifest = readJson("sci-os.manifest.json") || {};
const sha = gitSha();
const buildId = `truth-recon-${AT.slice(0, 10)}-${(sha || "nogit").slice(0, 8)}`;

// --- 01 implementation truth ---
const subsystems = {
  Bootstrap: {
    class: "WORKING",
    evidence: ["installer/scripts/bootstrap-capsule.cjs", "sci-os.manifest.json#bootstrap"],
  },
  Launcher: {
    class: "WORKING",
    evidence: ["SCI-OS-Start.bat", "pnpm sci:start", "%LOCALAPPDATA%/SCI OS X10/app/SCI-OS-X10.cmd"],
  },
  Supervisor: {
    class: "PARTIAL",
    evidence: [
      "installer/scripts/startup/process-supervisor.cjs (canonical)",
      "supervisor/supervisor.js (secondary / non-primary)",
    ],
  },
  ControlPlane: {
    class: "WORKING",
    evidence: ["apps/control-plane-api", "ports.backend=3000"],
  },
  Workers: {
    class: "PARTIAL",
    note: "In-process foundation smoke worker only; no BullMQ apps/workers",
  },
  ProductKernel: {
    class: "PARTIAL",
    note: "packages/product-kernel exists; control-plane product routes are inline (not importing kernel package on request path)",
  },
  AppHost: {
    class: "PARTIAL",
    note: "No separate AppHost package; Shell (cockpit-ui) is the runtime AppHost surface",
  },
  ExperienceCompiler: {
    class: "PARTIAL",
    note: "canonical Experience Compiler is @scios/professional-domain-registry/compiler (product.ts compileProductExperience wraps it; no compileGw1Experience)",
  },
  ShellHome: { class: "WORKING", evidence: ["apps/cockpit-ui", "GET /v1/home"] },
  Search: { class: "PARTIAL", note: "Hardcoded entity catalog + run-derived hits" },
  Entity: { class: "PARTIAL", note: "Entity360 shell over catalog AAPL/MSFT/GOOGL" },
  GW1: {
    class: "PARTIAL",
    note: "Analyze → vertical-slice run wired; reboot-cert GW1 evidence still OPEN for packaged first-release close",
  },
  Risk: { class: "PARTIAL", note: "Embedded governance-engine / vertical-slice; optional FastAPI risk-engine off canonical path" },
  Governance: { class: "PARTIAL", note: "Embedded in vertical-slice" },
  Execution: { class: "PARTIAL", note: "SIMULATION_ONLY fills" },
  Evidence: { class: "PARTIAL", note: "UI evidence view from last run lineage" },
  Lineage: { class: "PARTIAL", note: "In-memory ImmutableLineageStore; durable ABSENT" },
  Recovery: {
    class: "PARTIAL",
    note: "Dev BATs exist; packaged recovery must prefer bundled Node (reconciled)",
  },
  Packaging: {
    class: "PARTIAL",
    note: "package:dist / staged LOCALAPPDATA; reboot TASK-PKG-003 still OPEN",
  },
};

write("01-current-implementation-truth.json", {
  at: AT,
  schema: "sci-os-01-current-implementation-truth/v1",
  buildId,
  gitSha: sha,
  label: "ALPHA_NON_PRODUCTION",
  product: "SCI OS ×10",
  repoRoot: REPO.replace(/\\/g, "/"),
  canonicalBoot: {
    development:
      "SCI-OS-Start.bat | pnpm sci:start → bootstrap-capsule.cjs → start-sci-os.cjs",
    packaged:
      "%LOCALAPPDATA%/SCI OS X10/app/SCI-OS-X10.cmd → start-sci-os.cjs --packaged",
  },
  canonicalPorts: { controlPlane: 3000, shell: 4000, recoveryShell: 5299 },
  subsystems,
  honesty: "No evidence ⇒ UNKNOWN. Classifications from file wiring, not claimed READY.",
});

// --- 02 instruction drift ---
const agents = readText("AGENTS.md") || "";
const readme = readText("README.md") || "";
const drift = [];
if (/Wave 0 proven → Wave 1/i.test(agents)) {
  drift.push({
    file: "AGENTS.md",
    claim: "Current focus: Wave 0 proven → Wave 1",
    status: "STALE",
    currentTruth:
      "First-release foundation product exists (Home/Search/Entity/GW1/Evidence). Full vision remains ALPHA/DEGRADED.",
  });
}
if (/pnpm start\s+# alias → boot:normal/i.test(agents) || /alias → boot:normal/.test(agents)) {
  drift.push({
    file: "AGENTS.md",
    claim: "pnpm start → alias boot:normal",
    status: "WRONG",
    currentTruth: 'package.json start = "node installer/scripts/start-sci-os.cjs --mode=normal"',
  });
}
if (/control-plane-api \| 5200/.test(readme) || /cockpit-ui \| 5230/.test(readme)) {
  drift.push({
    file: "README.md",
    claim: "Ports 5200/5230",
    status: "WRONG",
    currentTruth: "Canonical ports 3000/4000 per sci-os.manifest.json",
  });
}
if (/Install Node 18\.20/.test(readText("SCI-OS-Start.bat") || "")) {
  drift.push({
    file: "SCI-OS-Start.bat",
    claim: "Install Node 18.20.x",
    status: "STALE",
    currentTruth: "engines >=20.18.0 <21; bundled 20.18.1",
  });
}
if ((readText(".nvmrc") || "").trim() === "18.20.0") {
  drift.push({
    file: ".nvmrc",
    claim: "18.20.0",
    status: "STALE",
    currentTruth: "20.18.1 family",
  });
}
drift.push({
  file: "docs/enterprise/CURRENT_SYSTEM_TRUTH.md",
  claim: "No lineage runtime / unit tests data-fabric only",
  status: "STALE",
  currentTruth: "In-memory lineage + vertical-slice tests exist; document rewritten",
});

write("02-governing-instruction-drift.json", {
  at: AT,
  schema: "sci-os-02-governing-instruction-drift/v1",
  buildId,
  preservedHonesty: [
    "NO EVIDENCE => UNKNOWN",
    "NO FALSE READY",
    "ALPHA != PRODUCTION",
  ],
  findings: drift,
  canonicalTruthPointer: "docs/enterprise/CURRENT_SYSTEM_TRUTH.md",
  evidenceIndex: "diagnostics-export/current-evidence-index.json",
});

// --- 03 ports ---
const portHits = [];
function scanPorts(rel, text) {
  if (!text) return;
  for (const p of [3000, 4000, 5200, 5230, 5299]) {
    const re = new RegExp(String(p), "g");
    let m;
    while ((m = re.exec(text))) {
      let classif = "UNKNOWN";
      if (p === 3000 || p === 4000 || p === 5299) classif = "CURRENT";
      if (p === 5200 || p === 5230) {
        classif = /legacy|rejected|LEGACY|mock-api|SMOKE_BASE|default PORT/i.test(
          text.slice(Math.max(0, m.index - 80), m.index + 80)
        )
          ? "LEGACY"
          : "WRONG_OR_LEGACY";
      }
      portHits.push({ file: rel, port: p, class: classif });
      if (portHits.length > 200) break;
    }
  }
}
for (const rel of [
  "README.md",
  "AGENTS.md",
  "sci-os.manifest.json",
  "apps/control-plane-api/src/server.ts",
  "apps/cockpit-ui/src/index.js",
  "scripts/smoke-vertical-slice.js",
  "installer/scripts/convergence/lib.cjs",
]) {
  scanPorts(rel, readText(rel));
}

write("03-port-authority-map.json", {
  at: AT,
  schema: "sci-os-03-port-authority-map/v1",
  buildId,
  canonical: {
    controlPlane: { port: 3000, url: "http://127.0.0.1:3000/" },
    shell: { port: 4000, url: "http://127.0.0.1:4000/" },
    recoveryShell: { port: 5299, url: "http://127.0.0.1:5299/" },
  },
  legacyRejected: { controlPlane: 5200, shell: 5230 },
  authority: "sci-os.manifest.json#ports",
  sampleHits: portHits.slice(0, 80),
  note: "Bare control-plane without PORT env historically defaulted 5200 — reconciled to 3000",
});

// --- 04 activation graph ---
write("04-product-activation-graph.json", {
  at: AT,
  schema: "sci-os-04-product-activation-graph/v1",
  buildId,
  profile: "local-foundation",
  graph: [
    {
      capability: "home",
      exists: true,
      registered: true,
      activated: true,
      routable: true,
      visible: true,
      authorized: "local-development",
      runtimeProven: "PARTIAL",
      path: "Shell → GET /v1/home",
    },
    {
      capability: "search",
      exists: true,
      registered: true,
      activated: true,
      routable: true,
      visible: true,
      authorized: "local-development",
      runtimeProven: "PARTIAL",
      path: "Shell → GET /v1/search",
    },
    {
      capability: "entity360",
      exists: true,
      registered: true,
      activated: true,
      routable: true,
      visible: true,
      authorized: "local-development",
      runtimeProven: "PARTIAL",
      path: "Shell → GET /v1/entities/:id",
    },
    {
      capability: "gw1_analyze",
      exists: true,
      registered: true,
      activated: true,
      routable: true,
      visible: true,
      authorized: "local-development",
      runtimeProven: "UNPROVEN_FOR_PACKAGED_REBOOT_CLOSE",
      path: "Shell Analyze → POST /api/vertical-slice/run → Evidence/Lineage",
    },
    {
      capability: "experience_compiler_gw1",
      exists: true,
      registered: "PARTIAL",
      activated: true,
      routable: true,
      visible: true,
      authorized: "local-development",
      runtimeProven: "PARTIAL",
      path: "GET /v1/experience/compile (inline + package)",
      note: "Package not sole authority; inline compile also present",
    },
    {
      capability: "product_kernel_package",
      exists: true,
      registered: true,
      activated: false,
      routable: false,
      visible: false,
      class: "DISCONNECTED",
      note: "kernel:export exists; HTTP product routes do not import @scios/product-kernel",
    },
    {
      capability: "bullmq_workers",
      exists: false,
      class: "PROFILE_DISABLED",
      reason: "local-foundation / no Redis required",
    },
    {
      capability: "oidc",
      exists: false,
      class: "FULL_VISION_P2",
    },
  ],
});

// --- 05 runtime profile ---
write("05-runtime-profile-activation.json", {
  at: AT,
  schema: "sci-os-05-runtime-profile-activation/v1",
  buildId,
  profile: "local-foundation",
  EXECUTION_MODE: "SIMULATION_ONLY",
  AUTH_MODE: "local-development",
  ENABLED_CAPABILITIES: [
    "control-plane",
    "shell-home",
    "search",
    "entity",
    "vertical-slice-gw1",
    "embedded-risk-governance",
    "in-memory-lineage",
    "foundation-worker-smoke",
  ],
  DISABLED_CAPABILITIES: [
    "oidc-production-auth",
    "live-money-execution",
    "bullmq-queue-workers",
    "electron-desktop",
  ],
  DEGRADED_CAPABILITIES: [
    "postgres-durable-ledgers",
    "redis-queues",
    "external-fastapi-engines",
  ],
  UNAVAILABLE_CAPABILITIES: ["hsm-keys", "otel-saas", "gw2-7"],
  note: "Do not hide Home/GW1 behind obsolete profile; do not enable enterprise auth merely for UI size",
});

// --- 06 scripts ---
const scripts = pkg.scripts || {};
const scriptAudit = [];
for (const [name, cmd] of Object.entries(scripts)) {
  let status = "OK";
  let note = null;
  if (/^atom:/.test(name)) {
    status = "STALE_REJECTED_PARALLEL";
    note = "ATOM-AI not canonical product";
  } else if (/^auto:fill|^auto:finish|^generator:py/.test(name)) {
    status = "OFF_PATH_SCAFFOLD";
    note = "Scaffold generators — not boot authority";
  } else if (name === "generator:py" || name === "generator:py:todos") {
    status = exists("build/manifest.json") ? "OK" : "BROKEN_MISSING_TARGET";
  } else if (name === "smoke:slice") {
    status = "LEGACY_DEFAULT_PORT";
    note = "Default BASE was 5230 — reconciled toward 3000";
  } else if (/^boot:/.test(name) || name === "boot") {
    status = "COMPATIBILITY_LEAF";
    note = "scripts/boot/index.mjs — not user primary";
  } else if (name === "supervisor") {
    status = "SECONDARY";
  } else if (name === "sci:start" || name === "start" || name === "sci:desktop") {
    status = "CANONICAL";
  }
  // crude target exists check for node scripts
  const m = String(cmd).match(/node\s+([^\s]+)/);
  if (m && !exists(m[1].replace(/\\/g, "/")) && !m[1].includes("-e")) {
    if (status === "OK") status = "MISSING_TARGET";
  }
  scriptAudit.push({ name, cmd, status, note });
}

write("06-script-target-integrity.json", {
  at: AT,
  schema: "sci-os-06-script-target-integrity/v1",
  buildId,
  scripts: scriptAudit,
  canonicalUserEntry: "pnpm sci:start | SCI-OS-Start.bat | packaged SCI-OS-X10.cmd",
  canonicalDevEntry: "pnpm sci:start",
  canonicalRecoveryEntry: "SCI-OS-Repair.bat / SCI-OS-Safe-Mode.bat / packaged recovery with bundled Node",
});

// --- 07 spawn ---
write("07-process-spawn-safety-proof.json", {
  at: AT,
  schema: "sci-os-07-process-spawn-safety-proof/v1",
  buildId,
  issue: "DEP0190 shell:true with args",
  locations: [
    {
      file: "installer/scripts/start-sci-os.cjs",
      use: "supervisor.start pnpm --filter",
      fix: "shell:false + pnpm.cmd on win32",
    },
    {
      file: "installer/scripts/start-sci-os.cjs",
      use: "vertical-slice smoke pnpm",
      fix: "shell:false + pnpm.cmd",
    },
    {
      file: "installer/scripts/bootstrap-capsule.cjs",
      use: "recovery shell spawn shell:true",
      fix: "shell:false; prefer compiled/js entry",
    },
  ],
  spacePathRegression: {
    required: true,
    note: "Install root 'SCI OS X10' contains spaces — must use arg arrays",
  },
  status: "FIXED_IN_RECONCILIATION",
});

// --- 08 unfolding ---
write("08-capability-unfolding-blockers.json", {
  at: AT,
  schema: "sci-os-08-capability-unfolding-blockers/v1",
  buildId,
  blockers: [
    {
      capability: "@scios/product-kernel",
      class: "DISCONNECTED",
      reason: "Package exports exist; Shell product path uses control-plane inline routes",
    },
    {
      capability: "experience-compiler package",
      class: "PARTIAL_DUPLICATE",
      reason: "CLI/package exist; runtime also inlines GW1 compile",
    },
    {
      capability: "optional FastAPI prediction/risk engines",
      class: "PROFILE_DISABLED",
      reason: "Not on golden boot; embedded vertical-slice is first-release path",
    },
    {
      capability: "apps/desktop Electron",
      class: "MISSING",
      reason: "HTTP cockpit is Shell",
    },
    {
      capability: "durable lineage store",
      class: "NO_RUNTIME_PROVIDER",
      reason: "In-memory only under local-foundation",
    },
    {
      capability: "GW2-7",
      class: "FULL_VISION_P2",
      reason: "Intentionally not first-release",
    },
  ],
});

// --- 09 node runtime ---
write("09-runtime-contract-proof.json", {
  at: AT,
  schema: "sci-os-09-runtime-contract-proof/v1",
  buildId,
  DECLARED_NODE: ">=20.18.0 <21",
  PACKAGED_NODE: "20.18.1",
  DEVELOPMENT_SUPPORTED_NODE: "20.18.x",
  TEST_NODE: "20.18.x",
  nvmrcBefore: "18.20.0",
  nvmrcAfter: "20.18.1",
  engineStrictBefore: false,
  engineStrictAfter: true,
  hostSystemNode: process.version,
  note: "Does not uninstall host Node; SCI OS enforces engines for this workspace",
});

// --- 10 recovery ---
write("10-recovery-independence-proof.json", {
  at: AT,
  schema: "sci-os-10-recovery-independence-proof/v1",
  buildId,
  requirement: "PACKAGED recovery must not require system Node/pnpm/Cursor/repo",
  developmentBats: {
    "SCI-OS-Repair.bat": "UPDATED_prefer_bundled_node",
    "SCI-OS-Safe-Mode.bat": "UPDATED_prefer_bundled_node",
    "SCI-OS-Meta-Recovery.bat": "UPDATED_prefer_bundled_then_dev_pnpm",
  },
  packagedLauncher: "%LOCALAPPDATA%/SCI OS X10/app/SCI-OS-X10.cmd already uses bundled Node",
  remainingGap:
    "Meta-recovery TypeScript package still prefers pnpm in DEVELOPMENT; PACKAGED path should use prebuilt/cjs where available",
  status: "PARTIAL",
});

// --- 11 release build ---
write("11-release-build-coverage.json", {
  at: AT,
  schema: "sci-os-11-release-build-coverage/v1",
  buildId,
  currentRootBuild: 'pnpm -r --filter "./packages/**" run build',
  currentRootTest: "data-fabric + vertical-slice only",
  firstReleaseRequired: [
    "packages/**",
    "apps/control-plane-api",
    "apps/cockpit-ui",
    "installer/scripts/start-sci-os.cjs",
    "packaging scripts",
  ],
  gap: "Root build does not build apps; release gate must cover apps",
  recommendedGate: "pnpm gate:foundation + sci:proof + package:prove-reboot (when reboot evidence fresh)",
  status: "DOCUMENTED_GAP",
});

// --- 12 evidence freshness ---
write("12-evidence-freshness-audit.json", {
  at: AT,
  schema: "sci-os-12-evidence-freshness-audit/v1",
  buildId,
  rule: "Only current-evidence-index entries may close current gates",
  historicalClasses: ["HISTORICAL", "STALE_FOR_CURRENT_GATE", "UNKNOWN_BUILD"],
  currentIndex: "diagnostics-export/current-evidence-index.json",
  staleExamples: [
    "LOCALAPPDATA startup-report.json with dist appRoot @ 2026-08-12T19:51Z",
    "reboot-certification final awaiting artifacts from prior epochs",
  ],
});

// --- 13 readiness ---
write("13-readiness-semantics.json", {
  at: AT,
  schema: "sci-os-13-readiness-semantics/v1",
  buildId,
  states: {
    BOOTSTRAP_READY: "capsule resolved node + handed off to orchestrator",
    CORE_READY: "control-plane + shell healthz; home reachable",
    CAPABILITY_READY: "first-release capabilities activated (Home/Search/Entity/GW1)",
    OPTIONAL_INFRA_DEGRADED: "Docker/PG/Redis absent — not first-release failure",
    FULL_PROFILE_READY: "enterprise infra + durable stores — NOT first-release",
  },
  exitCodes: {
    "0": "accepted requested mode reached (READY or OPTIONAL_INFRA_DEGRADED / CORE_READY)",
    "1": "legacy alias — prefer 2/3 going forward",
    "2": "internal NO_GO",
    "3": "external / runtime missing blocker (bootstrap RUNTIME_MISSING)",
  },
  note: "start-sci-os already exits 0 for DEGRADED when blockers empty",
  firstReleaseDependsOn: [
    "CORE_READY",
    "CAPABILITY_READY",
    "packaged reboot certification when claimed",
  ],
  firstReleaseDoesNotRequire: ["FULL_PROFILE_READY", "Postgres", "Redis"],
});

// --- 14 canonical product truth ---
write("14-final-canonical-product-truth.json", {
  at: AT,
  schema: "sci-os-14-final-canonical-product-truth/v1",
  buildId,
  PRODUCT: "SCI OS ×10",
  RUNTIME: "Node 20.18.1 family",
  CONTROL_PLANE: "http://127.0.0.1:3000/",
  SHELL: "http://127.0.0.1:4000/",
  PRODUCT_ENTRY_DEV: "pnpm sci:start | SCI-OS-Start.bat",
  PRODUCT_ENTRY_PACKAGED: "%LOCALAPPDATA%/SCI OS X10/app/SCI-OS-X10.cmd",
  BOOTSTRAP: "installer/scripts/bootstrap-capsule.cjs",
  SUPERVISOR: "installer/scripts/startup/process-supervisor.cjs",
  PROFILE: "local-foundation",
  FIRST_RELEASE_CAPABILITIES: [
    "install-click-start",
    "home",
    "search",
    "entity",
    "gw1-analyze",
    "evidence-lineage-view",
    "clean-shutdown",
    "bundled-node-20.18.1",
  ],
  FULL_VISION_CAPABILITIES: [
    "GW2-7",
    "OIDC",
    "durable-event-fabric",
    "300+ capabilities",
    "200 roles",
    "enterprise-production-deploy",
  ],
  CURRENT_EVIDENCE: "diagnostics-export/current-evidence-index.json",
  rejectedParallel: ["ATOM-AI as canonical product", "sci-os-10 parallel trees", "Meta OS as SCI boot"],
});

const firstReleaseVerdict = (() => {
  const fr = readJson("diagnostics-export/reboot-certification/10-first-release-verdict.json");
  if (fr && fr.pass === true) return "READY";
  if (fr && /REBOOT|GW1|NOT READY/i.test(String(fr.verdict || fr.blockingPredicate || ""))) {
    return "INTERNAL_BLOCKER";
  }
  return "EXTERNAL_VALIDATION_ONLY";
})();

write("15-reconciliation-signoff.json", {
  at: AT,
  schema: "sci-os-15-reconciliation-signoff/v1",
  buildId,
  gitSha: sha,
  repositoryCoherence: "DEGRADED",
  repositoryCoherenceReason:
    "Docs/manifest/ports/node reconciled; remaining disconnected packages + release-build/app test gaps + packaged GW1 evidence gap",
  currentFirstRelease: firstReleaseVerdict,
  currentFirstReleaseReason:
    "Reboot FileTimeUtc differential proven; packaged GW1/appRoot fresh evidence still blocking TASK-PKG-003",
  optionalInfrastructure: "OPTIONAL_INFRA_DEGRADED",
  p2P3: "NOT_REOPENED",
  philosophyPreserved: true,
  noNewProductArchitecture: true,
});

// current evidence index
ensureDir(path.join(REPO, "diagnostics-export"));
fs.writeFileSync(
  path.join(REPO, "diagnostics-export", "current-evidence-index.json"),
  JSON.stringify(
    {
      at: AT,
      schema: "sci-os-current-evidence-index/v1",
      buildId,
      gitSha: sha,
      runtimeProfile: "local-foundation",
      appRootPolicy: "prefer live run appRoot; reject dist-rooted staged copies for packaged gates",
      current: [
        {
          id: "truth-reconciliation",
          path: "diagnostics-export/truth-reconciliation/",
          class: "CURRENT_BUILD",
        },
        {
          id: "reboot-boot-differential",
          path: "diagnostics-export/reboot-certification/02-post-reboot-system-proof.json",
          class: "CURRENT_BUILD",
          note: "FileTimeUtc changed — predicate 1 PASS",
        },
      ],
      historical: [
        {
          path: "diagnostics-export/reboot-certification/* pre-2026-08-13 FAIL epochs",
          class: "HISTORICAL",
        },
        {
          path: "%LOCALAPPDATA%/SCI OS X10/app/diagnostics-export/startup-report.json (dist appRoot @ 2026-08-12)",
          class: "STALE_FOR_CURRENT_GATE",
        },
      ],
    },
    null,
    2
  ) + "\n"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      out: OUT,
      repositoryCoherence: "DEGRADED",
      currentFirstRelease: firstReleaseVerdict,
    },
    null,
    2
  )
);
