"use strict";

/**
 * SCI-owned process descriptors — current boot/run attribution only.
 * ALPHA_NON_PRODUCTION
 */

function createRunContext(opts = {}) {
  return {
    bootId: String(opts.bootId || opts.runId || "unknown"),
    runId: String(opts.runId || "unknown"),
    buildId: opts.buildId != null ? String(opts.buildId) : null,
    orchestratorPid: Number(opts.orchestratorPid || process.pid),
    appRoot: opts.appRoot ? String(opts.appRoot) : null,
    startedAt: opts.startedAt || new Date().toISOString(),
    ports: opts.ports || {},
  };
}

function createOwnershipDescriptor(runContext, rec, extra = {}) {
  return {
    schema: "sci-os-process-ownership/v1",
    label: "ALPHA_NON_PRODUCTION",
    bootId: runContext.bootId,
    runId: runContext.runId,
    buildId: runContext.buildId,
    role: rec.name,
    component: rec.name,
    pid: rec.pid,
    parentPid: runContext.orchestratorPid,
    startedAt: rec.startedAt,
    executable: rec.command,
    args: Array.isArray(rec.args) ? rec.args.slice(0, 8) : [],
    appRoot: runContext.appRoot,
    expectedPort: extra.expectedPort != null ? Number(extra.expectedPort) : null,
    detached: rec.detached === true,
  };
}

function validateOwnershipForJobAttach(descriptor, runContext, registeredPids) {
  if (!descriptor || typeof descriptor !== "object") {
    return { ok: false, reason: "INVALID_DESCRIPTOR" };
  }
  if (descriptor.runId !== runContext.runId) {
    return { ok: false, reason: "RUN_MISMATCH" };
  }
  if (descriptor.bootId !== runContext.bootId) {
    return { ok: false, reason: "BOOT_MISMATCH" };
  }
  if (!Number.isInteger(descriptor.pid) || descriptor.pid <= 0) {
    return { ok: false, reason: "INVALID_PID" };
  }
  if (!registeredPids.has(descriptor.pid)) {
    return { ok: false, reason: "UNOWNED_PID" };
  }
  if (descriptor.parentPid !== runContext.orchestratorPid) {
    return { ok: false, reason: "PARENT_MISMATCH" };
  }
  if (runContext.appRoot && descriptor.appRoot && descriptor.appRoot !== runContext.appRoot) {
    return { ok: false, reason: "APPROOT_MISMATCH" };
  }
  return { ok: true, reason: null };
}

module.exports = {
  createRunContext,
  createOwnershipDescriptor,
  validateOwnershipForJobAttach,
};
