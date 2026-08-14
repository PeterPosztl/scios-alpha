#!/usr/bin/env node
"use strict";

/**
 * First-release runtime spawn path must not use shell:true.
 * Packaging/gates may still use shell:true (P2 residual).
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "../..");
const runtimeFiles = [
  "installer/scripts/start-sci-os.cjs",
  "apps/control-plane-api/src/server.ts",
  "apps/control-plane-api/src/routes/verticalSlice.ts",
  "packages/vertical-slice/src/pipeline.ts",
  "packages/vertical-slice/src/local-durable.ts",
];

const hits = [];
for (const rel of runtimeFiles) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (/shell:\s*true/.test(src)) hits.push(rel);
}

assert.strictEqual(
  hits.length,
  0,
  "first-release runtime must not spawn shell:true: " + hits.join(",")
);

const durable = fs.readFileSync(
  path.join(ROOT, "packages/vertical-slice/src/local-durable.ts"),
  "utf8"
);
assert.ok(durable.includes("runId_path_escape"));
assert.ok(durable.includes("path.relative"));

const validate = fs.readFileSync(
  path.join(ROOT, "installer/scripts/startup/validate-config.cjs"),
  "utf8"
);
assert.ok(/function redactUrl/.test(validate));

const slice = fs.readFileSync(
  path.join(ROOT, "apps/control-plane-api/src/routes/verticalSlice.ts"),
  "utf8"
);
assert.ok(/validateVerticalSliceRequest|SliceRunRequestSchema/.test(slice));

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "sci-os-runtime-security-path-test/v1",
      noShellTrue: runtimeFiles,
      pathEscapeGuard: true,
      redactUrl: true,
    },
    null,
    2
  )
);
