#!/usr/bin/env node
"use strict";

/**
 * CF17 / CF10 identity fields must exist in source (and headers in CP).
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const pipeline = read("packages/vertical-slice/src/pipeline.ts");
const start = read("installer/scripts/start-sci-os.cjs");
const session = read("apps/control-plane-api/src/osSession.ts");
const server = read("apps/control-plane-api/src/server.ts");
const utc = read("packages/vertical-slice/src/utc.ts");

assert.ok(/correlationId:\s*runId/.test(pipeline), "slice correlationId=runId");
assert.ok(/const correlationId = crypto\.randomUUID\(\)/.test(start), "boot correlationId");
assert.ok(/jobId: `job_\$\{randomUUID\(\)\}`/.test(session), "osSession jobId");
assert.ok(/bindRequestIdentity/.test(server), "control-plane request identity");
assert.ok(/x-request-id/.test(server) && /x-correlation-id/.test(server));
assert.ok(/UTC_ISO|isUtcIso/.test(utc));

const identity = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "diagnostics-export/closure/batch_001_P0/build-identity.json"),
    "utf8"
  )
);
assert.ok(identity.buildId, "build-identity.json must carry buildId");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "sci-os-correlation-ids-test/v1",
      fields: ["runId", "correlationId", "jobId", "x-request-id", "buildId"],
      buildId: identity.buildId,
    },
    null,
    2
  )
);
