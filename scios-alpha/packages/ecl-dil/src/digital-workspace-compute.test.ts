import assert from "node:assert/strict";
import { test } from "node:test";
import { applyProfessionModules } from "./profession-module-expansion.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { VISIBILITY_ACTIVATION_HOOKS } from "./visibility-activation.js";
import {
  DIGITAL_WORKSPACE_COMPUTE_HOOKS,
  activateDigitalKG,
  generateDomainWorkspaces,
  enableCockpitComputeMode,
  createDomainWorkspace,
  buildDigitalAndWorkspaceAndComputeWave,
} from "./digital-workspace-compute.js";

test("digital KG, domain desks, and COMPUTE stay inspect-only — no DIGITAL_ACTIVE", () => {
  assert.equal(activateDigitalKG().result, "REFUSED");
  assert.equal(activateDigitalKG().applied, false);
  assert.equal(activateDigitalKG().ready, false);
  assert.equal(generateDomainWorkspaces().result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(generateDomainWorkspaces().applied, false);
  assert.equal(enableCockpitComputeMode().result, "REFUSED");
  assert.equal(createDomainWorkspace("hospitality").live, false);
  assert.equal(createDomainWorkspace("hospitality").deskCreated, false);
  assert.equal(createDomainWorkspace("hospitality").result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(createDomainWorkspace("cyber").result, "ANALOG_CONTRACT");
  assert.equal(createDomainWorkspace("cyber").deskCreated, false);

  const master = buildDigitalAndWorkspaceAndComputeWave();
  assert.equal(DIGITAL_WORKSPACE_COMPUTE_HOOKS.enabled, false);
  assert.equal(master.wave, "REFUSED");
  assert.equal(master.nationalGraph, false);
  assert.equal(master.showCausalPaths, false);
  assert.equal(master.kgStatus, "ANALOG_OVERLAY");
  assert.equal(master.kgDigitalReady, false);
  assert.equal(master.computeMode, "INSPECT_ONLY");
  assert.equal(master.secondShell, false);
  assert.equal(master.inventedRoles, false);
  assert.equal(master.health.fail, 0);
  assert.equal(master.health.applied, 0);
  assert.equal(master.health.desksCreated, 0);
  assert.equal(master.builds.digitalKG.applied, false);
  assert.equal(master.builds.domainWorkspaces.workspaces.find((w) => w.id === "hospitality")?.live, false);
  assert.equal(OS_BLUEPRINT_HOOKS.nationalGraph, false);
  assert.equal(OS_BLUEPRINT_HOOKS.causalQueryEngine, "ABSENT");
  assert.equal(VISIBILITY_ACTIVATION_HOOKS.kgDigitalReady, false);
  const hosp = applyProfessionModules("hospitality", { demand_series: [1, 2, 3] });
  assert.equal(hosp.evidence.status, "SKIPPED_RESEARCH_REQUIRED");
});
