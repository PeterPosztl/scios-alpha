#!/usr/bin/env node
"use strict";

/**
 * Canonical first-release HTTP/process timeout budgets.
 * Import these constants — do not invent ad-hoc waits in boot probes.
 * ALPHA_NON_PRODUCTION
 */

const TIMEOUT_BUDGET_MS = Object.freeze({
  schema: "sci-os-timeout-budget/v1",
  label: "ALPHA_NON_PRODUCTION",
  tcpProbe: 1200,
  healthProbe: 4000,
  homeVerify: 8000,
  supervisorHealth: 20000,
  dockerClassify: 4000,
  convergenceHttp: 2500,
  gracefulStop: 20000,
  bootstrapCapsule: 4000,
  bootstrapCapsuleLong: 20000,
});

function assertBudget(name, ms) {
  const expected = TIMEOUT_BUDGET_MS[name];
  if (typeof expected !== "number") {
    throw new Error("UNKNOWN_TIMEOUT_BUDGET:" + name);
  }
  if (Number(ms) !== expected) {
    throw new Error(
      "TIMEOUT_BUDGET_MISMATCH:" + name + " expected=" + expected + " actual=" + ms
    );
  }
  return true;
}

module.exports = { TIMEOUT_BUDGET_MS, assertBudget };
