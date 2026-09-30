/**
 * Independent verify for the SCI OS x10 master execution box.
 * The registry can only observe its own compose, so it emits UNKNOWN for every
 * fabric / engine / cockpit claim. This resolves those claims against the real
 * files and writes evidence. A claim never becomes PASS without a match here.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const read = (rel) => {
  const p = path.resolve(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
};

const WORLD = "packages/data-fabric/src/world-connector.ts";
const PIPE = "packages/data-fabric/src/pipeline-contracts.ts";
const ROUTES = "apps/control-plane-api/src/routes/engine-suite.ts";
const TOKENS_CSS = "packages/design-system/src/tokens.css";
const TOKENS_JS = "packages/design-system/src/tokens.js";
const PRIMITIVES = "apps/cockpit-ui/src/components/primitives.js";
const SHELL = "apps/cockpit-ui/src/index.js";
const HERO = "apps/cockpit-ui/src/hero-v3.js";
const I18N = "apps/cockpit-ui/src/i18n.js";

/** Each claim maps to the checklist key the registry left UNKNOWN. */
const CLAIMS = [
  {
    group: "backend",
    id: "dataFabricObjects",
    files: [WORLD, PIPE],
    needs: [
      "WorldFeedModeSchema",
      "simulated_alpha",
      "live_unverified",
      "event/normalized/v1",
      "OhlcBarSchema",
      "NewsEventSchema",
      "MarketRefSchema",
      "ContractRefSchema",
      "resolveInstrumentAlias",
      "FabricSnapshotSchema",
      "ONTOLOGY_SPINE_LABEL",
      "PRODUCES\u2192SUPPORTS\u2192TRAINS\u2192PRODUCES\u2192REQUIRES\u2192PROVES",
      "fabricLedgerActor",
    ],
  },
  {
    group: "backend",
    id: "engineRoutesWired",
    files: [ROUTES],
    needs: [
      '"/v1/ecl/engine/prediction"',
      '"/v1/ecl/engine/risk-eval"',
      '"/v1/ecl/engine/decision"',
      '"/v1/ecl/engine/execution-sim"',
      '"/v1/ecl/engine/lineage"',
      '"/v1/ecl/engine/evidence"',
      '"/v1/ecl/engine/cockpit-compute"',
    ],
  },
  {
    group: "backend",
    id: "lineageHash",
    files: [WORLD],
    needs: ["verifyLineageChain", "hashNormalizedEventId", "prevHash", 'LINEAGE_VERIFIED_DEFAULT = "UNKNOWN"'],
  },
  {
    group: "backend",
    id: "evidenceChain",
    files: [WORLD],
    needs: ["ProofArtifactVerdictSchema", '"PASS"', '"FAIL"', '"UNKNOWN"', '"DEGRADED"'],
  },
  {
    group: "frontend",
    id: "tokens",
    files: [TOKENS_CSS, TOKENS_JS],
    needs: [
      "#F7F8FA",
      "#E8ECF0",
      "#2C333A",
      "#0B1F33",
      "#C8102E",
      "#D6E4F0",
      "#1B7A4E",
      "#B45309",
      "#5C6770",
      "SF Pro Text",
      "--sci-motion-micro: 150ms",
      "--sci-motion: 180ms",
      "--sci-motion-macro: 300ms",
      "--sci-motion-critical: 0ms",
      "prefers-reduced-motion",
      "1180px",
    ],
  },
  {
    group: "frontend",
    id: "primitivesSci",
    files: [PRIMITIVES],
    needs: [
      "createSciButton",
      "createSciBadge",
      "createSciToken",
      "createSciCard",
      "createSciPanel",
      "createSciRibbon",
      "createSciGraph",
      "createSciTimeline",
      "createSciChart",
      "createSciEvidenceBlock",
      "createSciLineageNode",
      "createSciDecisionGate",
      "createSimulationBadge",
      "createSciRiskMatrix",
      "createSciPredictionBand",
    ],
  },
  {
    group: "frontend",
    id: "analyze12col",
    files: [SHELL],
    needs: ["repeat(12,minmax(0,1fr))", "max-width:1180px", "gap:12px", 'data-density="EXPERT"'],
  },
  {
    group: "frontend",
    id: "ribbonStateMachine",
    files: [SHELL],
    needs: [
      "raw_event",
      "normalized_event",
      "pit_feature",
      "baseline_prediction",
      "calibration_uncertainty",
      "independent_risk_gate",
      "governance_decision",
      "deterministic_execution",
      "outcome",
      "immutable_lineage",
      "cockpit_view",
      '[data-status="current"]',
      '[data-status="unknown"]',
      '[data-status="degraded"]',
      '[data-status="critical"]',
      '[data-status="locked"]',
    ],
  },
  {
    group: "frontend",
    id: "missionPanels",
    files: [SHELL],
    needs: [
      "modPredictionPanel",
      "modUncertaintyPanel",
      "modRiskPanel",
      "modDecisionPanel",
      "modSimulationPanel",
      "modEvidencePanel",
      "modLineagePanel",
      "modOpsIntel",
    ],
  },
  {
    group: "frontend",
    id: "truthGraph",
    files: [HERO],
    needs: ["truthGraphSlots", "WorldTick", "NewsEvent", "OhlcBar", "Ontology", "Lineage", "Evidence"],
  },
  {
    group: "frontend",
    id: "familyUxV3",
    files: [HERO],
    needs: ["hero.family", "familyOverline", "evidenceRules"],
  },
  {
    group: "frontend",
    id: "heroV3",
    files: [HERO, SHELL],
    needs: ["applyHeroV3", "HERO_V3_BROWSER_SOURCE", "predictionBandVisible", "reportingDisplayValue"],
  },
  {
    group: "frontend",
    id: "i18nHonesty",
    files: [I18N],
    needs: [
      "fabric.unknown",
      "fabric.degraded",
      "fabric.unverified",
      "fabric.simulated",
      "fabric.critical",
      "fabric.proposal",
    ],
  },
];

