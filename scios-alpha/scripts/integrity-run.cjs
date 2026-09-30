#!/usr/bin/env node
"use strict";

/**
 * Runner for Universal Integrity Engine (system-closure).
 * Uses dynamic import for ESM package.
 */
const path = require("path");
const { pathToFileURL } = require("url");

async function main() {
  const mod = path.join(
    __dirname,
    "..",
    "packages",
    "system-closure",
    "src",
    "integrity-engine.js"
  );
  const { runIntegrityEngine } = await import(pathToFileURL(mod).href);
  const result = runIntegrityEngine();
  console.log(JSON.stringify(result, null, 2));
  const v = result.signoff?.verdicts || {};
  const hardFail =
    v.REPOSITORY_COHERENCE === "NO_GO" || v.RUNTIME_COHERENCE === "NO_GO";
  process.exit(hardFail ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
