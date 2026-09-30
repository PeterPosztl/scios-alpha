"use strict";

const fs = require("fs");
const path = require("path");
const { isPackagedLayout, packagedEntries } = require("./packaged-mode.cjs");

/**
 * ONE authority for runtime entry locations.
 * DEVELOPMENT → source/dev entries
 * PACKAGED → installed artifacts only (never apps source checkout paths)
 */
function resolveRuntimeEntries(appRoot, opts = {}) {
  const packaged =
    opts.packaged === true || opts.packaged === false
      ? !!opts.packaged
      : process.env.SCIOS_PACKAGED === "1" ||
        process.env.SCIOS_RUNTIME_MODE === "PACKAGED" ||
        isPackagedLayout(appRoot);

  const searched = [];
  const entries = {};

  function pick(name, candidates, required) {
    let found = null;
    const absCandidates = candidates.map((c) =>
      path.isAbsolute(c) ? c : path.join(appRoot, c)
    );
    for (const abs of absCandidates) {
      searched.push(abs);
      if (fs.existsSync(abs)) {
        found = abs;
        break;
      }
    }
    // Hard guard: packaged must never resolve into apps/** source tree
    if (
      packaged &&
      found &&
      /[\\/]apps[\\/].+[\\/]src[\\/]/i.test(found)
    ) {
      found = null;
    }
    entries[name] = {
      path: found,
      required,
      status: found ? "FOUND" : required ? "MISSING_REQUIRED" : "MISSING_OPTIONAL",
      candidates: absCandidates,
    };
  }

  if (packaged) {
    const pe = packagedEntries(appRoot);
    pick("backend", [pe.backend, "backend/server.cjs"], true);
    pick(
      "cockpit",
      [pe.cockpit, pe.cockpitAlt, "cockpit/index.mjs", "cockpit/index.js"],
      true
    );
    pick("recovery", ["recovery/server.cjs"], false);
    pick("bootOrchestrator", ["installer/scripts/start-sci-os.cjs"], true);
    pick("verticalSliceSmoke", [], false);
    pick("predictionEngine", [], false);
    pick("riskEngine", [], false);
    pick("executionSimulator", [], false);
    pick("electronDesktop", [], false);
    pick("workerQueue", [], false);
    pick("orchestratorApi", [pe.backend, "backend/server.cjs"], false);
  } else {
    pick(
      "backend",
      [
        "apps/control-plane-api/src/server.ts",
        "apps/control-plane-api/dist/server.js",
      ],
      true
    );
    pick("cockpit", ["apps/cockpit-ui/src/index.js"], true);
    pick(
      "recovery",
      ["apps/meta-recovery-control-plane/src/server.ts"],
      false
    );
    pick("verticalSliceSmoke", ["packages/vertical-slice/src/boot-smoke.ts"], true);
    pick(
      "bootOrchestrator",
      ["scripts/boot/index.mjs", "installer/scripts/start-sci-os.cjs"],
      true
    );
    pick("predictionEngine", ["apps/prediction-engine/app/main.py"], false);
    pick("riskEngine", ["apps/risk-engine/app/main.py"], false);
    pick("executionSimulator", ["apps/execution-simulator/src/server.ts"], false);
    pick("electronDesktop", ["apps/desktop/main.js", "desktop/main.js"], false);
    pick("workerQueue", ["apps/workers/queue.js", "packages/workers/src/index.ts"], false);
    pick("orchestratorApi", ["apps/control-plane-api/src/server.ts"], false);
  }

  const missingRequired = Object.entries(entries)
    .filter(([, v]) => v.required && !v.path)
    .map(([k]) => k);

  return {
    ok: missingRequired.length === 0,
    packaged,
    layout: packaged ? "PACKAGED" : "DEVELOPMENT",
    // Convenience aliases matching FIX 01 contract shape
    backend: entries.backend?.path || null,
    cockpit: entries.cockpit?.path || null,
    recovery: entries.recovery?.path || null,
    entries,
    missingRequired,
    searched,
    failureClass: missingRequired.length ? "BUILD_ENTRY_MISSING" : null,
  };
}

module.exports = { resolveRuntimeEntries };
