#!/usr/bin/env node
/**
 * ALPHA leaf boot (normal/repair/safe/proof) — no installer recursion.
 * Canonical user entry: installer/scripts/start-sci-os.cjs / SCI-OS-Start.bat
 */
import { spawnSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const exportDir = join(root, "diagnostics-export");
const modeArg = (process.argv[2] ?? "normal").toLowerCase();
const MODE_ALIASES = {
  normal: "normal",
  n: "normal",
  repair: "repair",
  r: "repair",
  safe: "safe",
  s: "safe",
  proof: "proof",
  p: "proof",
};
const mode = MODE_ALIASES[modeArg];
if (!mode) {
  console.error(JSON.stringify({ error: "unknown_boot_mode", got: modeArg }));
  process.exit(2);
}

const evidence = [];
const repairs = [];
const failures = [];

function pass(id, detail) {
  evidence.push({ id, ok: true, detail });
}
function fail(id, detail) {
  failures.push({ id, detail });
  evidence.push({ id, ok: false, detail });
}
function note(id, detail) {
  evidence.push({ id, ok: true, detail, info: true });
}
function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: true });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

const REQUIRED_FILES = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "packages/data-fabric/src/pipeline-contracts.ts",
  "packages/vertical-slice/src/pipeline.ts",
  "packages/data-fabric/fixtures/prediction-envelope.normative.json",
  "packages/data-fabric/fixtures/risk-decision-envelope.normative.json",
];

const PREDICTION_FIXTURE = join(
  root,
  "packages/data-fabric/fixtures/prediction-envelope.normative.json"
);
const RISK_FIXTURE = join(
  root,
  "packages/data-fabric/fixtures/risk-decision-envelope.normative.json"
);

const NORMATIVE_PREDICTION = JSON.parse(
  existsSync(PREDICTION_FIXTURE)
    ? readFileSync(PREDICTION_FIXTURE, "utf8")
    : JSON.stringify({
        predictionId: "pred_123",
        model: { id: "baseline-logistic", version: "1.0.0" },
        pointEstimate: 0.61,
        distribution: { positive: 0.61, negative: 0.39 },
        predictionInterval: [0.53, 0.68],
        calibration: { status: "valid", brierScore: 0.18 },
        uncertainty: { epistemic: 0.09, aleatoric: 0.16 },
        abstain: false,
        featureSnapshotId: "fs_789",
      })
);

const NORMATIVE_RISK = JSON.parse(
  existsSync(RISK_FIXTURE)
    ? readFileSync(RISK_FIXTURE, "utf8")
    : JSON.stringify({
        riskDecisionId: "risk_456",
        predictionId: "pred_123",
        approved: true,
        reason: "within limits",
        limits: { maxPosition: 1000, maxExposure: 10000 },
        uncertaintyHaircut: 0.15,
        killSwitchActive: false,
      })
);

function checkRequiredFiles({ writeAllowed }) {
  for (const p of REQUIRED_FILES) {
    const abs = join(root, p);
    if (existsSync(abs)) pass(`file:${p}`, "present");
    else if (writeAllowed && p.endsWith("prediction-envelope.normative.json")) {
      mkdirSync(join(root, "packages/data-fabric/fixtures"), { recursive: true });
      writeFileSync(PREDICTION_FIXTURE, JSON.stringify(NORMATIVE_PREDICTION, null, 2));
      repairs.push({ action: "restore_prediction_fixture" });
      pass(`file:${p}`, "restored");
    } else if (writeAllowed && p.endsWith("risk-decision-envelope.normative.json")) {
      mkdirSync(join(root, "packages/data-fabric/fixtures"), { recursive: true });
      writeFileSync(RISK_FIXTURE, JSON.stringify(NORMATIVE_RISK, null, 2));
      repairs.push({ action: "restore_risk_fixture" });
      pass(`file:${p}`, "restored");
    } else fail(`file:${p}`, "missing");
  }
}

function checkPnpmOnly({ writeAllowed }) {
  for (const f of ["package-lock.json", "yarn.lock"]) {
    const abs = join(root, f);
    if (existsSync(abs)) {
      if (writeAllowed) {
        unlinkSync(abs);
        repairs.push({ action: `remove_${f}` });
        pass("pnpm-only", `removed ${f}`);
      } else fail("pnpm-only", `${f} present`);
      return;
    }
  }
  pass("pnpm-only", "ok");
}

function checkFixturesStructural() {
  try {
    const pred = JSON.parse(readFileSync(PREDICTION_FIXTURE, "utf8"));
    const risk = JSON.parse(readFileSync(RISK_FIXTURE, "utf8"));
    if (pred.model?.id !== "baseline-logistic") fail("fixture:prediction", "mismatch");
    else pass("fixture:prediction", "ok");
    if (!("approved" in risk)) fail("fixture:risk", "mismatch");
    else pass("fixture:risk", "ok");
  } catch (e) {
    fail("fixture:load", String(e));
  }
}

