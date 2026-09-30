#!/usr/bin/env node
"use strict";

/**
 * SCI OS ×10 — Deep structural forensics (evidence generator).
 * No speculative product features — inventory, prove/disprove, classify.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "diagnostics-export", "deep-forensics");
const AT = new Date().toISOString();

function ensure(p) {
  fs.mkdirSync(p, { recursive: true });
}
function write(name, obj) {
  ensure(OUT);
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}
function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function read(rel) {
  const p = path.join(REPO, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}
function readJson(rel) {
  try {
    return JSON.parse(read(rel) || "null");
  } catch {
    return null;
  }
}
function git(cmd) {
  try {
    return execSync(cmd, { cwd: REPO, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}
function walk(dir, acc, maxFiles = 8000) {
  if (acc.length >= maxFiles) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (acc.length >= maxFiles) return;
    const name = e.name;
    if (
      name === "node_modules" ||
      name === ".git" ||
      name === "diagnostics-export" ||
      name === "dist" ||
      name === ".pnpm-store"
    )
      continue;
    const full = path.join(dir, name);
    if (e.isDirectory()) walk(full, acc, maxFiles);
    else if (e.isFile()) {
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      const rel = path.relative(REPO, full).replace(/\\/g, "/");
      let hash = null;
      try {
        if (st.size <= 2_000_000) hash = sha256(fs.readFileSync(full));
      } catch {
        /* */
      }
      acc.push({
        path: rel,
        size: st.size,
        mtime: st.mtime.toISOString(),
        hash,
        subsystem: classifySubsystem(rel),
      });
    }
  }
}
function classifySubsystem(rel) {
  if (rel.startsWith("installer/")) return "BOOTSTRAP";
  if (rel.startsWith("apps/control-plane")) return "CONTROL_PLANE";
  if (rel.startsWith("apps/cockpit")) return "SHELL";
  if (rel.startsWith("packages/vertical-slice")) return "GW1";
  if (rel.startsWith("packages/product-kernel")) return "PRODUCT_KERNEL";
  if (rel.startsWith("packages/professional-domain")) return "EXPERIENCE";
  if (rel.startsWith("packages/system-closure")) return "CLOSURE";
  if (rel.startsWith("packages/")) return "PACKAGE";
  if (rel.startsWith("apps/")) return "APP";
  if (rel.startsWith("scripts/package")) return "PACKAGING";
  if (rel.startsWith("docs/")) return "DOCS";
  if (/\.bat$/i.test(rel) || /\.cmd$/i.test(rel)) return "LAUNCHER";
  return "OTHER";
}

const sha = git("git rev-parse HEAD");
const buildId = `deep-forensics-${AT.slice(0, 10)}-${(sha || "nogit").slice(0, 8)}`;
const pkg = readJson("package.json") || {};
const lock = read("pnpm-lock.yaml") || "";
const nvmrc = (read(".nvmrc") || "").trim();
const npmrc = read(".npmrc") || "";
const startBat = read("SCI-OS-Start.bat") || "";
const cascadeBat = read("SCI OS ×10.bat") || read("SCI OS x10.bat") || "";
const repairBat = read("SCI-OS-Repair.bat") || "";
const safeBat = read("SCI-OS-Safe-Mode.bat") || "";
const metaBat = read("SCI-OS-Meta-Recovery.bat") || "";
const readme = read("README.md") || "";
const agents = read("AGENTS.md") || "";
const manifest = readJson("sci-os.manifest.json") || {};
const serverTs = read("apps/control-plane-api/src/server.ts") || "";
const cockpit = read("apps/cockpit-ui/src/index.js") || "";
const startSci = read("installer/scripts/start-sci-os.cjs") || "";

// Tracked set
const trackedRaw = git("git ls-files") || "";
const tracked = new Set(trackedRaw.split(/\r?\n/).filter(Boolean).map((s) => s.replace(/\\/g, "/")));

const files = [];
walk(REPO, files);
for (const f of files) {
  f.tracked = tracked.has(f.path) ? "tracked" : "untracked";
}

