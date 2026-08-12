#!/usr/bin/env node
/**
 * ci:prediction-foundation-gate
 * CI entry for prediction vertical-slice foundation.
 * Verdict: GO | DEGRADED | NO_GO
 * Never claims ENTERPRISE GO.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const exportDir = join(root, "diagnostics-export");
mkdirSync(exportDir, { recursive: true });
const failures = [];
const warnings = [];
const evidence = [];

function pass(id, detail) {
  evidence.push({ id, ok: true, detail });
}
function fail(id, detail) {
  failures.push({ id, detail });
  evidence.push({ id, ok: false, detail });
}
function warn(id, detail) {
  warnings.push({ id, detail });
  evidence.push({ id, ok: true, warn: true, detail });
}
function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: true });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

const SLICE =
  "raw_event → normalized_event → pit_feature → baseline_prediction → calibration_uncertainty → independent_risk_gate → governance_decision → deterministic_execution → outcome → immutable_lineage → cockpit_view";

const PREDICTION_FIXTURE = join(
  root,
  "packages/data-fabric/fixtures/prediction-envelope.normative.json"
);
const RISK_FIXTURE = join(
  root,
  "packages/data-fabric/fixtures/risk-decision-envelope.normative.json"
);

// --- 0. install frozen ---
{
  const r = run("pnpm", ["install", "--frozen-lockfile"]);
  if (r.code === 0) pass("install:frozen", "ok");
  else fail("install:frozen", r.out.slice(-500));
}

// --- 1. required surfaces ---
for (const p of [
  "packages/data-fabric/src/pipeline-contracts.ts",
  "packages/vertical-slice/src/pipeline.ts",
  "packages/data-fabric/fixtures/prediction-envelope.normative.json",
  "packages/data-fabric/fixtures/risk-decision-envelope.normative.json",
  "packages/data-fabric/src/prediction.envelope.test.ts",
  "packages/data-fabric/src/risk.decision.test.ts",
]) {
  if (existsSync(join(root, p))) pass(`file:${p}`, "present");
  else fail(`file:${p}`, "missing");
}

// --- 2. normative fixture shape (structural) ---
function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

try {
  const pred = loadJson(PREDICTION_FIXTURE);
  const need = [
    "predictionId",
    "model",
    "pointEstimate",
    "distribution",
    "predictionInterval",
    "calibration",
    "uncertainty",
    "abstain",
    "featureSnapshotId",
  ];
  const missing = need.filter((k) => !(k in pred));
  if (missing.length) fail("fixture:prediction", `missing keys: ${missing.join(",")}`);
  else if (pred.model?.id !== "baseline-logistic")
    fail("fixture:prediction", "model.id must be baseline-logistic");
  else
    pass("fixture:prediction", "normative prediction envelope present");
} catch (e) {
  fail("fixture:prediction", String(e));
}

try {
  const risk = loadJson(RISK_FIXTURE);
  const need = [
    "riskDecisionId",
    "predictionId",
    "approved",
    "reason",
    "limits",
    "uncertaintyHaircut",
    "killSwitchActive",
  ];
  const missing = need.filter((k) => !(k in risk));
  if (missing.length) fail("fixture:risk", `missing keys: ${missing.join(",")}`);
  else if (risk.reason !== "within limits" && risk.approved === true)
    fail("fixture:risk", "approved=true requires reason within limits");
  else pass("fixture:risk", "normative risk decision envelope present");
} catch (e) {
  fail("fixture:risk", String(e));
}

// --- 3. Zod parse via built package ---
{
  const r = run("pnpm", ["--filter", "@scios/data-fabric", "build"]);
  if (r.code !== 0) fail("build:data-fabric", r.out.slice(-500));
  else {
    pass("build:data-fabric", "ok");
    try {
      const dist = join(root, "packages/data-fabric/dist/pipeline-contracts.js");
      const mod = await import(pathToFileURL(dist).href);
      const pred = loadJson(PREDICTION_FIXTURE);
      const risk = loadJson(RISK_FIXTURE);
      mod.PredictionEnvelopeSchema.parse(pred);
      pass("zod:PredictionEnvelopeSchema", "normative fixture parses");
      mod.RiskDecisionEnvelopeSchema.parse(risk);
      pass("zod:RiskDecisionEnvelopeSchema", "normative fixture parses");
    } catch (e) {
      fail("zod:envelopes", e instanceof Error ? e.message : String(e));
    }
  }
}

// --- 4. unit + slice tests ---
{
  const r = run("pnpm", ["--filter", "@scios/data-fabric", "test"]);
  if (r.code === 0) pass("test:data-fabric", "ok");
  else fail("test:data-fabric", r.out.slice(-800));
}
{
  const r = run("pnpm", ["--filter", "@scios/vertical-slice", "test"]);
  if (r.code === 0) pass("test:vertical-slice", "E2E chain + envelopes");
  else fail("test:vertical-slice", r.out.slice(-1200));
}

// --- 5. foundation gate (delegates + reuses evidence) ---
{
  const r = run("pnpm", ["gate:foundation"]);
  if (r.code === 0) pass("gate:foundation", "GO");
  else fail("gate:foundation", r.out.slice(-800));
}

// --- 6. contract source must declare canonical names ---
{
  const src = readFileSync(
    join(root, "packages/data-fabric/src/pipeline-contracts.ts"),
    "utf8"
  );
  if (!src.includes("PredictionEnvelopeSchema"))
    fail("contract:PredictionEnvelopeSchema", "missing export");
  else pass("contract:PredictionEnvelopeSchema", "declared");
  if (!src.includes("RiskDecisionEnvelopeSchema"))
    fail("contract:RiskDecisionEnvelopeSchema", "missing export");
  else pass("contract:RiskDecisionEnvelopeSchema", "declared");
  if (!src.includes("VERTICAL_SLICE_STAGES"))
    fail("contract:VERTICAL_SLICE_STAGES", "missing");
  else pass("contract:VERTICAL_SLICE_STAGES", "declared");
}

warn(
  "scope:alpha",
  "ci:prediction-foundation-gate GO is ALPHA only — not ENTERPRISE GO"
);

const verdict = failures.length === 0 ? "GO" : "NO_GO";

const proof = {
  gate: "ci:prediction-foundation-gate",
  slice: SLICE,
  at: new Date().toISOString(),
  verdict,
  platformLabel: "ALPHA_NON_PRODUCTION",
  enterpriseClaim: false,
  normativeFixtures: {
    prediction: "packages/data-fabric/fixtures/prediction-envelope.normative.json",
    risk: "packages/data-fabric/fixtures/risk-decision-envelope.normative.json",
  },
  failures,
  warnings,
  evidence,
  rule: "No evidence means UNKNOWN, never PASS",
};

writeFileSync(
  join(exportDir, "ci-prediction-foundation-gate-proof.json"),
  JSON.stringify(proof, null, 2)
);

console.log(
  JSON.stringify(
    {
      verdict: proof.verdict,
      failures: failures.length,
      warnings: warnings.length,
      proof: "diagnostics-export/ci-prediction-foundation-gate-proof.json",
    },
    null,
    2
  )
);
process.exit(failures.length === 0 ? 0 : 1);
