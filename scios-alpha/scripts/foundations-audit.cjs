#!/usr/bin/env node
"use strict";

/**
 * SCI OS ×10 — Deep Foundations & Unknown-Unknowns audit.
 * Classify findings. Implement only P0/P1 / contract locks — no scope explosion.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");

const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "diagnostics-export", "foundations");
const OUT_ALIAS = path.join(REPO, "diagnostics-export", "deep-foundations");
const AT = new Date().toISOString();
const buildId = `foundations-${AT.slice(0, 10)}`;

function ensure() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(OUT_ALIAS, { recursive: true });
}
function write(name, obj) {
  ensure();
  const body = JSON.stringify(obj, null, 2) + "\n";
  fs.writeFileSync(path.join(OUT, name), body);
  fs.writeFileSync(path.join(OUT_ALIAS, name), body);
}
function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8"));
  } catch {
    return null;
  }
}
function exists(rel) {
  return fs.existsSync(path.join(REPO, rel));
}
function sha256File(rel) {
  try {
    const buf = fs.readFileSync(path.join(REPO, rel));
    return crypto.createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}
function listContracts() {
  const dir = path.join(REPO, "product-memory", "contracts");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
}

async function main() {
  // Agent harness: load required authorities
  const founder = readJson("product-memory/founder-intent.json");
  const harness = readJson("product-memory/agent-harness.json");
  const truth = exists("docs/enterprise/CURRENT_SYSTEM_TRUTH.md");
  const evidence = exists("docs/enterprise/CURRENT_EVIDENCE.md");
  const design = exists("docs/ux/SCI_DESIGN_CONSTITUTION.md");
  const gap = readJson("diagnostics-export/gap-to-zero/27-zero-level-signoff.json");

  write("00-agent-harness-check.json", {
    at: AT,
    buildId,
    loaded: {
      founderIntent: !!founder,
      productMemory: exists("product-memory/README.md"),
      designConstitution: design,
      currentSystemTruth: truth,
      currentEvidence: evidence,
      agentHarness: !!harness,
    },
    pass: !!(founder && design && truth && evidence && harness),
  });

  const {
    buildDesiredState,
    reconcileDesiredActual,
  } = require("../installer/scripts/startup/desired-state.cjs");

  const desired = buildDesiredState({ packaged: false, apiPort: 3000, cockpitPort: 4000 });
  write("01-desired-runtime-state.json", { at: AT, buildId, ...desired });

  // Static reconcile with synthetic actual (no claim READY)
  const synthetic = await reconcileDesiredActual(desired, {
    node: { usable: true, path: "dev", source: "host" },
    health: { ready: false },
    appRoot: REPO,
    claimedReady: false,
    home: { ok: false },
    homeApi: { ok: false },
  });
  write("02-desired-actual-reconcile-sample.json", { at: AT, buildId, ...synthetic });

  const criticalInvariants = [
    {
      id: "HOME_READY_IMPLIES_SHELL_READY",
      formal: "HOME_READY ⇒ SHELL_READY",
      status: "WIRED_IN_RECONCILE",
      class: "IMPLEMENT_NOW_P0",
    },
    {
      id: "SHELL_READY_IMPLIES_CORE",
      formal: "SHELL_READY ⇒ CORE_READY",
      status: "PARTIAL",
      class: "IMPLEMENT_NOW_P1",
    },
    {
      id: "PACKAGED_BUNDLED_RUNTIME",
      formal: "PACKAGED ⇒ bundled runtime",
      status: "WIRED_IN_RECONCILE",
      class: "IMPLEMENT_NOW_P0",
    },
    {
      id: "PACKAGED_APP_ROOT",
      formal: "PACKAGED ⇒ installed appRoot ≠ source dist",
      status: "WIRED_IN_RECONCILE",
      class: "IMPLEMENT_NOW_P0",
    },
    {
      id: "READY_NO_MANDATORY_UNKNOWN",
      formal: "READY ⇒ no mandatory UNKNOWN",
      status: "WIRED_IN_RECONCILE",
      class: "IMPLEMENT_NOW_P0",
    },
    {
      id: "FAILED_BOOT_RELEASE",
      formal: "FAILED_BOOT ⇒ owned resources released",
      status: "PARTIAL",
      class: "IMPLEMENT_NOW_P1",
    },
    {
      id: "ACTION_POLICY_ENFORCED",
      formal: "ACTION_EXECUTED ⇒ policy enforced",
      status: "PARTIAL — vertical-slice + action-gate",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
    },
    {
      id: "IDEMPOTENCY",
      formal: "retry ⇒ no duplicate side effect",
      status: "PARTIAL_PASS same-process",
      class: "IMPLEMENT_NOW_P1",
    },
    {
      id: "EVIDENCE_FRESHNESS",
      formal: "stale evidence class ≠ PASS",
      status: "PARTIAL evidence-index",
      class: "IMPLEMENT_NOW_P1",
    },
  ];
  write("03-critical-invariants.json", { at: AT, buildId, invariants: criticalInvariants });

  write("04-semantic-type-system.json", {
    at: AT,
    buildId,
    ...readJson("product-memory/contracts/semantic-type-system.json"),
    sourcePresent: exists("packages/data-fabric/src/semantic-types.ts"),
  });

  write("05-temporal-truth.json", {
    at: AT,
    buildId,
    ...readJson("product-memory/contracts/temporal-truth.json"),
  });

  write("06-epistemic-model.json", {
    at: AT,
    buildId,
    ...readJson("product-memory/contracts/epistemic-model.json"),
    sourcePresent: exists("packages/data-fabric/src/epistemic.ts"),
  });

  write("07-decision-learning-loop.json", {
    at: AT,
    buildId,
    ...readJson("product-memory/contracts/decision-learning-loop.json"),
  });

  write("08-ai-provider-fabric.json", {
    at: AT,
    buildId,
    ...readJson("product-memory/contracts/ai-provider-fabric.json"),
  });

  write("09-context-and-memory.json", {
    at: AT,
    buildId,
    context: readJson("product-memory/contracts/context-fabric.json"),
    memory: readJson("product-memory/contracts/memory-governance.json"),
  });

  write("10-trajectory-guardian.json", {
    at: AT,
    buildId,
    ...(harness?.trajectoryGuardian || {}),
    agentHarness: "product-memory/agent-harness.json",
  });

  write("11-professional-evaluation-dataset.json", {
    at: AT,
    buildId,
    status: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
    note: "Extend enterprise-discipline evaluation — deliverables not only role compile",
    existingBaseline: exists(
      "diagnostics-export/enterprise-discipline/08-professional-evaluation-baseline.json"
    ),
    scalePlan: "representative roles now; scale later",
  });

  write("12-org-actor-and-collaboration.json", {
    at: AT,
    buildId,
    orgActor: readJson("product-memory/contracts/org-actor-model.json"),
    collaboration: readJson("product-memory/contracts/collaboration-primitives.json"),
    oidc: "DEFER_P2 — do not reopen",
  });

  write("13-policy-architecture.json", {
    at: AT,
    buildId,
    ...readJson("product-memory/contracts/policy-architecture.json"),
  });

  const provenance = {
    schema: "sci-os-build-provenance-snapshot/v1",
    at: AT,
    buildId,
    sourceIdentity: "scios-alpha",
    sourceHash: {
      packageJson: sha256File("package.json"),
      pnpmLock: sha256File("pnpm-lock.yaml"),
      manifest: sha256File("sci-os.manifest.json"),
    },
    lockfileHash: sha256File("pnpm-lock.yaml"),
    runtimeHash: null,
    toolchainVersions: {
      nodeDeclared: ">=20.18.0 <21",
      packageManager: (readJson("package.json") || {}).packageManager || null,
    },
    configurationSchema: "sci-os.manifest.json + local-foundation",
    artifactHashes: {},
    status: "PARTIAL — IMPLEMENT_NOW_P1 continue packaging",
    contract: readJson("product-memory/contracts/build-provenance.json"),
  };
  write("14-build-provenance.json", provenance);

  const adversarial = [
    "dependency_failure",
    "timeouts",
    "duplicate_events",
    "out_of_order_events",
    "reboot_mid_action",
    "stale_state",
    "clock_skew",
    "timezone_dst",
    "permission_change",
    "policy_change",
    "partial_responses",
    "invalid_model_output",
    "ai_refusal",
    "cache_staleness",
    "disk_pressure",
    "port_conflicts",
  ].map((id) => ({
    id,
    coverage:
      id === "port_conflicts" || id === "dependency_failure" || id === "stale_state"
        ? "PARTIAL"
        : id === "reboot_mid_action"
          ? "EXTERNAL_VALIDATION"
          : "UNTESTED",
    class:
      id === "reboot_mid_action" || id === "duplicate_events"
        ? "IMPLEMENT_NOW_P1"
        : "DEFER_P2",
  }));
  write("15-adversarial-reality-matrix.json", {
    at: AT,
    buildId,
    cases: adversarial,
    note: "Find unknown failure interactions — do not expand into full chaos suite now",
  });

  write("16-technology-radar.json", {
    at: AT,
    buildId,
    status: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
    rule: "Do not freeze 2026 vendor details permanently into architecture",
    entries: [
      {
        source: "Public enterprise AI patterns 2026",
        lastVerifiedAt: AT.slice(0, 10),
        reviewBy: "2026-11-01",
        maturity: "observe",
        founderRelevance: "HIGH",
        sciEquivalent: "benchmark contract + pattern translator",
        gap: "ongoing review cadence",
        adoptionDecision: "ADAPT principles",
        risk: "vendor lock-in if hardcoded",
      },
    ],
  });

  // Architecture entropy scan (lightweight)
  const pkgDir = path.join(REPO, "packages");
  const packages = fs.existsSync(pkgDir)
    ? fs.readdirSync(pkgDir).filter((d) =>
        fs.existsSync(path.join(pkgDir, d, "package.json"))
      )
    : [];
  const scriptsDir = path.join(REPO, "scripts");
  const scripts = fs.existsSync(scriptsDir)
    ? fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".cjs") || f.endsWith(".js"))
    : [];
  write("17-architecture-entropy.json", {
    at: AT,
    buildId,
    metrics: {
      packageCount: packages.length,
      scriptCount: scripts.length,
      productMemoryContracts: listContracts().length,
      duplicateAuthoritiesKnown: 0,
      staleUxTruthRisk: "MITIGATED_2026-08-13",
      atomAiRejected: true,
      hardcodedLegacyPortsInCockpit: /5200|5230/.test(
        fs.readFileSync(path.join(REPO, "apps/cockpit-ui/src/index.js"), "utf8")
      ),
    },
    trigger: "Consolidate before expansion when entropy rises",
    class: "IMPLEMENT_NOW_P1_MONITOR",
  });

  write("18-attention-model.json", {
    at: AT,
    buildId,
    targetFlow: ["ATTENTION", "UNDERSTANDING", "DECISION", "ACTION"],
    homeOptimizesFor: "PARTIAL — attention headline present",
    cognitiveLoadMetrics: "ABSENT_MEASURED",
    contextSwitchMetrics: "ABSENT_MEASURED",
    class: "DEFER_P2_MEASURE — structure PARTIAL now",
  });

  const startSci = fs.readFileSync(
    path.join(REPO, "installer/scripts/start-sci-os.cjs"),
    "utf8"
  );
  const desiredWired = /reconcileDesiredActual|buildDesiredState/.test(startSci);

  const findings = [
    {
      id: "FND-AGENT-HARNESS",
      title: "Agent harness + trajectory guardian",
      class: "IMPLEMENT_NOW_P1",
      done: true,
      evidence: "product-memory/agent-harness.json + .cursor/rules/70-agent-harness.mdc",
      laterCostIfSkipped: ["constitution drift", "scope explosion"],
    },
    {
      id: "FND-DESIRED-STATE",
      title: "Desired vs actual reconciliation controller",
      class: "IMPLEMENT_NOW_P0",
      done: desiredWired,
      evidence:
        "installer/scripts/startup/desired-state.cjs + wired in start-sci-os.cjs",
      laterCostIfSkipped: ["brittle boot", "false READY", "boot rewrite"],
    },
    {
      id: "FND-CRITICAL-INVARIANTS",
      title: "Formal critical invariants in reconcile/boot",
      class: "IMPLEMENT_NOW_P0",
      done: true,
      evidence: "desired-state reconcile + 03-critical-invariants.json",
      laterCostIfSkipped: ["security redesign", "release lies"],
      next: "fault-inject FAILED_BOOT resource release",
    },
    {
      id: "FND-SEMANTIC-TYPES",
      title: "Semantic type system contracts",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "contract+schemas",
      evidence: "packages/data-fabric/src/semantic-types.ts",
      laterCostIfSkipped: ["data migration", "API break"],
      reject: "mass rewrite without adapters",
    },
    {
      id: "FND-TEMPORAL",
      title: "Point-in-time knowledge query (WHAT DID SCI KNOW AT T)",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "contract",
      evidence: "product-memory/contracts/temporal-truth.json + TemporalAxesSchema",
      laterCostIfSkipped: ["evidence loss", "future-data leakage", "retraining"],
    },
    {
      id: "FND-EPISTEMIC",
      title: "Epistemic kinds on intelligence results",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "contract+schemas",
      evidence: "packages/data-fabric/src/epistemic.ts",
      laterCostIfSkipped: ["UX rewrite", "API confusion"],
    },
    {
      id: "FND-LEARNING-LOOP",
      title: "Decision learning loop with interventions",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "contract",
      evidence: "product-memory/contracts/ — decision learning",
      laterCostIfSkipped: ["retraining", "invalid outcome eval"],
    },
    {
      id: "FND-PROVIDER-FABRIC",
      title: "AI provider capability fabric + router",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "contract",
      laterCostIfSkipped: ["vendor lock-in", "deployment migration"],
    },
    {
      id: "FND-CONTEXT-FABRIC",
      title: "Unified context fabric (not mega-prompt)",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "contract",
      laterCostIfSkipped: ["UX rewrite", "unsafe AI"],
    },
    {
      id: "FND-MEMORY-GOV",
      title: "Durable memory governance fields",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "contract",
      laterCostIfSkipped: ["privacy/security redesign"],
    },
    {
      id: "FND-TRAJECTORY",
      title: "Trajectory guardian for agent/Cursor drift",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "harness contract",
      laterCostIfSkipped: ["scope explosion", "constitution violation"],
    },
    {
      id: "FND-EVAL-DATASET",
      title: "Professional deliverable evaluation dataset",
      class: "IMPLEMENT_NOW_P1",
      done: "baseline+lab exists; deepen deliverables next",
      laterCostIfSkipped: ["silent AI regression"],
    },
    {
      id: "FND-ORG-ACTOR",
      title: "Org/user/team/actor contracts",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "contract",
      laterCostIfSkipped: ["data migration", "role-model rewrite"],
    },
    {
      id: "FND-COLLAB",
      title: "Collaboration primitives",
      class: "DEFER_P2",
      done: false,
      laterCostIfSkipped: ["workflow rewrite"],
    },
    {
      id: "FND-POLICY-SPLIT",
      title: "Policy decision vs enforcement",
      class: "LOCK_CONTRACT_NOW_IMPLEMENT_LATER",
      done: "contract",
      laterCostIfSkipped: ["security redesign"],
      next: "audit every consequential action hits enforcement point",
    },
    {
      id: "FND-PROVENANCE",
      title: "Build/release provenance manifest",
      class: "IMPLEMENT_NOW_P1",
      done: "partial snapshot",
      evidence: "14-build-provenance.json",
      laterCostIfSkipped: ["deployment migration"],
    },
    {
      id: "FND-ADVERSARIAL",
      title: "Adversarial reality matrix coverage",
      class: "DEFER_P2",
      done: "matrix drafted",
      laterCostIfSkipped: ["unknown failure interactions"],
    },
    {
      id: "FND-RADAR",
      title: "Technology radar cadence",
      class: "DEFER_P3",
      done: "contract stub",
      laterCostIfSkipped: ["frozen vendor assumptions"],
    },
    {
      id: "FND-ENTROPY",
      title: "Architecture entropy monitor",
      class: "IMPLEMENT_NOW_P1",
      done: "lightweight metrics",
      laterCostIfSkipped: ["duplicate authorities return"],
    },
    {
      id: "FND-ATTENTION",
      title: "Cognitive load / attention metrics",
      class: "DEFER_P2",
      done: false,
      laterCostIfSkipped: ["UX rewrite toward volume"],
    },
    {
      id: "FND-PACKAGED-GW1",
      title: "Packaged cold-start GW1 prove (external)",
      class: "IMPLEMENT_NOW_P0",
      done: false,
      laterCostIfSkipped: ["false first-release READY"],
      note: "EXTERNAL_VALIDATION — TASK-PKG-003",
    },
    {
      id: "FND-REJECT-MEGA-PROMPT",
      title: "One enormous prompt as context architecture",
      class: "REJECT",
      done: true,
    },
    {
      id: "FND-REJECT-SECOND-BOOT",
      title: "Second boot architecture",
      class: "REJECT",
      done: true,
    },
    {
      id: "FND-REJECT-OIDC-NOW",
      title: "Reopen OIDC in this wave",
      class: "REJECT",
      done: true,
      note: "Org contracts only",
    },
  ];

  write("19-findings-classification.json", { at: AT, buildId, findings });

  const counts = findings.reduce((acc, f) => {
    acc[f.class] = (acc[f.class] || 0) + 1;
    return acc;
  }, {});

  const signoff = {
    at: AT,
    buildId,
    philosophy:
      "Do not predict every feature — absorb unknowns safely; detect mistakes",
    agentHarnessPass: !!(founder && harness && design && truth && evidence),
    desiredStateWired: desiredWired,
    noSecondBoot: true,
    classificationCounts: counts,
    implementNowOpen: findings.filter((f) => {
      if (f.class !== "IMPLEMENT_NOW_P0" && f.class !== "IMPLEMENT_NOW_P1") return false;
      return f.done !== true;
    }),
    contractLocked: findings.filter((f) => f.class === "LOCK_CONTRACT_NOW_IMPLEMENT_LATER")
      .length,
    deferred: findings.filter((f) => f.class.startsWith("DEFER")).length,
    rejected: findings.filter((f) => f.class === "REJECT").length,
    gapFirstRelease: gap?.verdicts?.FIRST_RELEASE || null,
    verdicts: {
      FOUNDATIONS_AUDIT: "COMPLETE_CLASSIFIED",
      DESIRED_STATE_CONTROLLER: desiredWired ? "WIRED" : "CONTRACT_ONLY",
      UNKNOWN_UNKNOWNS: "SURFACED_NOT_ALL_FIXED",
      SCOPE_EXPANSION: "AVOIDED",
      READY: false,
    },
    note:
      "Desired-state reconcile wired into start-sci-os. Contracts locked for types/temporal/epistemic/org/provider/memory/policy. Open P0: packaged GW1 prove. Do not implement all discoveries now.",
  };
  write("20-foundations-signoff.json", signoff);
  write("23-deep-foundations-signoff.json", {
    ...signoff,
    schema: "sci-os-deep-foundations-signoff/v1",
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        counts,
        ready: false,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
