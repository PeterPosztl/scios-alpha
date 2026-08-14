#!/usr/bin/env node
"use strict";

/**
 * First-release resilience / recovery / timeout contract tests.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "../..");
const { TIMEOUT_BUDGET_MS, assertBudget } = require(
  path.join(ROOT, "installer/scripts/startup/timeout-budget.cjs")
);
const { scanFirstReleaseControls } = require(
  path.join(ROOT, "scripts/enterprise/scan-first-release-controls.cjs")
);

assertBudget("healthProbe", TIMEOUT_BUDGET_MS.healthProbe);
assertBudget("homeVerify", TIMEOUT_BUDGET_MS.homeVerify);

const desired = fs.readFileSync(
  path.join(ROOT, "installer/scripts/startup/desired-state.cjs"),
  "utf8"
);
assert.ok(desired.includes("timeout-budget"), "desired-state must import timeout-budget");

const safe = fs.readFileSync(
  path.join(ROOT, "installer/scripts/start-sci-os-safe-mode.cjs"),
  "utf8"
);
assert.ok(safe.includes("--mode=safe"));
assert.ok(safe.includes("start-sci-os.cjs"));
assert.ok(!/createServer\s*\(/.test(safe), "safe-mode wrapper must not own HTTP");

const recovery = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "diagnostics-export/closure/batch_001_P0/recovery-proof.json"),
    "utf8"
  )
);
assert.ok(recovery.pass === true, "first-release recovery proof must remain PASS");

const atomic = fs.readFileSync(
  path.join(ROOT, "scripts/package/atomic-install.cjs"),
  "utf8"
);
assert.ok(atomic.includes("app.backup.last"));

const catalog = fs.readFileSync(
  path.join(ROOT, "docs/enterprise/REPAIR_RECIPE_CATALOG.md"),
  "utf8"
);
assert.ok(catalog.length > 40);

const fr = scanFirstReleaseControls();
const required = [
  "CF19.timeout",
  "CF19.safe-mode",
  "CF22.restore-test",
  "CF22.recovery-runbook",
  "CF22.data-loss-detection",
  "CF12.actor",
  "CF16.chain-validation",
  "CF17.correlation-ids",
  "CF17.job-ids",
  "CF17.boot-ids",
  "CF17.build-ids",
  "CF21.durability",
  "CF05.timezone-discipline",
  "CF24.path-traversal",
  "CF24.command-injection",
  "CF24.input-validation",
];
const missing = required.filter((id) => fr[id].status !== "PROVEN");
assert.strictEqual(
  missing.length,
  0,
  "first-release controls not proven: " + missing.join(",")
);

const product = fs.readFileSync(
  path.join(ROOT, "apps/control-plane-api/src/routes/product.ts"),
  "utf8"
);
assert.ok(
  !/compileGw1Experience/.test(product),
  "product.ts must not define a second Experience Compiler"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "sci-os-first-release-resilience-test/v1",
      timeoutBudget: TIMEOUT_BUDGET_MS,
      proven: required,
    },
    null,
    2
  )
);
