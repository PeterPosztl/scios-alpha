"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Write validated startup-report.json (always, even on early failure).
 */
function writeStartupReport(diagDir, report) {
  fs.mkdirSync(diagDir, { recursive: true });
  const file = path.join(diagDir, "startup-report.json");
  const payload = {
    ...report,
    schemaHint: "installer/schemas/startup-report.schema.json",
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}

function writeJson(diagDir, name, obj) {
  fs.mkdirSync(diagDir, { recursive: true });
  const file = path.join(diagDir, name);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  return file;
}

function buildStartupReport(parts) {
  return {
    correlationId: parts.correlationId,
    timestamp: parts.timestamp,
    durationMs: parts.durationMs,
    version: parts.version || "0.1.0-alpha",
    buildSha: parts.buildSha || null,
    appRoot: parts.appRoot,
    layout: parts.layout,
    runtimeMode: parts.runtimeMode,
    mode: parts.mode,
    node: parts.node,
    entries: parts.entries,
    configuration: parts.configuration,
    docker: parts.docker,
    postgres: parts.postgres,
    redis: parts.redis,
    migrations: parts.migrations,
    ports: parts.ports,
    processLock: parts.processLock,
    services: parts.services || {},
    workers: parts.workers || {},
    health: parts.health,
    readiness: parts.readiness,
    desktop: parts.desktop || {},
    safeMode: parts.safeMode || {},
    repairActions: parts.repairActions || [],
    recoveryAttempts: parts.recoveryAttempts || [],
    warnings: parts.warnings || [],
    blockers: parts.blockers || [],
    blockerDetails: parts.blockerDetails || [],
    nextAction: parts.nextAction || "",
    diagnostics: parts.diagnostics || {},
    enterpriseClaim: false,
    platformLabel: "ALPHA_NON_PRODUCTION",
    proofGate: parts.proofGate || null,
    verdict: parts.verdict,
  };
}

module.exports = { writeStartupReport, writeJson, buildStartupReport };
