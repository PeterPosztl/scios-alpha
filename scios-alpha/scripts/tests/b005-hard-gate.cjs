#!/usr/bin/env node
"use strict";
/**
 * Wave B-005 composite hard gate — CF28 + job-engine + regressions.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-005");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function run(script) {
  const r = spawnSync("node", [path.join("scripts/tests", script)], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 180000,
    env: { ...process.env, SCIOS_CP_URL: process.env.SCIOS_CP_URL || "http://127.0.0.1:3000" },
  });
  return { script, ok: r.status === 0, code: r.status, out: (r.stdout || r.stderr || "").slice(-500) };
}

async function main() {
  write("01-baseline.json", {
    schema: "sci-os-b005-baseline/v1",
    at: new Date().toISOString(),
    checkpoint: "873e537f",
    build: "pkg_1788026654253",
    executionMode: "SIMULATION_ONLY",
    postgres: "PROFILE_DISABLED",
    p1: 92,
  });

  write("02-requirements.json", {
    schema: "sci-os-b005-requirements/v1",
    roots: ["CTRL.CF28.validation", "BACKGROUND.job-engine-v1"],
    requirements: [
      "Canonical validation states NOT_VALIDATED|VALIDATED|FAILED|UNKNOWN",
      "Validation evidence + truth invariants",
      "Job-engine v1 lifecycle on CF11 authority",
      "Installed E2E for job-engine + CF28",
      "B-002/B-003 regressions",
    ],
  });

  const steps = {};
  for (const s of ["cf28-b005-hard-gate.cjs", "job-engine-b005-hard-gate.cjs"]) {
    const r = run(s);
    steps[s] = r.ok ? "PASS" : "FAIL";
  }

  write("05-source-proof.json", { steps, at: new Date().toISOString() });
  write("09-regression-proof.json", {
    b002: steps["job-engine-b005-hard-gate.cjs"],
    note: "cf11-b002 and cf14-b003 run inside job-engine-b005-hard-gate",
  });

  const allPass = Object.values(steps).every((v) => v === "PASS");
  write("11-final-gate.json", {
    schema: "sci-os-b005-final-gate/v1",
    at: new Date().toISOString(),
    wave: "B-005",
    token: allPass ? "B_005_BETA_ACCEPTANCE_READY" : "FAIL",
    steps,
    status: allPass ? "PASS" : "FAIL",
  });

  console.log(JSON.stringify({ ok: allPass, steps }));
  process.exit(allPass ? 0 : 1);
}

main();
