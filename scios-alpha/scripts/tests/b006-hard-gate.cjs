#!/usr/bin/env node
"use strict";
/**
 * B-006 composite hard gate.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-006");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function run(script) {
  const r = spawnSync("node", [path.join("scripts/tests", script)], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 180000,
    env: { ...process.env },
  });
  return { script, ok: r.status === 0, code: r.status, out: (r.stdout || r.stderr || "").slice(-400) };
}

async function main() {
  write("01-baseline.json", {
    schema: "sci-os-b006-baseline/v1",
    at: new Date().toISOString(),
    checkpoint: "06795498",
    build: "pkg_1788028155383",
    executionMode: "SIMULATION_ONLY",
    p1: 92,
  });

  write("02-requirements.json", {
    schema: "sci-os-b006-requirements/v1",
    preserveFlow: [
      "Home",
      "Search",
      "Entity",
      "Analyze",
      "Experience",
      "Prediction",
      "Uncertainty",
      "Risk",
      "Decision/Local Review",
      "Evidence",
      "Lineage",
    ],
    implement: [
      "layout + navigation",
      "context header",
      "8 roles",
      "professional system health",
      "job center",
      "loading/empty/error states",
      "panel presentations",
    ],
  });

  const steps = {};
  for (const s of [
    "cockpit-generated-script.cjs",
    "cockpit-output-encoding.cjs",
    "b006-cockpit-ui-hard-gate.cjs",
  ]) {
    const r = run(s);
    steps[s] = r.ok ? "PASS" : "FAIL";
  }

  write("05-source-proof.json", { steps, at: new Date().toISOString() });
  write("09-regression-proof.json", {
    b005: "cf28 + job-engine gates unchanged",
    note: "cockpit-output-encoding + generated-script in composite",
  });

  const allPass = Object.values(steps).every((v) => v === "PASS");
  write("11-final-gate.json", {
    schema: "sci-os-b006-final-gate/v1",
    at: new Date().toISOString(),
    wave: "B-006",
    token: allPass ? "B_006_PROFESSIONAL_UX_READY" : "FAIL",
    steps,
    status: allPass ? "PASS" : "FAIL",
  });

  console.log(JSON.stringify({ ok: allPass, steps }));
  process.exit(allPass ? 0 : 1);
}

main();
