"use strict";

const fs = require("fs");
const path = require("path");

function resolveRuntimeEntries(appRoot) {
  const searched = [];
  const entries = {};

  function pick(name, candidates, required) {
    const found = [];
    for (const c of candidates) {
      const abs = path.join(appRoot, c);
      searched.push(abs);
      if (fs.existsSync(abs)) {
        found.push(abs);
        break;
      }
    }
    entries[name] = {
      path: found[0] || null,
      required,
      status: found[0] ? "FOUND" : required ? "MISSING_REQUIRED" : "MISSING_OPTIONAL",
      candidates: candidates.map((c) => path.join(appRoot, c)),
    };
  }

  pick(
    "backend",
    ["apps/control-plane-api/src/server.ts", "apps/control-plane-api/dist/server.js"],
    true
  );
  pick("cockpit", ["apps/cockpit-ui/src/index.js"], true);
  pick("verticalSliceSmoke", ["packages/vertical-slice/src/boot-smoke.ts"], true);
  pick("bootOrchestrator", ["scripts/boot/index.mjs", "installer/scripts/start-sci-os.cjs"], true);
  pick("predictionEngine", ["apps/prediction-engine/app/main.py"], false);
  pick("riskEngine", ["apps/risk-engine/app/main.py"], false);
  pick("executionSimulator", ["apps/execution-simulator/src/server.ts"], false);
  pick("electronDesktop", ["apps/desktop/main.js", "desktop/main.js"], false);
  pick("workerQueue", ["apps/workers/queue.js", "packages/workers/src/index.ts"], false);
  pick("orchestratorApi", ["apps/control-plane-api/src/server.ts"], false);

  const missingRequired = Object.entries(entries)
    .filter(([, v]) => v.required && !v.path)
    .map(([k]) => k);

  return {
    ok: missingRequired.length === 0,
    entries,
    missingRequired,
    searched,
    failureClass: missingRequired.length ? "BUILD_ENTRY_MISSING" : null,
  };
}

module.exports = { resolveRuntimeEntries };
