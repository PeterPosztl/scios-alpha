"use strict";

/**
 * Canonical SCI OS ×10 process exit contract.
 * ALPHA_NON_PRODUCTION
 *
 * 0 = READY, or DEGRADED with no mandatory blockers (optional infra only)
 * 2 = internal mandatory SCI OS blocker (NO_GO)
 * 3 = external environment blocker preventing usable first-release startup
 *
 * Intentional shutdown after accepted startup is NOT a failure (exit 0).
 */

const SHUTDOWN_REASONS = Object.freeze({
  USER_SHUTDOWN: "USER_SHUTDOWN",
  TEST_SHUTDOWN: "TEST_SHUTDOWN",
  CONVERGENCE_STOP: "CONVERGENCE_STOP",
  SIGNAL_SHUTDOWN: "SIGNAL_SHUTDOWN",
  STARTUP_FAILURE: "STARTUP_FAILURE",
  RUNTIME_CRASH: "RUNTIME_CRASH",
  NO_GO_FINALIZE: "NO_GO_FINALIZE",
});

const INTENTIONAL_SHUTDOWN = new Set([
  SHUTDOWN_REASONS.USER_SHUTDOWN,
  SHUTDOWN_REASONS.TEST_SHUTDOWN,
  SHUTDOWN_REASONS.CONVERGENCE_STOP,
  SHUTDOWN_REASONS.SIGNAL_SHUTDOWN,
]);

const EXTERNAL_BLOCKERS = new Set([
  "PORT_CONFLICT",
  "PROCESS_LOCKED",
  "ROOT_RESOLUTION_FAILED",
  "RUNTIME_MISSING",
  "BUNDLED_RUNTIME_MISSING",
  "BUNDLED_NODE_VERSION_MISMATCH",
]);

function isExternalBlocker(code) {
  const s = String(code || "");
  if (EXTERNAL_BLOCKERS.has(s)) return true;
  if (s.startsWith("PORT_")) return true;
  if (s.startsWith("EXTERNAL_")) return true;
  return false;
}

/**
 * @param {{
 *   verdict: string,
 *   blockers?: string[],
 *   blockerDetails?: unknown[],
 *   shutdownReason?: string | null,
 * }} input
 * @returns {0|2|3}
 */
function exitCodeForVerdict({
  verdict,
  blockers = [],
  blockerDetails = [],
  shutdownReason = null,
}) {
  const v = String(verdict || "").toUpperCase();
  const list = Array.isArray(blockers) ? blockers : [];
  const reason = shutdownReason ? String(shutdownReason) : null;

  // Controlled stop after usable startup must not look like launch failure.
  if (INTENTIONAL_SHUTDOWN.has(reason) && (v === "READY" || v === "DEGRADED")) {
    return 0;
  }

  if (v === "READY" || v === "DEGRADED") {
    // DEGRADED + blockers=[] (or only optional warnings) → accepted
    if (list.length === 0) return 0;
    // Defensive: if verdict says DEGRADED but mandatory blockers leaked in, prefer NO_GO codes
    if (v === "DEGRADED" && list.every((b) => String(b).startsWith("OPTIONAL_"))) {
      return 0;
    }
    if (v === "READY") return 0;
  }

  if (v === "NO_GO" || list.length > 0) {
    if (list.some(isExternalBlocker)) return 3;
    if (
      Array.isArray(blockerDetails) &&
      blockerDetails.some(
        (d) =>
          d &&
          (d.class === "EXTERNAL" ||
            d.kind === "EXTERNAL" ||
            isExternalBlocker(d.code || d.id || d.failureClass))
      )
    ) {
      return 3;
    }
    return 2;
  }

  // Unknown verdict with no blockers — treat as internal failure (do not fake 0)
  return 2;
}

module.exports = {
  exitCodeForVerdict,
  SHUTDOWN_REASONS,
  INTENTIONAL_SHUTDOWN,
  EXTERNAL_BLOCKERS,
  isExternalBlocker,
};
