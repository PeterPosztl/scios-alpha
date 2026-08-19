#!/usr/bin/env node
"use strict";
/** Unit proof for CF14 policy-enforcement module (no live server). */
const path = require("path");
const { pathToFileURL } = require("url");

async function main() {
  const mod = await import(
    pathToFileURL(
      path.join(__dirname, "../../packages/governance-engine/dist/policy-enforcement.js")
    ).href
  );

  const bypass = mod.enforcePolicy({
    actionId: "live_execution",
    role: "operator",
    decision: "ALLOW",
    attemptBypass: true,
  });

  const deny = mod.evaluatePolicyDecision({
    actionId: "execution:submit",
    role: "operator",
    executionMode: "SIMULATION_ONLY",
  });

  const proof = mod.proveGovernanceBypassRejected();
  const ok =
    bypass.blocked &&
    bypass.decision === "DENY" &&
    deny.denyReasons.includes("simulation_only_mode") &&
    deny.evidenceRefs.length > 0 &&
    proof.pass;

  console.log(
    JSON.stringify({
      ok,
      bypass: bypass.decision,
      denyReasons: deny.denyReasons,
      policyVersion: deny.policyVersion,
      proveBypass: proof.pass,
    })
  );
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