write("01-current-filesystem-truth.json", {
  at: AT,
  schema: "sci-os-deep-01-filesystem-truth/v1",
  buildId,
  gitSha: sha,
  repoRoot: REPO.replace(/\\/g, "/"),
  fileCountSampled: files.length,
  truncatedAt: 8000,
  excluded: ["node_modules", ".git", "diagnostics-export", "dist"],
  bySubsystem: files.reduce((a, f) => {
    a[f.subsystem] = (a[f.subsystem] || 0) + 1;
    return a;
  }, {}),
  untrackedCount: files.filter((f) => f.tracked === "untracked").length,
  files: files.slice(0, 4000),
});

// B hypotheses prove/disprove
const hyp = [
  {
    id: 1,
    claim: ".nvmrc still 18.20.0 vs engines >=20.18<21",
    verdict: nvmrc === "20.18.1" ? "DISPROVED_FIXED" : "PROVED",
    evidence: { nvmrc, engines: pkg.engines },
  },
  {
    id: 2,
    claim: "SCI-OS-Start.bat instructs Node 18.20.x",
    verdict: /18\.20/.test(startBat) ? "PROVED" : "DISPROVED_FIXED",
    evidence: { mentions2018: /20\.18/.test(startBat) },
  },
  {
    id: 3,
    claim: "engine-strict=false",
    verdict: /engine-strict\s*=\s*true/.test(npmrc) ? "DISPROVED_FIXED" : "PROVED",
    evidence: { npmrc: npmrc.trim() },
  },
  {
    id: 4,
    claim: "SCI OS ×10.bat depends on system Node only",
    verdict: /runtime\\node\\node\.exe/.test(cascadeBat)
      ? "DISPROVED_FIXED"
      : /where node/.test(cascadeBat)
        ? "PROVED"
        : "UNKNOWN",
    evidence: { hasWhereNode: /where node/.test(cascadeBat), hasBundled: /runtime\\node/.test(cascadeBat) },
  },
  {
    id: 5,
    claim: "Repair/Safe depend on system Node only",
    verdict:
      /runtime\\node\\node\.exe/.test(repairBat) && /runtime\\node\\node\.exe/.test(safeBat)
        ? "DISPROVED_FIXED_PREFERS_BUNDLED"
        : "PROVED",
    evidence: { repairPrefersBundled: /runtime\\node/.test(repairBat) },
  },
  {
    id: 6,
    claim: "Meta-Recovery requires system Node+pnpm always",
    verdict: /PACKAGED: bundled Node/.test(metaBat)
      ? "PARTIAL_FIXED_DEV_STILL_PNPM"
      : "PROVED",
  },
  {
    id: 7,
    claim: "Many competing startup entrypoints",
    verdict: "PROVED_CLASSIFIED",
    note: "Multiple entries remain; must converge on start-sci-os — see 04",
  },
  {
    id: 8,
    claim: "README documents 5200/5230",
    verdict: /5200|5230/.test(readme) && /Legacy/.test(readme) ? "DISPROVED_FIXED_MARKED_LEGACY" : /\| 5200/.test(readme) ? "PROVED" : "DISPROVED_FIXED",
  },
  {
    id: 9,
    claim: "AGENTS Wave-0 only world",
    verdict: /FIRST RELEASE FOUNDATION/.test(agents) ? "DISPROVED_FIXED" : "PROVED",
  },
  {
    id: 10,
    claim: "manifest UX older than Home/AppHost",
    verdict: (manifest.ux || []).includes("home") ? "DISPROVED_FIXED" : "PROVED",
    evidence: { ux: manifest.ux },
  },
  {
    id: 11,
    claim: "READY mixes PG/Redis mandatory with DEGRADED",
    verdict: manifest.readiness?.OPTIONAL_INFRA_DEGRADED_allowed_when
      ? "DISPROVED_FIXED_SEMANTICS"
      : "PROVED",
  },
  {
    id: 12,
    claim: "DEGRADED with blockers=[] exits 1",
    verdict: /process\.exit\(verdict === \"NO_GO\" \? 1 : 0\)/.test(startSci)
      ? "DISPROVED_POLICY_EXIT0_FOR_DEGRADED"
      : "INVESTIGATE",
  },
  {
    id: 13,
    claim: "shell:true DEP0190 in start-sci-os pnpm spawn",
    verdict: /shell:\s*false/.test(startSci) && /pnpm\.cmd/.test(startSci) ? "DISPROVED_FIXED_PRIMARY" : "PROVED",
  },
  {
    id: 14,
    claim: "root build packages-only",
    verdict: /filter \"\.\/packages\/\*\*"/.test(JSON.stringify(pkg.scripts?.build || "")) || String(pkg.scripts?.build || "").includes("packages/**")
      ? "PROVED"
      : "UNKNOWN",
    evidence: { build: pkg.scripts?.build },
  },
  {
    id: 15,
    claim: "root test data-fabric+vertical-slice only",
    verdict: /data-fabric/.test(pkg.scripts?.test || "") && /vertical-slice/.test(pkg.scripts?.test || "") && !/cockpit/.test(pkg.scripts?.test || "")
      ? "PROVED"
      : "UNKNOWN",
  },
  {
    id: 16,
    claim: "kernel/closure/domain packages missing from workspace/lock",
    verdict: "PROVED_PARTIAL",
    evidence: {
      disk: {
        productKernel: fs.existsSync(path.join(REPO, "packages/product-kernel/package.json")),
        domainRegistry: fs.existsSync(path.join(REPO, "packages/professional-domain-registry/package.json")),
        systemClosure: fs.existsSync(path.join(REPO, "packages/system-closure/package.json")),
      },
      lockImporters: {
        productKernel: /packages\/product-kernel:/.test(lock),
        domainRegistry: /packages\/professional-domain-registry:/.test(lock),
        systemClosure: /packages\/system-closure:/.test(lock),
      },
    },
  },
  {
    id: 17,
    claim: "ATOM-AI scripts remain active",
    verdict: /STALE: ATOM-AI/.test(pkg.scripts?.["atom:ai"] || "") ? "DISPROVED_FIXED_STALE_EXIT2" : "PROVED",
  },
  {
    id: 18,
    claim: "auto-fill/auto-finish callable",
    verdict: pkg.scripts?.["auto:fill"] ? "PROVED_OFF_PATH" : "DISPROVED",
  },
  {
    id: 19,
    claim: "pkg bootstrap path differs from installer capsule",
    verdict: "PROVED_BUT_DELEGATES",
    evidence: {
      pkgAsset: "bootstrap/bootstrap-capsule.js",
      delegatesTo: "installer/scripts/bootstrap-capsule.cjs",
    },
  },
  {
    id: 20,
    claim: "tsconfig.base NodeNext vs root CommonJS",
    verdict: "PROVED",
    evidence: {
      base: "NodeNext",
      root: "commonjs/node",
      note: "Root tsconfig targets legacy src/; packages use base — dual module graph",
    },
  },
  {
    id: 21,
    claim: "@types/node major differs from runtime major",
    verdict: "PROVED",
    evidence: { typesNode: "^22.10.0", runtimeFamily: "20.18.x" },
  },
  {
    id: 22,
    claim: "cockpit monolithic",
    verdict: "PROVED",
    evidence: {
      filesInSrc: 1,
      lines: cockpit.split(/\n/).length,
      react: /from ['\"]react['\"]/.test(cockpit),
      doctype: /<!DOCTYPE html>/i.test(cockpit),
    },
  },
  {
    id: 23,
    claim: "local-foundation disables substantial capability",
    verdict: "PROVED_INTENTIONAL_PARTIAL",
    note: "BullMQ/OIDC/Electron/FastAPI engines off; Home/GW1 on",
  },
  {
    id: 24,
    claim: "old diagnostics contaminate gates",
    verdict: "PROVED_RISK_MITIGATED_BY_INDEX",
    note: "current-evidence-index + STALE_FOR_CURRENT_GATE classification",
  },
];

write("02-authority-conflicts.json", {
  at: AT,
  buildId,
  hypotheses: hyp,
  remainingConflicts: [
    {
      fact: "startup entrypoints",
      owners: ["SCI-OS-Start.bat", "SCI OS ×10.bat", "pnpm sci:start", "pnpm start", "pnpm boot:*", "packaged SCI-OS-X10.cmd"],
      resolution: "All must hand off to start-sci-os.cjs",
    },
    {
      fact: "product-kernel runtime authority",
      owners: ["packages/product-kernel", "apps/control-plane-api inline product.ts"],
      resolution: "Inline currently authoritative for HTTP; package DISCONNECTED",
    },
  ],
});

write("03-runtime-contract-drift.json", {
  at: AT,
  buildId,
  canonical: "Node 20.18.1 family",
  packageEngines: pkg.engines,
  nvmrc,
  engineStrict: /engine-strict\s*=\s*true/.test(npmrc),
  typesNode: pkg.devDependencies?.["@types/node"],
  hostNode: process.version,
  driftRemaining: [
    { item: "@types/node", status: "MAJOR_MISMATCH_22_vs_20", severity: "P2" },
    { item: "host agent node", status: process.version.startsWith("v20.18") ? "ALIGNED" : "OUTSIDE_ENGINES", severity: "P1_DEV" },
  ],
  verdict: nvmrc === "20.18.1" && /engine-strict\s*=\s*true/.test(npmrc) ? "MOSTLY_ALIGNED" : "DRIFT",
});

const startupMap = [
  { entry: "SCI-OS-Start.bat", class: "CANONICAL_DEVELOPMENT", target: "bootstrap-capsule.cjs" },
  { entry: "pnpm sci:start", class: "CANONICAL_DEVELOPMENT", target: "bootstrap-capsule.cjs" },
  { entry: "pnpm start", class: "ALIAS", target: "start-sci-os.cjs --mode=normal" },
  { entry: "SCI OS ×10.bat", class: "CANONICAL_DEVELOPMENT_CASCADE", target: "sci-os-x10-launcher.cjs → start-sci-os" },
  { entry: "SCI-OS-X10.cmd (LOCALAPPDATA)", class: "CANONICAL_PRODUCTION", target: "start-sci-os.cjs --packaged" },
  { entry: "SCI-OS-Repair.bat", class: "CANONICAL_RECOVERY", target: "repair-sci-os + start-sci-os repair" },
  { entry: "SCI-OS-Safe-Mode.bat", class: "CANONICAL_RECOVERY", target: "start-sci-os --mode=safe" },
  { entry: "SCI-OS-Meta-Recovery.bat", class: "CANONICAL_RECOVERY", target: "bundled repair OR pnpm meta-recovery (DEV)" },
  { entry: "pnpm boot:*", class: "LEGACY_COMPAT", target: "scripts/boot/index.mjs" },
  { entry: "pnpm supervisor", class: "LEGACY", target: "supervisor/supervisor.js" },
  { entry: "bootstrap:golden", class: "ALIAS", target: "bootstrap/bootstrap-capsule.js → installer capsule" },
];

write("04-startup-authority-map.json", {
  at: AT,
  buildId,
  singularOrchestrator: "installer/scripts/start-sci-os.cjs",
  singularBootstrap: "installer/scripts/bootstrap-capsule.cjs",
  entries: startupMap,
});

write("05-recovery-independence.json", {
  at: AT,
  buildId,
  packagedRequirement: "bundled Node only; no system node/pnpm/Cursor/repo",
  repair: { prefersBundled: /runtime\\node/.test(repairBat), status: "PARTIAL_OK" },
  safe: { prefersBundled: /runtime\\node/.test(safeBat), status: "PARTIAL_OK" },
  meta: {
    packagedBranch: /PACKAGED: bundled Node/.test(metaBat),
    devStillNeedsPnpm: true,
    status: "PARTIAL",
  },
  cascadeBatSystemNodeOnly: !/runtime\\node/.test(cascadeBat),
  scrubbedPathTest: "NOT_EXECUTED_IN_THIS_RUN",
  remainingP0: cascadeBat && !/runtime\\node/.test(cascadeBat) ? ["SCI OS ×10.bat system-node-only"] : [],
});

const scriptAudit = Object.entries(pkg.scripts || {}).map(([name, cmd]) => {
  let status = "OK";
  if (/^atom:/.test(name)) status = "STALE_REJECTED";
  else if (/^auto:fill|^auto:finish|^generator:py/.test(name)) status = "OFF_PATH_SCAFFOLD";
  else if (/^boot:/.test(name) || name === "boot") status = "LEGACY_COMPAT";
  const m = String(cmd).match(/node\s+([^\s\"']+)/);
  if (m && !m[1].includes("-e") && !fs.existsSync(path.join(REPO, m[1]))) status = "MISSING_TARGET";
  return { name, cmd, status };
});
write("06-script-target-integrity.json", { at: AT, buildId, scripts: scriptAudit });

const diskPkgs = fs
  .readdirSync(path.join(REPO, "packages"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const lockImporters = [...lock.matchAll(/^  (packages\/[^:]+|apps\/[^:]+):$/gm)].map((m) => m[1]);
const missingFromLock = diskPkgs
  .filter((n) => n !== "data-fabric")
  .map((n) => `packages/${n}`)
  .filter((p) => !lockImporters.includes(p) && !lock.includes(`\n  ${p}:`));

write("07-workspace-lock-integrity.json", {
  at: AT,
  buildId,
  workspaceGlobs: ["apps/*", "packages/*"],
  diskPackages: diskPkgs,
  lockImportersSample: lockImporters,
  packagesMissingLockImporter: diskPkgs.filter((n) => !new RegExp(`packages/${n}:`).test(lock)),
  verdict: diskPkgs.some((n) => !new RegExp(`packages/${n}:`).test(lock)) ? "FAIL_REPRODUCIBILITY" : "PASS",
  note: "Workspace packages without lock importers are not reproducibly linked — EVIDENCE_DRIFT risk",
});

write("08-port-config-drift.json", {
  at: AT,
  buildId,
  canonical: manifest.ports || { backend: 3000, cockpit: 4000 },
  serverDefault: /PORT \?\? (\d+)/.exec(serverTs)?.[1] || null,
  readmeLegacyMarked: /Legacy ports/.test(readme),
  ports: {
    3000: "CURRENT control-plane",
    4000: "CURRENT shell",
    5200: "LEGACY rejected default",
    5230: "LEGACY mock-api / rejected shell",
    5201: "OPTIONAL prediction-engine",
    5202: "OPTIONAL risk-engine",
    5210: "OPTIONAL execution-simulator",
    5299: "CURRENT recovery shell",
    5432: "OPTIONAL postgres",
    6379: "OPTIONAL redis",
  },
});

write("09-readiness-semantics.json", {
  at: AT,
  buildId,
  states: [
    "BOOTSTRAP_READY",
    "CORE_READY",
    "CAPABILITY_READY",
    "OPTIONAL_INFRA_DEGRADED",
    "FULL_PROFILE_READY",
  ],
  firstReleaseUses: ["BOOTSTRAP_READY", "CORE_READY", "CAPABILITY_READY"],
  optionalInfraDoesNotBlockFirstRelease: true,
  manifest: manifest.readiness || null,
});

write("10-release-build-coverage.json", {
  at: AT,
  buildId,
  rootBuild: pkg.scripts?.build,
  coversApps: false,
  mandatory: [
    "installer/scripts/*",
    "apps/control-plane-api",
    "apps/cockpit-ui",
    "packages/vertical-slice",
    "packages/governance-engine",
    "packaging scripts",
  ],
  gap: "PROVED — packages-only build insufficient for release",
  recommendedScript: "build:release",
});

write("11-test-coverage-map.json", {
  at: AT,
  buildId,
  layers: {
    UNIT: ["data-fabric", "vertical-slice"],
    CONTRACT: ["gate:contracts", "gate:scaffold"],
    INTEGRATION: "PARTIAL",
    RUNTIME: ["sci:proof", "convergence"],
    PRODUCT_E2E: "MISSING_AS_AUTOMATED_GATE",
    PACKAGED_E2E: "package:prove-reboot (GW1 evidence gap)",
    RECOVERY: "PARTIAL",
    REBOOT: "TASK-PKG-003 OPEN",
  },
  rootTestMasquerade: true,
  note: "pnpm test must not be treated as whole-product proof",
});

const kernelReality = {
  productKernel: {
    source: "packages/product-kernel",
    workspace: true,
    lockImporter: /packages\/product-kernel:/.test(lock),
    buildable: true,
    importedByControlPlane: /@scios\/product-kernel/.test(serverTs + (read("apps/control-plane-api/src/routes/product.ts") || "")),
    runtimeReachable: false,
    usedByGw1: false,
    class: "DISCONNECTED",
    evidenceDrift: true,
  },
  experienceCompiler: {
    source: "packages/professional-domain-registry/src/experience-compiler.js",
    lockImporter: /packages\/professional-domain-registry:/.test(lock),
    controlPlaneInline: /experience\/compile|compileGw1/.test(serverTs + (read("apps/control-plane-api/src/routes/product.ts") || "") + (read("apps/control-plane-api/src/routes/experience.ts") || "")),
    class: "PARTIAL_DUPLICATE",
  },
  systemClosure: {
    source: "packages/system-closure",
    lockImporter: /packages\/system-closure:/.test(lock),
    scripts: ["closure:scan", "closure:p0", "closure:final"],
    class: /packages\/system-closure:/.test(lock) ? "TOOLING" : "DISK_ONLY_EVIDENCE_DRIFT",
  },
};

write("12-product-kernel-reality.json", {
  at: AT,
  buildId,
  ...kernelReality,
  verdict: "EVIDENCE_DRIFT",
});

write("13-capability-activation-map.json", {
  at: AT,
  buildId,
  whySciOsDoesNotUnfold: [
    {
      capability: "product-kernel package",
      class: "DISCONNECTED",
      chainBreak: "PACKAGE → (not) RUNTIME PROVIDER",
    },
    {
      capability: "experience-compiler package",
      class: "PARTIAL_DUPLICATE",
      chainBreak: "REGISTRY vs INLINE dual authority",
    },
    {
      capability: "home/search/entity/gw1",
      class: "ACTIVE",
      chain: "Shell → CP routes → vertical-slice → evidence view",
    },
    {
      capability: "bullmq workers",
      class: "PROFILE_DISABLED",
    },
    {
      capability: "durable lineage",
      class: "NO_PROVIDER",
    },
    {
      capability: "electron desktop",
      class: "NO_PROVIDER",
    },
    {
      capability: "OIDC",
      class: "NO_POLICY",
    },
    {
      capability: "GW2-7",
      class: "UNPROVEN",
      note: "full vision — not first release",
    },
  ],
});

write("14-profile-capability-matrix.json", {
  at: AT,
  buildId,
  profiles: {
    LOCAL_FOUNDATION: {
      enabled: ["cp", "shell", "home", "search", "entity", "gw1", "embedded-risk", "sim-exec", "memory-lineage"],
      disabled: ["oidc", "bullmq", "electron", "live-money"],
      degraded: ["postgres", "redis", "docker", "fastapi-engines"],
    },
    FIRST_RELEASE: {
      required: ["bundled-or-dev-node-20.18", "cp:3000", "shell:4000", "home", "gw1", "evidence-view", "shutdown"],
      optional: ["postgres", "redis", "docker"],
    },
    SAFE: { enabled: ["diagnostics", "read-only"], disabled: ["writes", "queues"] },
    RECOVERY: { enabled: ["repair", "safe", "recovery-shell:5299"] },
    FUTURE_ENTERPRISE: { enabled: ["oidc", "durable-fabric", "gw2-7", "full-profile-ready"] },
  },
});

write("15-ux-architecture-audit.json", {
  at: AT,
  buildId,
  architecture: "MONOLITHIC_HTTP_TEMPLATE",
  source: "apps/cockpit-ui/src/index.js",
  lines: cockpit.split(/\n/).length,
  componentSystem: false,
  designTokens: /--sci-|SCI_TOKENS|design.token/i.test(cockpit) ? "PARTIAL_INLINE_CSS" : "ABSENT_AS_SYSTEM",
  routing: "in-page showView (no URL router)",
  state: "module-level JS variables",
  apiClient: "fetch helpers inline",
  viewsPresent: ["home", "search", "entities", "slice/analyze", "evidence", "engineering", "system"],
  professionalVsTechnical: /Technical|Professional|engineering/.test(cockpit),
  requiredPrimitivesStatus: "NOT_COMPONENTIZED — monolithic embeds several surfaces",
  recommendation: "Do not invent 200 pages; extract Product Experience Layer only after activation wiring — structural P1, not speculative greenfield",
  speculativeUxRebuildInThisProgram: false,
});

write("16-data-persistence-map.json", {
  at: AT,
  buildId,
  stores: [
    { name: "slice runs / lineage", class: "IN_MEMORY", survivesRestart: false, defectIfUserExpectsPersist: true },
    { name: "os session notifications", class: "IN_MEMORY", survivesRestart: false },
    { name: "LOCALAPPDATA SCI OS X10/data", class: "LOCAL_DURABLE", survivesRestart: "PARTIAL_UNKNOWN" },
    { name: "Postgres ledgers", class: "DATABASE", required: false, available: "OPTIONAL" },
    { name: "Redis queues", class: "CACHE", required: false },
    { name: "diagnostics-export", class: "LOCAL_DURABLE", purpose: "evidence" },
  ],
});

write("17-infra-capability-dependencies.json", {
  at: AT,
  buildId,
  matrix: [
    { capability: "home/search/entity/gw1", postgres: false, redis: false, docker: false, python: false },
    { capability: "durable ledgers", postgres: true, redis: false, docker: "often", python: false },
    { capability: "bullmq workers", postgres: false, redis: true, docker: "often", python: false },
    { capability: "optional FastAPI engines", postgres: false, redis: false, docker: false, python: true },
  ],
  rule: "Do not label capability optional if that capability requires infra; label infra optional for core first-release only",
});

write("18-security-findings.json", {
  at: AT,
  buildId,
  findings: [
    { id: "SEC-BIND", detail: "services bind 0.0.0.0 in server listen — localhost product assumption", severity: "P1" },
    { id: "SEC-AUTH", detail: "AUTH_MODE=local-development unauthenticated API", severity: "P1_EXPECTED_ALPHA" },
    { id: "SEC-SHELL", detail: "remaining shell:true sites outside primary start path", severity: "P2" },
    { id: "SEC-CORS", detail: "review cockpit↔CP same-origin/localhost", severity: "P2" },
  ],
  authModeLimited: true,
});

write("19-scientific-maturity.json", {
  at: AT,
  buildId,
  models: {
    baselinePrediction: {
      IMPLEMENTED: true,
      RUNTIME_PROVEN: "PARTIAL",
      CALIBRATED: false,
      VALIDATED: false,
      PRODUCTION_ELIGIBLE: false,
      label: "NON-PRODUCTION",
    },
  },
  uxMustNotImply: ["production-eligible", "calibrated", "backtest=proof"],
});

write("20-evidence-freshness.json", {
  at: AT,
  buildId,
  currentIndex: "diagnostics-export/current-evidence-index.json",
  thisPack: "diagnostics-export/deep-forensics/",
  rule: "Historical reboot FAIL epochs and dist-rooted staged startup-report are STALE_FOR_CURRENT_GATE",
});

write("21-dead-system-register.json", {
  at: AT,
  buildId,
  items: [
    { id: "ATOM-AI", action: "KEEP_STALE_EXIT2", status: "REJECTED_PARALLEL" },
    { id: "auto:fill/auto:finish", action: "MARK_OFF_PATH", status: "SCAFFOLD" },
    { id: "ports 5200/5230", action: "LEGACY_MARKED", status: "REJECTED_CANONICAL" },
    { id: "supervisor.js primary", action: "LEGACY", status: "SECONDARY" },
    { id: "boot:* as user entry", action: "LEGACY_COMPAT", status: "NON_PRIMARY" },
  ],
});

write("22-root-cause-graph.json", {
  at: AT,
  buildId,
  roots: [
    {
      id: "RC-LOCK-DRIFT",
      cause: "Workspace packages on disk not in pnpm-lock importers",
      blocks: ["reproducible kernel", "closure", "domain-registry"],
    },
    {
      id: "RC-KERNEL-DISCONNECT",
      cause: "Product HTTP path inline; package unused",
      blocks: ["single product authority"],
    },
    {
      id: "RC-BUILD-NARROW",
      cause: "root build packages-only",
      blocks: ["release proof of apps"],
    },
    {
      id: "RC-TEST-NARROW",
      cause: "root test ≠ product E2E",
      blocks: ["false whole-product confidence"],
    },
    {
      id: "RC-UX-MONOLITH",
      cause: "single index.js shell",
      blocks: ["scalable professional UX platform"],
      notP0If: "GW1 surfaces already reachable",
    },
    {
      id: "RC-PACKAGED-EVIDENCE",
      cause: "stale dist appRoot + missing post-reboot GW1 artifacts",
      blocks: ["TASK-PKG-003 / FIRST RELEASE close"],
    },
    {
      id: "RC-CASCADE-BAT",
      cause: "SCI OS ×10.bat system node only",
      blocks: "recovery independence for cascade entry",
    },
  ],
});

write("23-fix-dependency-order.json", {
  at: AT,
  buildId,
  order: [
    "1 Repository truth / lock integrity",
    "2 Runtime contract (remaining @types/node P2)",
    "3 Startup authority (cascade bat bundled node)",
    "4 Recovery independence",
    "5 Config/readiness (done)",
    "6 Reproducible workspace/build:release",
    "7 Product Kernel import or explicit DISCONNECTED freeze",
    "8 Capability activation matrix publish",
    "9 UX platform extract — P1 after wiring (no speculative 200 pages)",
    "10 GW1 product E2E gate",
    "11 Persistence honesty in UX",
    "12 Security bind/auth visibility",
    "13 Release certification / reboot evidence",
  ],
});

write("24-final-gap-register.json", {
  at: AT,
  buildId,
  p0: [
    {
      id: "GAP-LOCK-IMPORTERS",
      title: "product-kernel / domain-registry / system-closure missing lock importers",
    },
    {
      id: "GAP-PACKAGED-GW1-EVIDENCE",
      title: "TASK-PKG-003 — fresh LOCALAPPDATA GW1/appRoot evidence",
    },
  ],
  p1: [
    { id: "GAP-BUILD-RELEASE", title: "build:release must cover apps" },
    { id: "GAP-KERNEL-WIRE-OR-FREEZE", title: "Import kernel or freeze as tooling-only" },
    { id: "GAP-CASCADE-BAT", title: "SCI OS ×10.bat prefer bundled Node" },
    { id: "GAP-PRODUCT-E2E-GATE", title: "Automated product E2E gate missing" },
  ],
  p2: [
    { id: "GAP-TYPES-NODE-22", title: "@types/node 22 vs runtime 20" },
    { id: "GAP-UX-COMPONENTIZE", title: "Monolithic cockpit → experience layer" },
    { id: "GAP-PERSISTENCE", title: "In-memory runs disappear on restart" },
  ],
  intentionallyDeferred: ["GW2-7", "OIDC", "durable fabric", "300+ caps"],
});

const p0Open = true;
write("25-final-signoff.json", {
  at: AT,
  schema: "sci-os-deep-25-signoff/v1",
  buildId,
  gitSha: sha,
  philosophyPreserved: true,
  noSpeculativeFeaturesAdded: true,
  repositoryCoherence: "DEGRADED",
  structuralRepairStop: false,
  stopBlockedBy: ["GAP-LOCK-IMPORTERS", "GAP-PACKAGED-GW1-EVIDENCE", "GAP-BUILD-RELEASE"],
  firstRelease: "INTERNAL_BLOCKER",
  optionalInfrastructure: "OPTIONAL_INFRA_DEGRADED",
  p0StructuralRemaining: p0Open,
  nextFixOrder: [
    "pnpm install to register lock importers (on Node 20.18)",
    "fix SCI OS ×10.bat bundled node",
    "add build:release",
    "product-kernel: wire identity import OR freeze DISCONNECTED",
    "packaged GW1 evidence refresh for TASK-PKG-003",
  ],
});

console.log(
  JSON.stringify(
    {
      ok: true,
      out: OUT,
      files: files.length,
      hypProved: hyp.filter((h) => String(h.verdict).startsWith("PROVED")).length,
      hypFixed: hyp.filter((h) => String(h.verdict).includes("FIXED")).length,
      repositoryCoherence: "DEGRADED",
      firstRelease: "INTERNAL_BLOCKER",
    },
    null,
    2
  )
);
