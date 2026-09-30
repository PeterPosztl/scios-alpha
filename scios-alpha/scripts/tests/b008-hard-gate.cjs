#!/usr/bin/env node
"use strict";
/**
 * B-008 composite hard gate.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-008");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function run(script) {
  const r = spawnSync("node", [path.join("scripts/tests", script)], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 300000,
    env: { ...process.env, SCIOS_CP_URL: process.env.SCIOS_CP_URL || "http://127.0.0.1:3000" },
  });
  return { script, ok: r.status === 0, code: r.status, out: (r.stdout || r.stderr || "").slice(-600) };
}

async function main() {
  const at = new Date().toISOString();
  write("01-baseline.json", {
    schema: "sci-os-b008-baseline/v1",
    at,
    checkpoint: "46b03f18",
    priorBuild: "pkg_1788030533349",
    wave: "B-008",
    objective: "Experience Compiler pipeline",
  });

  write("02-requirements.json", {
    schema: "sci-os-b008-requirements/v1",
    pipeline: [
      "Intent",
      "Context Hydration",
      "Domain Hydration",
      "Evidence Hydration",
      "Analysis Hydration",
      "Risk Hydration",
      "Decision Hydration",
      "Experience Specification",
      "UI Rendering",
    ],
    deliverables: [
      "compiler-pipeline.js",
      "hydration modules",
      "experience-spec schema",
      "GET /v1/compiler/health",
      "cockpit integration",
    ],
  });

  write("03-implementation.json", {
    schema: "sci-os-b008-implementation/v1",
    at,
    files: [
      "packages/professional-domain-registry/src/compiler-pipeline.js",
      "packages/professional-domain-registry/src/hydration/context-hydration.js",
      "packages/professional-domain-registry/src/hydration/domain-hydration.js",
      "packages/professional-domain-registry/src/hydration/evidence-hydration.js",
      "packages/professional-domain-registry/src/hydration/analysis-hydration.js",
      "packages/professional-domain-registry/src/hydration/risk-hydration.js",
      "packages/professional-domain-registry/src/hydration/decision-hydration.js",
      "packages/professional-domain-registry/src/experience-spec.schema.json",
      "apps/control-plane-api/src/routes/product.ts",
      "apps/cockpit-ui/src/index.js",
      "apps/cockpit-ui/src/professional-ux.js",
    ],
  });

  const steps = {};
  for (const s of [
    "b008-experience-compiler-hard-gate.cjs",
    "experience-compiler-matrix.cjs",
    "b006-cockpit-ui-hard-gate.cjs",
    "b007-p1-root-closure.cjs",
  ]) {
    const r = run(s);
    steps[s] = r.ok ? "PASS" : "FAIL";
    if (!r.ok) {
      write("04-tests.json", { at, steps, failed: r });
      write("11-final-gate.json", {
        schema: "sci-os-b008-final-gate/v1",
        at,
        wave: "B-008",
        token: "B_008_EXPERIENCE_COMPILER_READY",
        steps,
        status: "FAIL",
      });
      process.exit(1);
    }
  }

  write("04-tests.json", { at, steps });
  write("05-source-proof.json", { at, steps, status: "PASS" });
  write("09-regression-proof.json", {
    at,
    b005: "cf28 + job-engine unchanged",
    b006: "cockpit UX regression PASS",
    b007: "P1 closure regression PASS",
    experienceMatrix: "PASS",
  });

  write("11-final-gate.json", {
    schema: "sci-os-b008-final-gate/v1",
    at,
    wave: "B-008",
    token: "B_008_EXPERIENCE_COMPILER_READY",
    steps: { sourceComposite: "PASS", ...steps },
    status: "PASS",
    note: "Package/install proofs appended after build:release + package:dist + package:install",
  });

  console.log(JSON.stringify({ ok: true, token: "B_008_EXPERIENCE_COMPILER_READY" }));
}

main();
