#!/usr/bin/env node
/**
 * gate:foundation — first vertical slice evidence gate.
 * Verdict: GO | DEGRADED | NO_GO
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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

for (const p of [
  "packages/vertical-slice/src/pipeline.ts",
  "packages/data-fabric/src/pipeline-contracts.ts",
  "docs/enterprise/CURRENT_SYSTEM_TRUTH.md",
  "diagnostics-export/repository-truth.json",
]) {
  if (existsSync(join(root, p))) pass(`file:${p}`, "present");
  else fail(`file:${p}`, "missing");
}

{
  const r = run("pnpm", ["--filter", "@scios/data-fabric", "test"]);
  if (r.code === 0) pass("test:data-fabric", "ok");
  else fail("test:data-fabric", r.out.slice(-800));
}

{
  const r = run("pnpm", ["--filter", "@scios/vertical-slice", "test"]);
  if (r.code === 0) pass("test:vertical-slice", "E2E chain + determinism");
  else fail("test:vertical-slice", r.out.slice(-1200));
}

{
  const r = run("pnpm", ["--filter", "@scios/vertical-slice", "build"]);
  if (r.code === 0) pass("build:vertical-slice", "ok");
  else fail("build:vertical-slice", r.out.slice(-500));
}

{
  const r = run("pnpm", ["build"]);
  if (r.code === 0) pass("build:packages", "ok");
  else fail("build:packages", r.out.slice(-800));
}

{
  const r = run("pnpm", ["check"]);
  if (r.code === 0) pass("smoke:alpha-check", "ok");
  else fail("smoke:alpha-check", r.out.slice(-500));
}

{
  const files = [
    "packages/vertical-slice/src/pipeline.ts",
    "packages/vertical-slice/src/lineage.ts",
    "apps/execution-simulator/src/server.ts",
  ];
  const hits = [];
  for (const f of files) {
    const t = readFileSync(join(root, f), "utf8");
    if (t.includes("Math.random")) hits.push(f);
  }
  if (hits.length) fail("determinism:no-math-random-foundation", hits.join(", "));
  else pass("determinism:no-math-random-foundation", "clean");
}

warn(
  "scope:alpha",
  "Foundation GO is ALPHA vertical slice only — not ENTERPRISE GO"
);

const verdict = failures.length === 0 ? "GO" : "NO_GO";

const proof = {
  gate: "gate:foundation",
  slice:
    "raw_event → normalized_event → pit_feature → baseline_prediction → calibration_uncertainty → independent_risk_gate → governance_decision → deterministic_execution → outcome → immutable_lineage → cockpit_view",
  at: new Date().toISOString(),
  verdict,
  platformLabel: "ALPHA_NON_PRODUCTION",
  enterpriseClaim: false,
  failures,
  warnings,
  evidence,
  rule: "No evidence means UNKNOWN, never PASS",
};

writeFileSync(
  join(exportDir, "gate-foundation-proof.json"),
  JSON.stringify(proof, null, 2)
);
console.log(
  JSON.stringify(
    {
      verdict: proof.verdict,
      failures: failures.length,
      warnings: warnings.length,
    },
    null,
    2
  )
);
process.exit(failures.length === 0 ? 0 : 1);
