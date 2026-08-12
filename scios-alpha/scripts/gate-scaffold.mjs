#!/usr/bin/env node
/**
 * gate:scaffold — Wave 0 evidence gate.
 * Exit 0 only if required checks pass and proof is written.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const exportDir = join(root, "diagnostics-export");
mkdirSync(exportDir, { recursive: true });

const failures = [];
const evidence = [];

function pass(id, detail) {
  evidence.push({ id, kind: "build_execution", ok: true, detail });
}
function fail(id, detail) {
  failures.push({ id, detail });
  evidence.push({ id, kind: "build_execution", ok: false, detail });
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

// 1. packageManager
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (pkg.packageManager?.startsWith("pnpm@")) pass("packageManager", pkg.packageManager);
else fail("packageManager", "missing or not pnpm");

// 2. lockfiles
if (existsSync(join(root, "pnpm-lock.yaml"))) pass("pnpm-lock", "present");
else fail("pnpm-lock", "missing");
if (existsSync(join(root, "package-lock.json"))) {
  fail("npm-lock", "package-lock.json must not exist (pnpm-only)");
} else pass("npm-lock-absent", "ok");

// 3. workspace
if (existsSync(join(root, "pnpm-workspace.yaml"))) pass("workspace", "present");
else fail("workspace", "missing");

// 4. AGENTS + registry + DoD
for (const p of [
  "AGENTS.md",
  "docs/enterprise/CAPABILITY_REGISTRY.json",
  "docs/enterprise/DEFINITION_OF_DONE.json",
]) {
  if (existsSync(join(root, p))) pass(`file:${p}`, "present");
  else fail(`file:${p}`, "missing");
}

// 5. registry honesty — must contain ABSENT enterprise claim
try {
  const reg = JSON.parse(
    readFileSync(join(root, "docs/enterprise/CAPABILITY_REGISTRY.json"), "utf8")
  );
  const absent = (reg.capabilities ?? []).some((c) => c.status === "ABSENT");
  if (absent) pass("registry-honesty", "ABSENT enterprise modules declared");
  else fail("registry-honesty", "must declare ABSENT enterprise scope");
  writeFileSync(
    join(exportDir, "capability-registry-report.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        count: reg.capabilities?.length ?? 0,
        byStatus: Object.fromEntries(
          ["ABSENT", "STUB", "ALPHA", "BETA", "STABLE", "DEPRECATED"].map((s) => [
            s,
            (reg.capabilities ?? []).filter((c) => c.status === s).length,
          ])
        ),
        capabilities: reg.capabilities,
      },
      null,
      2
    )
  );
  pass("registry-report", "diagnostics-export/capability-registry-report.json");
} catch (e) {
  fail("registry-parse", String(e));
}

// 6. build
{
  const r = run("pnpm", ["run", "build"]);
  if (r.code === 0) pass("build", "pnpm build ok");
  else fail("build", r.out.slice(-500));
}

// 7. data-fabric test
{
  const r = run("pnpm", ["--filter", "@scios/data-fabric", "test"]);
  if (r.code === 0) pass("test:data-fabric", "ok");
  else fail("test:data-fabric", r.out.slice(-500));
}

// 8. alpha health
{
  const r = run("pnpm", ["check"]);
  if (r.code === 0) pass("alpha-check", "ok");
  else fail("alpha-check", r.out.slice(-500));
}

const proof = {
  gate: "gate:scaffold",
  at: new Date().toISOString(),
  verdict: failures.length === 0 ? "GO" : "NO_GO",
  failures,
  evidence,
  rule: "No evidence means UNKNOWN, never PASS",
};

writeFileSync(
  join(exportDir, "gate-scaffold-proof.json"),
  JSON.stringify(proof, null, 2)
);

console.log(JSON.stringify({ verdict: proof.verdict, failures: failures.length }, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