function evaluate(claim) {
  const missingFiles = claim.files.filter((f) => read(f) === null);
  if (missingFiles.length) {
    return { id: claim.id, group: claim.group, verdict: "UNKNOWN", missingFiles, missing: [] };
  }
  const blob = claim.files.map((f) => read(f)).join("\n");
  const missing = claim.needs.filter((n) => !blob.includes(n));
  return {
    id: claim.id,
    group: claim.group,
    verdict: missing.length ? "UNKNOWN" : "PASS",
    files: claim.files,
    missing,
  };
}

/**
 * Ribbon spec VI lists locked = GW2-7, but no GW-to-stage mapping exists in the
 * repo, so the state is styled and never emitted. Reported, not invented.
 * Auto-closes once a renderer assigns the status.
 */
function ribbonLockedGap() {
  const blob = [read(SHELL), read(PRIMITIVES)].filter(Boolean).join("\n");
  const styled = blob.includes('[data-status="locked"]');
  // Lookbehind keeps the CSS selector `data-status="locked"` from counting as an emit.
  const emitted = /(?<!-)status\s*=\s*"locked"/.test(blob);
  return {
    id: "ribbonLockedStateUnwired",
    styled,
    emitted,
    open: styled && !emitted,
    spec: "VI · ribbon status locked = GW2-7",
    blockedOn: "no GW2-7 to ribbon-stage mapping exists; mapping is a founder decision",
  };
}

/** Negative control: a detector that cannot fail is not evidence. */
function selfCheck() {
  const sentinel = evaluate({
    group: "selfcheck",
    id: "detector_can_fail",
    files: [WORLD],
    needs: ["__anchor_that_must_never_exist__"],
  });
  return sentinel.verdict === "UNKNOWN" && sentinel.missing.length === 1;
}

async function main() {
  if (!selfCheck()) {
    console.error(JSON.stringify({ error: "verifier_self_check_failed" }));
    process.exit(1);
  }
  const registry = await import(
    require("node:url").pathToFileURL(path.resolve(ROOT, "packages/professional-domain-registry/src/profession-blueprint.js")).href
  );
  const box = registry.masterExecutionBox();
  const results = CLAIMS.map(evaluate);
  const unresolved = results.filter((r) => r.verdict !== "PASS");

  // Honesty guard: compose must never self-declare readiness.
  const flagFlips = [];
  if (box.ready !== false) flagFlips.push("ready");
  if (box.autoTrade !== false) flagFlips.push("autoTrade");
  if (box.durable !== false) flagFlips.push("durable");
  if (box.execution !== false) flagFlips.push("execution");
  if (box.pgDriver !== "ABSENT") flagFlips.push("pgDriver");
  if (box.roles200Validated !== false) flagFlips.push("roles200Validated");

  const literalPass = [];
  ["backend", "frontend"].forEach((g) => {
    const group = box.checklist[g] || {};
    Object.keys(group).forEach((k) => {
      if (group[k] === true) literalPass.push(g + "." + k);
    });
  });

  const out = {
    schema: "sci-os-master-execution-box-verification/v1",
    label: "ALPHA_NON_PRODUCTION",
    generatedBy: "scripts/tests/master-execution-box-verify.cjs",
    note: "Static source verification. PASS = anchors found in real files. Never a READY stamp.",
    ready: false,
    roles200Validated: false,
    composeCounts: {
      roles: box.catalog.rolesSeeded,
      familyOverlays: box.familyUxCount,
      heroes: box.heroCount,
    },
    registryVerdicts: box.checklist,
    verified: results,
    unresolved: unresolved.map((r) => r.id),
    flagFlips,
    literalPass,
    detectorSelfCheck: "PASS",
    knownGaps: [ribbonLockedGap()].filter((g) => g.open),
    ok: flagFlips.length === 0 && literalPass.length === 0,
  };

  const dir = path.resolve(ROOT, "diagnostics-export");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "master-execution-box-verification.json"), JSON.stringify(out, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "master-execution-box.json"), JSON.stringify(box, null, 2) + "\n");

  if (flagFlips.length) {
    console.error(JSON.stringify({ error: "honesty_flag_flipped", flagFlips }));
    process.exit(1);
  }
  if (literalPass.length) {
    console.error(JSON.stringify({ error: "checklist_literal_true_without_evidence", literalPass }));
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      pass: results.filter((r) => r.verdict === "PASS").map((r) => r.id),
      unknown: out.unresolved,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
