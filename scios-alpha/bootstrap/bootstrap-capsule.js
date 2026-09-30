#!/usr/bin/env node
"use strict";

/**
 * bootstrap/bootstrap-capsule.js — Golden Boot thin shell
 *
 * Does NOT spawn backend/cockpit itself (eliminates parallel process framework).
 * Delegates to the canonical capsule:
 *   installer/scripts/bootstrap-capsule.cjs → start-sci-os.cjs
 *
 * Then probes Golden Boot healthChecks and writes diagnostics-export/bootstrap-proof.json.
 *
 * Env:
 *   MANIFEST   golden boot manifest (default: bootstrap/boot-manifest.json)
 *   DRY_RUN=1  validate + probe only (no spawn / no handoff)
 *   NO_HANDOFF=1  probe-only even if not dry-run
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const { spawnSync, execSync } = require("node:child_process");

const ROOT = process.cwd();
const DRY_RUN =
  process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");
const NO_HANDOFF =
  process.env.NO_HANDOFF === "1" || process.argv.includes("--no-handoff");
const manifestPath = path.resolve(
  ROOT,
  process.env.MANIFEST || "bootstrap/boot-manifest.json"
);
const canonicalCapsule = path.join(
  ROOT,
  "installer",
  "scripts",
  "bootstrap-capsule.cjs"
);

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "UNAVAILABLE";
  }
}

function checkHealth(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      const req = lib.get(url, { timeout: timeoutMs }, (res) => {
        res.resume();
        resolve((res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

function writeProof(proof) {
  const dir = path.join(ROOT, "diagnostics-export");
  fs.mkdirSync(dir, { recursive: true });
  const proofPath = path.join(dir, "bootstrap-proof.json");
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  return proofPath;
}

async function probe(manifest) {
  const results = [];
  for (const svc of manifest.services || []) {
    const endpoint = svc.healthEndpoint;
    let healthy = false;
    if (endpoint) {
      for (let i = 0; i < 8; i++) {
        healthy = await checkHealth(endpoint);
        if (healthy) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    results.push({
      name: svc.name,
      healthy,
      status: healthy ? svc.expectedStatus || "READY" : "UNHEALTHY",
      healthEndpoint: endpoint,
      entry: svc.entry,
      spawnedBy: svc.spawnedBy || "canonical-orchestrator",
    });
  }
  const checks = [];
  for (const url of manifest.healthChecks || []) {
    checks.push({ url, ok: await checkHealth(url) });
  }
  return { results, checks };
}

async function main() {
  if (!fs.existsSync(manifestPath)) {
    console.error(
      JSON.stringify({ ok: false, error: "MANIFEST_MISSING", manifestPath })
    );
    process.exit(1);
  }
  if (!fs.existsSync(canonicalCapsule)) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "CANONICAL_CAPSULE_MISSING",
        canonicalCapsule,
      })
    );
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.buildSHA === "REPLACE_WITH_BUILD_SHA") {
    manifest.buildSHA = gitSha();
  }

  console.log(
    JSON.stringify({
      capsule: "golden-boot-thin-shell",
      message: "Delegating to canonical Bootstrap Capsule",
      manifestPath: path.relative(ROOT, manifestPath).replace(/\\/g, "/"),
      canonical: "installer/scripts/bootstrap-capsule.cjs",
      dryRun: DRY_RUN,
      noHandoff: NO_HANDOFF,
      label: "ALPHA_NON_PRODUCTION",
    })
  );

  let handoff = { skipped: true, reason: "dry_run_or_no_handoff" };
  if (!DRY_RUN && !NO_HANDOFF) {
    // Default: gate-style handoff (no --serve) so this shell can probe & exit.
    // Pass --serve only when explicitly requested (interactive one-click).
    const wantServe = process.argv.includes("--serve");
    const extra = process.argv
      .slice(2)
      .filter(
        (a) =>
          a !== "--dry-run" &&
          a !== "--no-handoff" &&
          a !== "--serve" &&
          a !== "--no-open"
      );
    const args = [canonicalCapsule, "--no-open", ...extra];
    if (wantServe) args.splice(1, 0, "--serve");
    const r = spawnSync(process.execPath, args, {
      cwd: ROOT,
      encoding: "utf8",
      env: process.env,
      stdio: "inherit",
    });
    handoff = {
      skipped: false,
      exit: r.status === null ? 1 : r.status,
      command: `node installer/scripts/bootstrap-capsule.cjs${wantServe ? " --serve" : ""} --no-open`,
      note: wantServe
        ? "serve mode blocks until SIGINT — probe runs only after supervisor exits"
        : "gate mode exits after startup; children may remain on Windows",
    };
  }

  const { results, checks } = await probe(manifest);
  const coreOk = results
    .filter((s) => s.name === "backend" || s.name === "cockpit")
    .every((s) => s.healthy);
  const allOk = results.every((s) => s.healthy) && checks.every((c) => c.ok);

  let verdict = "NO_GO";
  if (allOk) verdict = "READY";
  else if (coreOk) verdict = "DEGRADED";

  const proof = {
    timestamp: new Date().toISOString(),
    buildSHA: manifest.buildSHA,
    verdict,
    label: "ALPHA_NON_PRODUCTION",
    parallelSpawnEliminated: true,
    delegatedTo: "installer/scripts/bootstrap-capsule.cjs",
    handoff,
    ports: manifest.ports || null,
    services: results,
    healthChecks: checks,
    note:
      "Golden capsule is a thin shell — never a second orchestrator. expectedStatus is target; verdict is observed.",
  };
  const proofPath = writeProof(proof);
  console.log(
    JSON.stringify(
      {
        ok: verdict !== "NO_GO",
        verdict,
        proof: path.relative(ROOT, proofPath).replace(/\\/g, "/"),
        handoff,
      },
      null,
      2
    )
  );
  process.exit(verdict === "NO_GO" ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
