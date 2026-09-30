import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SECURITY_FABRIC_HOOKS,
  inspectSecurityFabricPath,
  inspectSecuritySandbox,
  inspectSecurityPolicy,
  inspectSecurityAudit,
  inspectSecurityDomainGov,
  inspectSecurityFabricBoot,
  buildSecurityFabricWave,
} from "./security-fabric.js";

test("security-fabric does not create src/security-fabric.ts or auto-decide", () => {
  assert.equal(SECURITY_FABRIC_HOOKS.ready, false);
  assert.equal(SECURITY_FABRIC_HOOKS.autoTrade, false);
  assert.equal(SECURITY_FABRIC_HOOKS.autoDecide, false);
  assert.equal(SECURITY_FABRIC_HOOKS.parallelTree, false);

  assert.equal(inspectSecurityFabricPath().find((c) => c.id === "XF.path")?.result, "REFUSED");
  assert.equal(inspectSecurityFabricPath().find((c) => c.id === "XF.deps")?.result, "REFUSED");
  assert.equal(inspectSecurityFabricPath().find((c) => c.id === "XF.entry")?.result, "REFUSED");
  assert.equal(inspectSecurityFabricPath().find((c) => c.id === "XF.sciOsX10Tree")?.result, "REFUSED");
  assert.equal(inspectSecurityFabricPath().find((c) => c.id === "XF.envFile")?.result, "REFUSED");
  assert.equal(inspectSecuritySandbox().find((c) => c.id === "XF1_200.functionEval")?.result, "REFUSED");
  assert.equal(inspectSecurityPolicy().find((c) => c.id === "XF201_400.policyEval")?.result, "REFUSED");
  assert.equal(inspectSecurityAudit().find((c) => c.id === "XF401_600.auditInsert")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectSecurityDomainGov().find((c) => c.id === "XF601_800.healthcarePhi")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectSecurityDomainGov().find((c) => c.id === "XF801_1000.proposalReview")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectSecurityDomainGov().find((c) => c.id === "XF801_1000.autoApprove")?.result, "REFUSED");
  assert.equal(inspectSecurityFabricBoot().find((c) => c.id === "XF7.postgresCtor")?.result, "REFUSED");
  assert.equal(inspectSecurityFabricBoot().find((c) => c.id === "XF7.govEnforce")?.result, "REFUSED");
  assert.equal(inspectSecuritySandbox().find((c) => c.id === "XF1_200.healthcarePhiSandbox")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectSecurityPolicy().find((c) => c.id === "XF201_400.adminAllAllow")?.result, "REFUSED");
  assert.equal(inspectSecurityDomainGov().find((c) => c.id === "XF801_1000.missingCheckerPass")?.result, "REFUSED");
  assert.equal(inspectSecurityFabricBoot().find((c) => c.id === "XF7.missingCheckerPass")?.result, "REFUSED");
  assert.equal(inspectSecurityFabricBoot().find((c) => c.id === "XF7.healthcarePhi")?.result, "SKIPPED_RESEARCH_REQUIRED");

  const wave = buildSecurityFabricWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 1000);
  assert.equal(wave.health.autoApprovals, 0);
  assert.equal(wave.health.liveDesks, 0);
  assert.equal(wave.health.megaFiles, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.autoDecide === false && c.applied === false), true);
});
