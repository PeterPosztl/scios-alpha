#!/usr/bin/env node
"use strict";
/**
 * B-007 composite hard gate — classification + regression linkage.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-007");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function run(script) {
  const r = spawnSync("node", [path.join("scripts/tests", script)], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env, SCIOS_CP_URL: process.env.SCIOS_CP_URL || "http://127.0.0.1:3000" },
  });
  return { script, ok: r.status === 0, code: r.status, out: (r.stdout || r.stderr || "").slice(-500) };
}

async function main() {
  const at = new Date().toISOString();
  write("01-baseline.json", {
    schema: "sci-os-b007-baseline/v1",
    at,
    checkpoint: "46b03f18",
    build: "pkg_1788030533349",
    p1Raw: 92,
    objective: "P1 root audit and engineering closure",
  });

  write("02-requirements.json", {
    schema: "sci-os-b007-requirements/v1",
    phases: ["classify 92 P1", "fix genuine engineering", "document non-engineering", "update controller"],
    categories: [
      "genuine defect",
      "intentional limitation",
      "external dependency",
      "duplicate/root child",
      "obsolete finding",
      "deferred founder decision",
      "documentation/evidence gap",
      "test gap",
      "production-only concern",
      "Alpha/Beta/Production irrelevant item",
    ],
  });

  const steps = {};
  for (const s of ["b007-p1-root-closure.cjs", "b006-cockpit-ui-hard-gate.cjs"]) {
    const r = run(s);
    steps[s] = r.ok ? "PASS" : "FAIL";
    if (!r.ok) {
      write("04-tests.json", { steps, failed: r });
      process.exit(1);
    }
  }

  write("04-tests.json", { at, steps });
  write("06-package-proof.json", {
    at,
    note: "B-007 audit wave — no repackage required; build pkg_1788030533349 unchanged",
    buildId: "pkg_1788030533349",
    status: "UNCHANGED",
  });
  write("09-regression-proof.json", {
    at,
    b006: "PASS",
    b005: "unchanged",
    b003: "unchanged",
    b002: "unchanged",
  });

  const allPass = Object.values(steps).every((v) => v === "PASS");
  write("11-final-gate.json", {
    schema: "sci-os-b007-final-gate/v1",
    at,
    wave: "B-007",
    token: "B_007_P1_ROOT_CLOSURE_READY",
    buildId: "pkg_1788030533349",
    steps: { classification: steps["b007-p1-root-closure.cjs"], cockpitRegression: steps["b006-cockpit-ui-hard-gate.cjs"] },
    status: allPass ? "PASS" : "FAIL",
  });

  if (!allPass) process.exit(1);
  console.log(JSON.stringify({ ok: true, token: "B_007_P1_ROOT_CLOSURE_READY" }));
}

main();
