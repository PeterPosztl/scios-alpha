#!/usr/bin/env node
"use strict";

/**
 * Completion-sweep wiring: tests in release gate, compiler authority, EXE fallback, UX regex.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const pkg = JSON.parse(read("package.json"));
const release = pkg.scripts["test:release"] || "";
for (const t of [
  "correlation-ids.cjs",
  "runtime-security-path.cjs",
  "privacy-safe-logs.cjs",
  "first-release-resilience.cjs",
  "cockpit-output-encoding.cjs",
  "completion-wiring.cjs",
]) {
  assert.ok(release.includes(t), "test:release must invoke " + t);
}

const cockpit = read("apps/cockpit-ui/src/index.js");
const wr = read("apps/cockpit-ui/src/workspace/WorkspaceRenderer.js");
assert.ok(
  wr.includes('id.replace(/^act\\./, "")'),
  "disabled-action matcher must strip act. prefix in WorkspaceRenderer"
);
assert.ok(!/\.innerHTML\s*=/.test(cockpit), "cockpit must not assign innerHTML");

const dist = read("scripts/package/build-distribution.cjs");
assert.ok(dist.includes("write-thin-exe-launcher.cjs"), "thin EXE fallback must be in package pipeline");

const compilerPkg = read("packages/professional-domain-registry/src/experience-compiler.js");
assert.ok(/function compileExperience/.test(compilerPkg));
const ghost = read("packages/experience-compiler/README.md");
assert.ok(/DEPRECATED/.test(ghost));
const ghostSrcFiles = fs.existsSync(path.join(ROOT, "packages/experience-compiler/src"))
  ? fs.readdirSync(path.join(ROOT, "packages/experience-compiler/src")).filter((f) => /\.(js|ts)$/.test(f))
  : [];
assert.strictEqual(ghostSrcFiles.length, 0, "no second compiler implementation files");

const models = read("packages/model-registry/src/index.ts");
assert.ok(/seedNonProductionModels/.test(models));
assert.ok(/NON-PRODUCTION/.test(models));

const cp = read("apps/control-plane-api/src/server.ts");
assert.ok(/\/v1\/models/.test(cp));
assert.ok(/dependencyMetrics/.test(cp));
assert.ok(/function touchWorkerHeartbeat/.test(cp));

console.log(
  JSON.stringify({
    ok: true,
    schema: "sci-os-completion-wiring-test/v1",
    releaseTestsWired: true,
    experienceCompilerAuthority: "@scios/professional-domain-registry/compiler",
    thinExeFallback: true,
  })
);
