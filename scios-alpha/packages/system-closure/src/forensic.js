#!/usr/bin/env node
/**
 * Forensic closure decision — aggregates live + on-disk evidence.
 * Does not invent READY. ALPHA_NON_PRODUCTION.
 *
 * Output: diagnostics-export/forensic/forensic-decision.json
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "diagnostics-export", "forensic");

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  return p;
}

function httpGet(urlPath, port = 3000, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: urlPath, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = Buffer.concat(chunks).toString("utf8");
          try {
            body = JSON.parse(body);
          } catch {
            /* text */
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

async function main() {
  const [healthz, readyz, cockpit] = await Promise.all([
    httpGet("/healthz", 3000),
    httpGet("/readyz", 3000),
    httpGet("/healthz", 4000),
  ]);

  const p0 = read("diagnostics-export/final-closure/p0-after.json");
  const gw1 = read("diagnostics-export/final-closure/golden-workflow-1-proof.json");
  const finalSignoff = read(
    "diagnostics-export/final-closure/final-product-signoff.json"
  );
  const pkgSignoff = read(
    "diagnostics-export/packaging/17-packaging-signoff.json"
  );
  const pkgFirst = read(
    "diagnostics-export/packaging/08-first-launch-proof.json"
  );
  const pkgGw1 = read(
    "diagnostics-export/packaging/09-golden-workflow-packaged-proof.json"
  );
  const pkgNeg = read(
    "diagnostics-export/packaging/10-risk-negative-packaged-proof.json"
  );
  const pkgReboot = read("diagnostics-export/packaging/13-reboot-proof.json");
  const baseline = read(
    "diagnostics-export/packaging/00-pre-package-baseline.json"
  );

  const live = {
    apiHealthz: healthz.status === 200,
    apiReady: readyz.status === 200 && !!readyz.body?.ready,
    cockpit: cockpit.status === 200,
    profile: readyz.body?.profile || null,
  };

  const facts = {
    coreP0: !!(p0?.p0Pass || (live.apiReady && live.cockpit)),
    gw1Passed: !!gw1?.pass,
    riskNegative: !!(
      gw1?.steps?.riskRejectBlocksExecution || pkgNeg?.pass
    ),
    packagedSetupExists: exists("dist/release/SCI-OS-X10-Setup.exe"),
    packagedAppExists:
      exists("dist/SCI-OS-X10/SCI-OS-X10.exe") ||
      exists("dist/SCI-OS-X10/SCI OS X10.cmd"),
    bundledNodeExists: exists("dist/SCI-OS-X10/runtime/node/node.exe"),
    packagedFirstLaunch: !!pkgFirst?.pass,
    packagedGw1: !!pkgGw1?.pass,
    packagedRiskNegative: !!pkgNeg?.pass,
    windowsRebootProven: !!pkgReboot?.pass,
    codeSigning: "NOT_AVAILABLE",
  };

  const openBlockers = [];
  if (!facts.packagedSetupExists && !facts.packagedAppExists) {
    openBlockers.push({
      id: "ERR-PKG-001",
      status: "OPEN",
      detail: "No Setup.exe / packaged application",
    });
  } else {
    openBlockers.push({
      id: "ERR-PKG-001",
      status: "CLOSED",
      detail: "Setup.exe / packaged layout present",
    });
  }

  if (!facts.bundledNodeExists || !facts.packagedFirstLaunch) {
    openBlockers.push({
      id: "ERR-LAUNCH-001",
      status: facts.bundledNodeExists ? "PARTIAL" : "OPEN",
      detail: "Bundled runtime / packaged first launch",
    });
  } else {
    openBlockers.push({
      id: "ERR-LAUNCH-001",
      status: "CLOSED",
      detail: "Bundled Node first-launch proven",
    });
  }

  openBlockers.push({
    id: "ERR-REBOOT-001",
    status: facts.windowsRebootProven ? "CLOSED" : "EXTERNAL_BLOCKER",
    detail: facts.windowsRebootProven
      ? "Host reboot proven"
      : "Host Windows reboot not certified",
  });

  const criticalOpen = openBlockers.filter((b) =>
    ["OPEN", "EXTERNAL_BLOCKER"].includes(b.status)
  );

  let decision = "REQUIRES_FINAL_FIXES";
  if (!facts.coreP0 || !facts.gw1Passed) {
    decision = "NO_GO_CORE";
  } else if (
    criticalOpen.some((b) => b.id === "ERR-REBOOT-001") &&
    facts.packagedGw1 &&
    facts.packagedFirstLaunch
  ) {
    decision = "REQUIRES_FINAL_FIXES";
  } else if (criticalOpen.length === 0 && facts.packagedGw1) {
    decision = "RELEASE_PATH_UNBLOCKED";
  }

  const report = {
    at: new Date().toISOString(),
    schema: "sci-os-forensic-decision/v1",
    label: "ALPHA_NON_PRODUCTION",
    decision,
    live,
    facts,
    blockers: openBlockers,
    evidenceRefs: {
      baseline: baseline ? "diagnostics-export/packaging/00-pre-package-baseline.json" : null,
      p0: "diagnostics-export/final-closure/p0-after.json",
      gw1: "diagnostics-export/final-closure/golden-workflow-1-proof.json",
      finalProduct: finalSignoff?.verdict || null,
      packaging: pkgSignoff?.verdict || null,
    },
    provenFunctionality: [
      facts.coreP0 ? "core P0 startup" : null,
      facts.gw1Passed ? "Golden Workflow #1" : null,
      facts.riskNegative ? "risk REJECT → NO_ACTION" : null,
      facts.packagedFirstLaunch ? "packaged first launch" : null,
      facts.packagedGw1 ? "packaged GW1" : null,
    ].filter(Boolean),
    rootBlockersStillOpen: criticalOpen.map((b) => b.id),
    nextActions: criticalOpen.map((b) => {
      if (b.id === "ERR-REBOOT-001") {
        return "Restart Windows → click SCI OS X10 only → pnpm package:prove-reboot";
      }
      return b.detail;
    }),
    note: "Forensic decision from evidence artifacts + live probes. File presence ≠ READY.",
  };

  write("forensic-decision.json", report);
  write("forensic-blockers.json", {
    at: report.at,
    blockers: openBlockers,
    decision,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        decision,
        live,
        rootBlockersStillOpen: report.rootBlockersStillOpen,
        out: "diagnostics-export/forensic/forensic-decision.json",
      },
      null,
      2
    )
  );

  process.exit(decision === "NO_GO_CORE" ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