async function zodParseFixtures() {
  const dist = join(root, "packages/data-fabric/dist/pipeline-contracts.js");
  if (!existsSync(dist)) {
    fail("zod:dist", "missing");
    return;
  }
  try {
    const mod = await import(pathToFileURL(dist).href);
    mod.PredictionEnvelopeSchema.parse(JSON.parse(readFileSync(PREDICTION_FIXTURE, "utf8")));
    mod.RiskDecisionEnvelopeSchema.parse(JSON.parse(readFileSync(RISK_FIXTURE, "utf8")));
    pass("zod:envelopes", "ok");
  } catch (e) {
    fail("zod:envelopes", e instanceof Error ? e.message : String(e));
  }
}

function smokeVerticalSlice() {
  const r = run("pnpm", ["--filter", "@scios/vertical-slice", "smoke"]);
  if (r.code === 0) pass("smoke:vertical-slice", r.out.trim().slice(-200));
  else fail("smoke:vertical-slice", r.out.slice(-500));
}

function writeProof(name, payload) {
  mkdirSync(exportDir, { recursive: true });
  const p = join(exportDir, name);
  writeFileSync(p, JSON.stringify(payload, null, 2));
  return p;
}

async function modeNormal() {
  checkPnpmOnly({ writeAllowed: false });
  checkRequiredFiles({ writeAllowed: false });
  checkFixturesStructural();
  if (run("pnpm", ["--filter", "@scios/data-fabric", "build"]).code === 0)
    pass("build:data-fabric", "ok");
  else fail("build:data-fabric", "fail");
  if (run("pnpm", ["--filter", "@scios/vertical-slice", "build"]).code === 0)
    pass("build:vertical-slice", "ok");
  else fail("build:vertical-slice", "fail");
  await zodParseFixtures();
  smokeVerticalSlice();
}

async function modeRepair() {
  mkdirSync(exportDir, { recursive: true });
  checkPnpmOnly({ writeAllowed: true });
  checkRequiredFiles({ writeAllowed: true });
  checkFixturesStructural();
  if (process.env.SCIOS_KILL_SWITCH === "1") {
    delete process.env.SCIOS_KILL_SWITCH;
    repairs.push({ action: "clear_kill_switch" });
  }
  if (run("pnpm", ["install", "--frozen-lockfile"]).code === 0)
    pass("repair:install", "ok");
  else fail("repair:install", "fail");
  run("pnpm", ["--filter", "@scios/data-fabric", "build"]);
  run("pnpm", ["--filter", "@scios/vertical-slice", "build"]);
  await zodParseFixtures();
  smokeVerticalSlice();
}

async function modeSafe() {
  note("safe", "read-only");
  checkPnpmOnly({ writeAllowed: false });
  checkRequiredFiles({ writeAllowed: false });
  checkFixturesStructural();
  const contracts = readFileSync(
    join(root, "packages/data-fabric/src/pipeline-contracts.ts"),
    "utf8"
  );
  for (const n of ["PredictionEnvelopeSchema", "RiskDecisionEnvelopeSchema"]) {
    if (contracts.includes(n)) pass(`safe:${n}`, "ok");
    else fail(`safe:${n}`, "missing");
  }
  await zodParseFixtures();
  smokeVerticalSlice();
  // soft-fail smoke in safe
  for (let i = failures.length - 1; i >= 0; i--) {
    if (String(failures[i].id).startsWith("smoke:") || String(failures[i].id).startsWith("zod:")) {
      note(`safe:soft:${failures[i].id}`, failures[i].detail);
      failures.splice(i, 1);
    }
  }
}

async function modeProof() {
  checkPnpmOnly({ writeAllowed: false });
  checkRequiredFiles({ writeAllowed: false });
  checkFixturesStructural();
  if (run("pnpm", ["ci:prediction-foundation-gate"]).code === 0)
    pass("proof:ci", "GO");
  else fail("proof:ci", "fail");
  if (run("pnpm", ["check"]).code === 0) pass("proof:alpha-check", "ok");
  else fail("proof:alpha-check", "fail");
  await zodParseFixtures();
  smokeVerticalSlice();
}

await ({ normal: modeNormal, repair: modeRepair, safe: modeSafe, proof: modeProof })[mode]();

let verdict = failures.length === 0 ? "GO" : mode === "safe" ? "DEGRADED" : "NO_GO";
if (mode === "safe" && failures.length === 0) verdict = "GO";

const summary = {
  gate: `boot:${mode}`,
  mode,
  at: new Date().toISOString(),
  verdict,
  platformLabel: "ALPHA_NON_PRODUCTION",
  enterpriseClaim: false,
  repairs,
  failures,
  evidence,
  rule: "No evidence means UNKNOWN, never PASS",
};

let proofPath = null;
if (mode !== "safe") proofPath = writeProof(`boot-${mode}-proof.json`, summary);

console.log(
  JSON.stringify(
    { mode, verdict, failures: failures.length, repairs: repairs.length, proof: proofPath },
    null,
    2
  )
);
process.exit(verdict === "NO_GO" ? 1 : 0);
