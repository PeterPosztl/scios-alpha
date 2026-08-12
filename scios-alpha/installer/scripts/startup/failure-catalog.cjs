"use strict";

/**
 * Canonical failure catalog — user-facing + operational metadata.
 * Never treat unknown as healthy.
 */
const FAILURES = {
  ROOT_RESOLUTION_FAILED: {
    title: "Installation not found",
    impact: "SCI OS cannot start",
    retryable: true,
    autoRepair: false,
    nextAction: "Launch from the SCI OS folder or set SCIOS_APP_ROOT",
  },
  RUNTIME_MISSING: {
    title: "Node runtime missing",
    impact: "No executable runtime",
    retryable: true,
    autoRepair: false,
    nextAction: "Install Node.js 20+ or provide runtime/node",
  },
  RUNTIME_INCOMPATIBLE: {
    title: "Node version incompatible",
    impact: "Runtime cannot run SCI OS",
    retryable: true,
    autoRepair: false,
    nextAction: "Upgrade to Node.js 20+",
  },
  BUILD_ENTRY_MISSING: {
    title: "Required program entry missing",
    impact: "Backend or cockpit cannot start",
    retryable: true,
    autoRepair: true,
    nextAction: "Run Repair Mode / rebuild packages",
  },
  CONFIG_MISSING: {
    title: "Required configuration missing",
    impact: "Startup blocked",
    retryable: true,
    autoRepair: true,
    nextAction: "Restore defaults or set required env vars",
  },
  CONFIG_INVALID: {
    title: "Configuration invalid",
    impact: "Startup blocked",
    retryable: true,
    autoRepair: false,
    nextAction: "Fix configuration; see redacted report",
  },
  PERMISSION_DENIED: {
    title: "Permission denied",
    impact: "Cannot access Docker or files",
    retryable: true,
    autoRepair: false,
    nextAction: "Fix permissions or run with appropriate rights",
  },
  DOCKER_CLI_MISSING: {
    title: "Docker CLI not installed",
    impact: "Container-based deps unavailable",
    retryable: false,
    autoRepair: false,
    nextAction: "Install Docker Desktop (optional for ALPHA spine)",
  },
  DOCKER_ENGINE_STOPPED: {
    title: "Docker engine stopped",
    impact: "Containers cannot start",
    retryable: true,
    autoRepair: false,
    nextAction: "Start Docker Desktop",
  },
  DATABASE_UNREACHABLE: {
    title: "Database unreachable",
    impact: "Durable DB features unavailable",
    retryable: true,
    autoRepair: true,
    nextAction: "Start Postgres or unset DATABASE_URL for ALPHA mode",
  },
  DATABASE_AUTH_FAILED: {
    title: "Database authentication failed",
    impact: "Cannot use configured database",
    retryable: true,
    autoRepair: false,
    nextAction: "Verify DATABASE_URL credentials",
  },
  MIGRATION_FAILED: {
    title: "Migration failed",
    impact: "Schema not ready — NO_GO",
    retryable: false,
    autoRepair: false,
    nextAction: "Inspect migration log; do not bypass",
  },
  REDIS_UNREACHABLE: {
    title: "Redis unreachable",
    impact: "Queues/workers unavailable",
    retryable: true,
    autoRepair: true,
    nextAction: "Start Redis or unset REDIS_URL",
  },
  QUEUE_INVALID: {
    title: "Queue configuration invalid",
    impact: "Workers cannot start",
    retryable: true,
    autoRepair: false,
    nextAction: "Fix queue names / REDIS_URL",
  },
  PORT_CONFLICT: {
    title: "Port occupied by another program",
    impact: "Cannot bind API/cockpit",
    retryable: true,
    autoRepair: false,
    nextAction: "Free the port or change SCIOS_API_PORT / SCIOS_COCKPIT_PORT",
  },
  PROCESS_LOCKED: {
    title: "Another SCI OS instance is running",
    impact: "Duplicate start blocked",
    retryable: true,
    autoRepair: true,
    nextAction: "Use existing instance or sci:shutdown",
  },
  BACKEND_CRASHED: {
    title: "Backend crashed on start",
    impact: "API unavailable",
    retryable: true,
    autoRepair: true,
    nextAction: "Retry / Repair; inspect proc-logs",
  },
  HEALTH_TIMEOUT: {
    title: "Health check timed out",
    impact: "Service not ready",
    retryable: true,
    autoRepair: true,
    nextAction: "Retry; check diagnostics-export/proc-logs",
  },
  WORKER_CRASHED: {
    title: "Worker crashed",
    impact: "Background jobs unavailable",
    retryable: true,
    autoRepair: true,
    nextAction: "Restart workers or continue DEGRADED if optional",
  },
  ORCHESTRATOR_UNAVAILABLE: {
    title: "Orchestrator unavailable",
    impact: "Coordination endpoints down",
    retryable: true,
    autoRepair: true,
    nextAction: "Restart control-plane",
  },
  DESKTOP_LOAD_FAILED: {
    title: "Desktop/cockpit failed to load",
    impact: "UI unavailable",
    retryable: true,
    autoRepair: true,
    nextAction: "Retry; open diagnostics",
  },
  REPORT_WRITE_FAILED: {
    title: "Could not write diagnostics",
    impact: "Evidence incomplete",
    retryable: true,
    autoRepair: false,
    nextAction: "Check disk permissions for diagnostics-export",
  },
  UNKNOWN_STARTUP_FAILURE: {
    title: "Unknown startup failure",
    impact: "Startup aborted",
    retryable: true,
    autoRepair: false,
    nextAction: "Open diagnostics-export/startup-report.json",
  },
};

function describeFailure(code, diagnosticsRef) {
  const base = FAILURES[code] || FAILURES.UNKNOWN_STARTUP_FAILURE;
  return {
    code: FAILURES[code] ? code : "UNKNOWN_STARTUP_FAILURE",
    ...base,
    diagnosticsReference: diagnosticsRef || "diagnostics-export/startup-report.json",
  };
}

function enrichBlockers(blockers, diagnosticsRef) {
  return (blockers || []).map((b) => {
    const code = String(b).startsWith("HEALTH:")
      ? "HEALTH_TIMEOUT"
      : String(b).replace(/^.*:/, "") && FAILURES[b]
        ? b
        : FAILURES[String(b).split(":")[0]]
          ? String(b).split(":")[0]
          : String(b);
    const known = FAILURES[code] ? code : FAILURES[b] ? b : null;
    if (known) return describeFailure(known, diagnosticsRef);
    return {
      code: String(b),
      title: String(b),
      impact: "See startup report",
      retryable: true,
      autoRepair: false,
      nextAction: "Open diagnostics",
      diagnosticsReference: diagnosticsRef || "diagnostics-export/startup-report.json",
    };
  });
}

module.exports = { FAILURES, describeFailure, enrichBlockers };
