import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PHASE_CORE_HOOKS,
  inspectPhase1AuditLimit,
  inspectPhase3CockpitCompute,
  inspectPhase4Persistence,
  inspectPhase5Daemon,
  inspectPhase6Clients,
  inspectPhase7Domains,
  inspectPhase8Governance,
  inspectCopilotBlueprintBoxes,
  inspectBuildoutConstraints,
  buildPhaseCoreWave,
} from "./phase-core.js";
import { buildoutContracts } from "./phase-core-contracts.js";

test("phase-core inspect refuses auto engines, second OS, ALPHA→BETA, and live fill", () => {
  assert.equal(PHASE_CORE_HOOKS.ready, false);
  assert.equal(PHASE_CORE_HOOKS.autoTrade, false);
  assert.equal(PHASE_CORE_HOOKS.autoAudit, false);
  assert.equal(PHASE_CORE_HOOKS.executed, false);
  assert.equal(PHASE_CORE_HOOKS.daemonInBoot, false);
  assert.equal(PHASE_CORE_HOOKS.parallelTree, false);
  assert.equal(PHASE_CORE_HOOKS.beta, false);
  assert.equal(PHASE_CORE_HOOKS.computeMode, "INSPECT_ONLY");

  assert.equal(inspectPhase1AuditLimit().find((c) => c.id === "P1-1.continuousAudit")?.result, "REFUSED");
  assert.equal(inspectPhase3CockpitCompute().find((c) => c.id === "P3-27.decisionComposer")?.result, "REFUSED");
  assert.equal(inspectPhase3CockpitCompute().find((c) => c.id === "P3-32.executionV2")?.result, "REFUSED");
  assert.equal(inspectPhase4Persistence().find((c) => c.id === "P4-33.executionV3")?.result, "REFUSED");
  assert.equal(inspectPhase4Persistence().find((c) => c.id === "P4-36.ledgerArchive")?.result, "REFUSED");
  assert.equal(inspectPhase5Daemon().find((c) => c.id === "P5-51.sciDaemonStart")?.result, "REFUSED");
  assert.equal(inspectPhase5Daemon().find((c) => c.id === "P5-52.daemonHealthTrue")?.result, "REFUSED");
  assert.equal(inspectPhase6Clients().find((c) => c.id === "P6-61.desktopElectron")?.result, "REFUSED");
  assert.equal(inspectPhase6Clients().find((c) => c.id === "P6-68.hospitalityDesk")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectPhase7Domains().find((c) => c.id === "P7-76.hospitalityCatalog")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectPhase7Domains().find((c) => c.id === "P7-80.phiSandbox")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectPhase8Governance().find((c) => c.id === "P8-97.infraReadinessTrue")?.result, "REFUSED");
  assert.equal(inspectPhase8Governance().find((c) => c.id === "P8-85.hitlV2")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectCopilotBlueprintBoxes().every((c) => c.result === "REFUSED"), true);
  assert.equal(inspectBuildoutConstraints().find((c) => c.id === "X.sciOsX10Tree")?.result, "REFUSED");
  assert.equal(inspectBuildoutConstraints().find((c) => c.id === "X.alphaToBeta")?.result, "REFUSED");

  const wave = buildPhaseCoreWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.ready, false);
  assert.equal(wave.autoTrade, false);
  assert.equal(wave.persisted, false);
  assert.equal(wave.executed, false);
  assert.equal(wave.health.executed, 0);
  assert.equal(wave.health.desksCreated, 0);
  assert.equal(wave.health.daemonStarted, 0);
  assert.equal(wave.health.applied, 0);
  assert.equal(wave.health.blueprintsWritten, 0);
  assert.equal(wave.health.parallelPackages, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.health.contractRows, 100);
  assert.equal(wave.contracts?.deepseek.length, 100);
  assert.equal(wave.contracts?.filesWritten, 0);
  assert.equal(buildoutContracts()[60]?.name, "desktop-viewer-electron");
  assert.ok(wave.inspected >= 80);
  assert.equal(wave.checks.every((c) => c.applied === false && c.ready === false && c.autoTrade === false), true);
});
