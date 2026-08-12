import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RepairPolicyEngine, RepairRecipeRegistry } from "./recipes/registry.js";
import { SystemCapabilityGraph, DependencyGraphEngine, SystemInventoryEngine } from "./inventory.js";
import { RootCauseRankingEngine } from "./observe.js";
import type { Hypothesis } from "./types.js";
import { resolve } from "node:path";

describe("RepairPolicyEngine", () => {
  const policy = new RepairPolicyEngine();
  it("allows R0-R2", () => {
    assert.equal(policy.allow("R0", { dryRun: false, allowR3: false }).allowed, true);
    assert.equal(policy.allow("R1", { dryRun: false, allowR3: false }).allowed, true);
    assert.equal(policy.allow("R2", { dryRun: false, allowR3: false }).allowed, true);
  });
  it("rejects R5", () => {
    assert.equal(policy.allow("R5", { dryRun: false, allowR3: true }).allowed, false);
  });
  it("rejects R3 without auth", () => {
    assert.equal(policy.allow("R3", { dryRun: false, allowR3: false }).allowed, false);
  });
});

describe("RepairRecipeRegistry", () => {
  it("has catalog recipes", () => {
    const r = new RepairRecipeRegistry();
    assert.ok(r.get("recipe.accept_alpha_no_db"));
    assert.ok(r.get("recipe.r5_destructive_reset"));
  });
});

describe("DependencyGraphEngine", () => {
  it("cascades upstream from Redis", () => {
    const root = resolve(process.cwd());
    // When run from package dir, go up to monorepo
    const appRoot = root.includes("meta-recovery") ? resolve(root, "../..") : root;
    const inv = new SystemInventoryEngine(appRoot).collect();
    const nodes = new SystemCapabilityGraph().build(inv);
    const dep = new DependencyGraphEngine();
    const affected = dep.affectedUpstream("RedisQueue", nodes);
    assert.ok(affected.includes("QueueWorkers") || affected.includes("RedisQueue"));
  });
});

describe("RootCauseRankingEngine", () => {
  it("ranks by confidence", () => {
    const hyps: Hypothesis[] = [
      {
        hypothesisId: "a",
        explanation: "low",
        supportingEvidence: [],
        contradictingEvidence: [],
        affectedCapability: "x",
        confidence: 0.2,
        diagnosticAction: "",
        repairCandidate: null,
        risk: "R0",
        rollback: "",
        verificationMethod: "",
      },
      {
        hypothesisId: "b",
        explanation: "high",
        supportingEvidence: [],
        contradictingEvidence: [],
        affectedCapability: "y",
        confidence: 0.9,
        diagnosticAction: "",
        repairCandidate: null,
        risk: "R1",
        rollback: "",
        verificationMethod: "",
      },
    ];
    const ranked = new RootCauseRankingEngine().rank(hyps);
    assert.equal(ranked[0].hypothesisId, "b");
  });
});
