#!/usr/bin/env node
"use strict";

/**
 * Agent harness preflight — Cursor must load Product Memory before protected mods.
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const harness = JSON.parse(
  fs.readFileSync(path.join(REPO, "product-memory/agent-harness.json"), "utf8")
);

const missing = [];
for (const rel of harness.requiredLoadsBeforeProtectedModification || []) {
  if (!fs.existsSync(path.join(REPO, rel))) missing.push(rel);
}

const out = {
  schema: "sci-os-agent-harness-preflight/v1",
  at: new Date().toISOString(),
  pass: missing.length === 0,
  missing,
  workflow: harness.workflow,
  trajectoryGuardian: harness.trajectoryGuardian?.status || "UNKNOWN",
};

const diag = path.join(REPO, "diagnostics-export");
fs.mkdirSync(diag, { recursive: true });
fs.writeFileSync(
  path.join(diag, "agent-harness-preflight.json"),
  JSON.stringify(out, null, 2) + "\n"
);

console.log(JSON.stringify(out, null, 2));
process.exit(out.pass ? 0 : 1);
