#!/usr/bin/env node
"use strict";

/**
 * orchestrator:filter — dedupe + license/star filter on GitHub discovery results.
 */
const path = require("node:path");
const { OUT_DIR, readJson, writeJson } = require("./orchestrator/lib.cjs");

const discovery = readJson(path.join(OUT_DIR, "discovery.json"));
if (!discovery) {
  console.error(JSON.stringify({ step: "filter", ok: false, error: "run orchestrator:discover first" }));
  process.exit(1);
}

const ALLOWED_LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "0BSD",
  "Unlicense",
]);
const MIN_STARS = Number(process.env.ORCHESTRATOR_MIN_STARS ?? 10);

const raw = discovery.results ?? [];
const candidates = raw.filter((r) => {
  if (r.license && !ALLOWED_LICENSES.has(r.license)) return false;
  if (typeof r.stars === "number" && r.stars < MIN_STARS) return false;
  return true;
});

const out = {
  at: new Date().toISOString(),
  source: "discovery.json",
  criteria: {
    allowedLicenses: [...ALLOWED_LICENSES],
    minStars: MIN_STARS,
  },
  candidates,
  rejectedCount: raw.length - candidates.length,
};

const file = writeJson("filtered.json", out);
console.log(JSON.stringify({ step: "filter", ok: true, file, candidates: candidates.length }, null, 2));
