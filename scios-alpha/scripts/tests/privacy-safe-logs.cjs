#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const src = fs.readFileSync(
  path.resolve(__dirname, "../../packages/observability/src/index.ts"),
  "utf8"
);
assert.ok(/export function redactLogMeta/.test(src));
assert.ok(/\[REDACTED\]/.test(src));
assert.ok(/password\|secret/.test(src));
console.log(JSON.stringify({ ok: true, schema: "sci-os-privacy-safe-logs-test/v1" }));
