#!/usr/bin/env node
/**
 * gate:contracts — Wave 1 evidence gate (ontology + ledgers + master contract).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const exportDir = join(root, "diagnostics-export");
mkdirSync(exportDir, { recursive: true });
const failures = [];
const evidence = [];

function pass(id, detail) {
  evidence.push({ id, ok: true, detail });
}
function fail(id, detail) {
  failures.push({ id, detail });
  evidence.push({ id, ok: false, detail });
}
function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: true });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

for (const p of [
  "docs/enterprise/MASTER_CONTRACT.md",
  "docs/enterprise/CAPABILITY_REGISTRY.json",
  "packages/data-fabric/src/ontology.ts",
  "packages/data-fabric/src/ledger.ts",
]) {
  if (existsSync(join(root, p))) pass(`file:${p}`, "present");
  else fail(`file:${p}`, "missing");
}

{
  const r = run("pnpm", ["--filter", "@scios/data-fabric", "test"]);
  if (r.code === 0) pass("test:data-fabric", "ontology+ledger tests");
  else fail("test:data-fabric", r.out.slice(-800));
}

{
  const r = run("pnpm", ["--filter", "@scios/data-fabric", "build"]);
  if (r.code === 0) pass("build:data-fabric", "ok");
  else fail("build:data-fabric", r.out.slice(-500));
}

// Master contract must not claim ENTERPRISE GO
{
  const mc = readFileSync(join(root, "docs/enterprise/MASTER_CONTRACT.md"), "utf8");
  if (mc.includes("**Not** ENTERPRISE GO") || mc.includes("Not** ENTERPRISE GO")) {
    pass("honesty:master-contract", "does not claim ENTERPRISE GO");
  } else if (/Current platform verdict:\s*`ALPHA`/i.test(mc)) {
    pass("honesty:master-contract", "ALPHA verdict");
  } else {
    fail("honesty:master-contract", "must declare not ENTERPRISE GO");
  }
}

const proof = {
  gate: "gate:contracts",
  wave: 1,
  at: new Date().toISOString(),
  verdict: failures.length === 0 ? "GO" : "NO_GO",
  failures,
  evidence,
  rule: "No evidence means UNKNOWN, never PASS",
};
writeFileSync(join(exportDir, "gate-contracts-proof.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({ verdict: proof.verdict, failures: failures.length }, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
