#!/usr/bin/env node
"use strict";

/**
 * scripts/generate-build-manifest.js
 * Output: build/manifest.json
 *
 * Records git SHA + toolchain versions. Lists known build artifacts when present.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "build");
const OUT_PATH = path.join(OUT_DIR, "manifest.json");

function run(cmd) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "UNAVAILABLE";
  }
}

function collectArtifacts() {
  const candidates = [
    "packages/vertical-slice/dist/index.js",
    "packages/data-fabric/dist/index.js",
    "packages/feature-store/dist/index.js",
    "packages/governance-engine/dist/index.js",
    "packages/observability/dist/index.js",
    "apps/mock-api/dist/server.js",
    "diagnostics-export/startup-report.json",
    "diagnostics-export/p0-startup-signoff.json",
  ];
  return candidates
    .filter((rel) => fs.existsSync(path.join(ROOT, rel)))
    .map((rel) => {
      const abs = path.join(ROOT, rel);
      const st = fs.statSync(abs);
      return {
        path: rel.replace(/\\/g, "/"),
        bytes: st.size,
        mtime: st.mtime.toISOString(),
      };
    });
}

const manifest = {
  buildSHA: run("git rev-parse HEAD"),
  node: run("node -v"),
  pnpm: run("pnpm -v"),
  timestamp: new Date().toISOString(),
  packageName: (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
        .name;
    } catch {
      return null;
    }
  })(),
  label: "ALPHA_NON_PRODUCTION",
  artifacts: collectArtifacts(),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2));
console.log(
  JSON.stringify(
    {
      step: "generate-build-manifest",
      ok: true,
      outPath: "build/manifest.json",
      buildSHA: manifest.buildSHA,
      node: manifest.node,
      pnpm: manifest.pnpm,
      artifacts: manifest.artifacts.length,
    },
    null,
    2
  )
);
