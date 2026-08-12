#!/usr/bin/env node
"use strict";

/**
 * orchestrator:gen-tests — emit test plan artifacts (not fake PASS tests).
 */
const path = require("node:path");
const { OUT_DIR, readJson, writeJson } = require("./orchestrator/lib.cjs");

const manifest = readJson(path.join(OUT_DIR, "scaffold-manifest.json"));
if (!manifest) {
  console.error(JSON.stringify({ step: "gen-tests", ok: false, error: "run orchestrator:scaffold first" }));
  process.exit(1);
}

const plans = (manifest.scaffolds ?? []).map((s) => ({
  surfaceId: s.surfaceId,
  adapterDir: s.dir,
  adapterFile: s.index,
  suggestedTestFile: `${s.dir}/index.test.ts`,
  cases: [
    { id: "adapter_class_exists", expect: "Adapter export present" },
    { id: "returns_unknown_without_evidence", expect: "UNKNOWN until implemented" },
    { id: "readme_documents_ifeaturestore", expect: "IFeatureStoreAdapter noted" },
  ],
  verdict: "PLANNED",
  note: "No test files written automatically — plan only",
}));

const out = {
  at: new Date().toISOString(),
  source: "scaffold-manifest.json",
  plans,
  testsGenerated: 0,
  label: "ALPHA_NON_PRODUCTION",
};

const file = writeJson("test-plan.json", out);
console.log(JSON.stringify({ step: "gen-tests", ok: true, file, plans: plans.length }, null, 2));
