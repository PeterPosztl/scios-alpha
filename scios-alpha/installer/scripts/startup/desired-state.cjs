"use strict";

/**
 * Desired vs Actual reconciliation for SCI OS runtime.
 * Extends canonical supervisor/startup — NOT a second boot architecture.
 * ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { TIMEOUT_BUDGET_MS } = require("./timeout-budget.cjs");

/** Machine-readable desired first-release runtime state */
function buildDesiredState(opts = {}) {
  const packaged = !!opts.packaged;
  return {
    schema: "sci-os-desired-runtime-state/v1",
    label: "ALPHA_NON_PRODUCTION",
    profile: opts.profile || "local-foundation",
    packaged,
    components: {
      NodeRuntime: { required: true, bundledIfPackaged: true },
      ControlPlane: { required: true, port: opts.apiPort || 3000, health: "/healthz" },
      Shell: { required: true, port: opts.cockpitPort || 4000, health: "/healthz", home: "/" },
      HomeApi: { required: true, port: opts.apiPort || 3000, path: "/v1/home" },
      VerticalSlice: { required: true, via: "control-plane" },
      PostgreSQL: { required: false, allowedDegraded: true },
      Redis: { required: false, allowedDegraded: true },
      Electron: { required: false, allowedDegraded: true },
    },
    invariants: [
      "SHELL_PORT != CONTROL_PLANE_PORT",
      "HOME_READY ⇒ SHELL_READY",
      "SHELL_READY ⇒ CORE_READY (CP+Shell health)",
      "PACKAGED ⇒ bundled runtime preferred",
      "READY ⇒ no mandatory UNKNOWN",
      "FAILED_BOOT ⇒ resources released (best-effort)",
      "ACTION_EXECUTED ⇒ policy enforcement point",
    ],
    userLaunchTarget: "SHELL",
  };
}

function acceptedStatus(statusCode, expected = [200]) {
  return expected.includes(Number(statusCode));
}

function probe(url, timeoutMs = TIMEOUT_BUDGET_MS.healthProbe, opts = {}) {
  const expected = opts.expected || [200];
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false, error: "timeout", status: 0 }), timeoutMs);
    try {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          clearTimeout(t);
          const status = res.statusCode || 0;
          const body = Buffer.concat(chunks).toString("utf8");
          let ok = acceptedStatus(status, expected);
          let reason = null;
          if (!ok) {
            reason = status === 404 ? "HTTP_404_NOT_READY" : `HTTP_${status}_NOT_READY`;
          }
          if (ok && opts.requireHtmlSciOs) {
            if (!/SCI OS/i.test(body)) {
              ok = false;
              reason = "HOME_HTML_CONTRACT_FAIL";
            }
          }
          if (ok && opts.requireJsonSchema) {
            try {
              const j = JSON.parse(body || "{}");
              if (j.schema !== opts.requireJsonSchema) {
                ok = false;
                reason = "HOME_API_SCHEMA_FAIL";
              }
            } catch {
              ok = false;
              reason = "HOME_API_JSON_FAIL";
            }
          }
          resolve({ ok, status, reason });
        });
      });
      req.on("error", (e) => {
        clearTimeout(t);
        resolve({ ok: false, error: String(e.message || e), status: 0 });
      });
    } catch (e) {
      clearTimeout(t);
      resolve({ ok: false, error: String(e.message || e), status: 0 });
    }
  });
}

/**
 * Reconcile desired vs actual facts gathered by start-sci-os.
 * @param {object} desired
 * @param {object} actual — { node, health, ports, packaged, home, lockReleased?, blockers }
 */
