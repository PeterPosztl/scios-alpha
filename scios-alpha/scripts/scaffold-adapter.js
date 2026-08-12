#!/usr/bin/env node
"use strict";

/**
 * orchestrator:scaffold
 * Input:  diagnostics-export/orchestrator/filtered.json
 * Output: diagnostics-export/orchestrator/adapters/{owner_repo}/README.md + index.ts
 */
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, OUT_DIR, readJson, writeJson, ensureOutDir } = require("./orchestrator/lib.cjs");

const filtered = readJson(path.join(OUT_DIR, "filtered.json"));
if (!filtered) {
  console.error(JSON.stringify({ step: "scaffold", ok: false, error: "run orchestrator:filter first" }));
  process.exit(1);
}

const scan = readJson(path.join(OUT_DIR, "scan.json"), { scans: [] });
const scanByRepo = Object.fromEntries((scan.scans ?? []).map((s) => [s.repo, s]));

const repos = filtered.candidates ?? [];
const adaptersRoot = path.join(ensureOutDir(), "adapters");
fs.mkdirSync(adaptersRoot, { recursive: true });

const scaffolds = [];

for (const r of repos) {
  const slug = r.name.replace(/\//g, "_");
  const dir = path.join(adaptersRoot, slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const scanRow = scanByRepo[r.name];
  const scanNote = scanRow
    ? `\nScan status: ${scanRow.status}${
        scanRow.auditSummary ? `\nAudit: ${JSON.stringify(scanRow.auditSummary)}` : ""
      }`
    : "";

  fs.writeFileSync(
    path.join(dir, "README.md"),
    `Adapter scaffold for ${r.name}\nImplements IFeatureStoreAdapter\n\nSource: ${r.url ?? "unknown"}\nLicense (GitHub): ${r.license ?? "unknown"}${scanNote}\n\nLabel: ALPHA_NON_PRODUCTION — propose-only, not deployed.\n`
  );

  fs.writeFileSync(
    path.join(dir, "index.ts"),
    `/**
 * Adapter scaffold — ${r.name}
 * Implements our_api hooks (IFeatureStoreAdapter).
 * NOT PRODUCTION — implement + prove before integration.
 */
export class Adapter {
  /** @label ALPHA_NON_PRODUCTION */
  adapt(_input: unknown): { status: "UNKNOWN"; reason: string } {
    return { status: "UNKNOWN", reason: "implement our_api hooks here — evidence required" };
  }
}
`
  );

  scaffolds.push({
    surfaceId: r.name,
    dir: path.relative(ROOT, dir).replace(/\\/g, "/"),
    readme: path.relative(ROOT, path.join(dir, "README.md")).replace(/\\/g, "/"),
    index: path.relative(ROOT, path.join(dir, "index.ts")).replace(/\\/g, "/"),
    scanStatus: scanRow?.status ?? "NOT_SCANNED",
  });
}

const out = {
  at: new Date().toISOString(),
  source: "filtered.json",
  adaptersRoot: path.relative(ROOT, adaptersRoot).replace(/\\/g, "/"),
  scaffolds,
  deployed: false,
  note: "Constitution: propose-only; never auto-deploy",
};

const manifest = writeJson("scaffold-manifest.json", out);
console.log(
  JSON.stringify({ step: "scaffold", ok: true, manifest, adapters: scaffolds.length }, null, 2)
);
