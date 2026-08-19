/**
 * Policy enforcement proof — bypass must fail.
 * ALPHA_NON_PRODUCTION
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  enforcePolicy,
  evaluatePolicyDecision,
  proveGovernanceBypassRejected,
  POLICY_VERSION,
} from "./policy-enforcement.js";

describe("policy enforcement", () => {
  it("rejects bypass attempts", () => {
    const r = enforcePolicy({
      actionId: "live_execution",
      role: "operator",
      decision: "ALLOW",
      attemptBypass: true,
    });
    assert.equal(r.blocked, true);
    assert.equal(r.bypassAttempted, true);
    assert.equal(r.decision, "DENY");
    assert.ok(r.denyReasons.includes("policy_bypass_forbidden"));
  });

  it("denies live execution in simulation mode with reason", () => {
    const r = evaluatePolicyDecision({
      actionId: "execution:submit",
      role: "operator",
      executionMode: "SIMULATION_ONLY",
    });
    assert.equal(r.decision, "DENY");
    assert.ok(r.denyReasons.includes("simulation_only_mode"));
    assert.ok(r.denyReasons.length > 0);
  });

  it("includes policy version and evidence", () => {
    const r = evaluatePolicyDecision({
      actionId: "read_features",
      role: "researcher",
      executionMode: "SIMULATION_ONLY",
    });
    assert.equal(r.policyVersion, POLICY_VERSION);
    assert.ok(Array.isArray(r.evidenceRefs));
    assert.equal(r.evidenceRefs[0]?.kind, "policy_evaluation");
  });

  it("proveGovernanceBypassRejected passes", () => {
    assert.equal(proveGovernanceBypassRejected().pass, true);
  });
});
