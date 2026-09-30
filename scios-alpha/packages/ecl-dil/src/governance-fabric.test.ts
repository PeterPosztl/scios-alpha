import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOVERNANCE_FABRIC_HOOKS,
  inspectGovernanceFabricPath,
  inspectGovernanceRules,
  inspectGovernanceHitl,
  inspectGovernanceAuditOverride,
  inspectGovernanceDomain,
  inspectGovernanceFabricBoot,
  buildGovernanceFabricWave,
} from "./governance-fabric.js";

test("governance-fabric does not create src/governance-fabric.ts or auto-decide", () => {
  assert.equal(GOVERNANCE_FABRIC_HOOKS.ready, false);
  assert.equal(GOVERNANCE_FABRIC_HOOKS.autoTrade, false);
  assert.equal(GOVERNANCE_FABRIC_HOOKS.autoDecide, false);
  assert.equal(GOVERNANCE_FABRIC_HOOKS.parallelTree, false);

  assert.equal(inspectGovernanceFabricPath().find((c) => c.id === "GF.path")?.result, "REFUSED");
  assert.equal(inspectGovernanceFabricPath().find((c) => c.id === "GF.deps")?.result, "REFUSED");
  assert.equal(inspectGovernanceFabricPath().find((c) => c.id === "GF.entry")?.result, "REFUSED");
  assert.equal(inspectGovernanceRules().find((c) => c.id === "GF1_200.autoApproveConf")?.result, "REFUSED");
  assert.equal(inspectGovernanceHitl().find((c) => c.id === "GF201_400.proposalReview")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectGovernanceHitl().find((c) => c.id === "GF201_400.hitlLoop")?.result, "REFUSED");
  assert.equal(inspectGovernanceAuditOverride().find((c) => c.id === "GF601_800.overrideAuto")?.result, "REFUSED");
  assert.equal(inspectGovernanceDomain().find((c) => c.id === "GF801_1000.hospitalityGov")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectGovernanceFabricBoot().find((c) => c.id === "GF7.postgresCtor")?.result, "REFUSED");
  assert.equal(inspectGovernanceFabricBoot().find((c) => c.id === "GF7.functionEval")?.result, "REFUSED");
  assert.equal(inspectGovernanceFabricBoot().find((c) => c.id === "GF7.hitlInMemoryApprove")?.result, "REFUSED");
  assert.equal(inspectGovernanceFabricBoot().find((c) => c.id === "GF7.autoApproveFreeze")?.result, "REFUSED");
  assert.equal(inspectGovernanceFabricBoot().find((c) => c.id === "GF7.invented1e6")?.result, "REFUSED");

  const wave = buildGovernanceFabricWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 1000);
  assert.equal(wave.health.autoApprovals, 0);
  assert.equal(wave.health.liveDesks, 0);
  assert.equal(wave.health.megaFiles, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.autoDecide === false && c.applied === false), true);
});
