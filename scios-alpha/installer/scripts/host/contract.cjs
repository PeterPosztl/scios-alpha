"use strict";

/**
 * SCI host layer result contract. Product Kernel must not import Windows APIs.
 * ALPHA_NON_PRODUCTION
 */

function hostResult(partial) {
  const platform =
    partial.platform ||
    (process.platform === "win32"
      ? "win32"
      : process.platform === "darwin"
        ? "darwin"
        : process.platform === "linux"
          ? "linux"
          : process.platform || "unknown");
  return {
    schema: "sci-os-host-result/v1",
    ok: partial.ok !== false,
    platform,
    capability: partial.capability || "unknown",
    observedAt: partial.observedAt || new Date().toISOString(),
    source: partial.source || "installer/scripts/host",
    mode: partial.mode || "LIVE",
    data: partial.data != null ? partial.data : null,
    degraded: partial.degraded === true,
    error: partial.error || null,
    evidence: partial.evidence || null,
  };
}

module.exports = { hostResult };