async function reconcileDesiredActual(desired, actual = {}) {
  const gaps = [];
  const passes = [];
  const apiPort = desired.components.ControlPlane.port;
  const shellPort = desired.components.Shell.port;

  if (shellPort === apiPort) {
    gaps.push({ id: "PORT_COLLISION", severity: "P0", detail: "shell==cp" });
  } else {
    passes.push("SHELL_PORT_NE_CP");
  }

  const nodeOk = !!(actual.node && actual.node.usable);
  if (!nodeOk) gaps.push({ id: "NODE_RUNTIME", severity: "P0" });
  else passes.push("NODE_USABLE");

  if (desired.packaged) {
    const bundled =
      actual.node &&
      (actual.node.bundled ||
        String(actual.node.source || "").toLowerCase().includes("bundled") ||
        String(actual.node.path || "").includes(`${path.sep}runtime${path.sep}node`));
    if (!bundled) {
      gaps.push({
        id: "PACKAGED_RUNTIME_NOT_BUNDLED",
        severity: "P0",
        detail: actual.node,
      });
    } else passes.push("PACKAGED_BUNDLED_RUNTIME");

    const appRoot = String(actual.appRoot || "");
    // P0 only if packaged mode is pointed at monorepo source (apps/*/src) without artifacts.
    // Staged dist/SCI-OS-X10 is a valid packaging prove root (not LOCALAPPDATA install).
    const looksLikeSourceTree =
      fs.existsSync(path.join(appRoot, "apps", "control-plane-api", "src", "server.ts")) &&
      !fs.existsSync(path.join(appRoot, "backend", "server.cjs"));
    if (looksLikeSourceTree) {
      gaps.push({ id: "PACKAGED_APP_ROOT_IS_SOURCE_TREE", severity: "P0" });
    } else if (/[\\/]scios-alpha[\\/]dist[\\/]SCI-OS-X10/i.test(appRoot)) {
      passes.push("PACKAGED_STAGED_DIST_OK");
    } else if (appRoot) {
      passes.push("PACKAGED_APP_ROOT_OK");
    }
  }

  const cpReady = !!(actual.health && actual.health.ready);
  const home =
    actual.home ||
    (await probe(`http://127.0.0.1:${shellPort}/`, 4000, {
      expected: [200],
      requireHtmlSciOs: true,
    }));
  const homeApi =
    actual.homeApi ||
    (await probe(`http://127.0.0.1:${apiPort}/v1/home`, 4000, {
      expected: [200],
      requireJsonSchema: "sci-os-home/v1",
    }));

  const shellReady = !!home.ok;
  const homeReady = !!(home.ok && homeApi.ok);

  if (cpReady) passes.push("CORE_HEALTH");
  else gaps.push({ id: "CORE_NOT_READY", severity: "P0" });

  if (shellReady) passes.push("SHELL_READY");
  else gaps.push({ id: "SHELL_NOT_READY", severity: "P0" });

  if (homeReady) {
    if (!shellReady) {
      gaps.push({ id: "HOME_READY_WITHOUT_SHELL", severity: "P0" });
    } else passes.push("HOME_READY_IMPLIES_SHELL");
  } else {
    gaps.push({ id: "HOME_NOT_READY", severity: "P0" });
  }

  const claimedReady = !!actual.claimedReady;
  const unknownMandatory = actual.unknownMandatoryDeps || [];
  if (claimedReady && unknownMandatory.length) {
    gaps.push({
      id: "READY_WITH_MANDATORY_UNKNOWN",
      severity: "P0",
      detail: unknownMandatory,
    });
  } else if (!claimedReady) {
    passes.push("NO_FALSE_READY_CLAIM");
  }

  if (actual.bootFailed && actual.lockReleased === false) {
    gaps.push({ id: "FAILED_BOOT_LOCK_NOT_RELEASED", severity: "P1" });
  }

  const ok = gaps.filter((g) => g.severity === "P0").length === 0;

  return {
    schema: "sci-os-desired-actual-reconcile/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    desiredSummary: {
      packaged: desired.packaged,
      apiPort,
      shellPort,
      userLaunchTarget: desired.userLaunchTarget,
    },
    actualSummary: {
      nodeUsable: nodeOk,
      coreReady: cpReady,
      shellReady,
      homeReady,
      claimedReady,
    },
    passes,
    gaps,
    ok,
    controller: "reconcileDesiredActual — extend start-sci-os; not a second boot",
  };
}

function writeReconcileEvidence(diagDir, report) {
  if (!diagDir) return null;
  try {
    fs.mkdirSync(diagDir, { recursive: true });
    const fp = path.join(diagDir, "desired-state-reconcile.json");
    fs.writeFileSync(fp, JSON.stringify(report, null, 2) + "\n");
    return fp;
  } catch {
    return null;
  }
}

module.exports = {
  buildDesiredState,
  reconcileDesiredActual,
  writeReconcileEvidence,
  acceptedStatus,
  probe,
};
