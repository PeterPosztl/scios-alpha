import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SCI_ROLE_CATALOG_IDS,
  SCI_SANDBOX_IDS,
  ROLE_PROFESSIONAL_HOOKS,
  buildRoleProfessionalInventory,
} from "./role-professional.js";

test("role/professional inventory is inspectable SIMULATION_ONLY — not 200 apps or READY", () => {
  const inv = buildRoleProfessionalInventory();
  assert.equal(SCI_ROLE_CATALOG_IDS.length, 16);
  assert.equal(SCI_SANDBOX_IDS.length, 16);
  assert.equal(inv.catalogs.length, 16);
  assert.equal(inv.sandboxes.length, 16);
  assert.equal(inv.health.engines, 8);
  assert.equal(ROLE_PROFESSIONAL_HOOKS.enabled, false);
  assert.equal(ROLE_PROFESSIONAL_HOOKS.enabledFull, false);
  assert.equal(ROLE_PROFESSIONAL_HOOKS.fullProfessionalSystem, true);
  assert.equal(ROLE_PROFESSIONAL_HOOKS.ready, false);
  assert.equal(ROLE_PROFESSIONAL_HOOKS.autoTrade, false);
  assert.equal(ROLE_PROFESSIONAL_HOOKS.simulationOnly, true);
  assert.equal(ROLE_PROFESSIONAL_HOOKS.persisted, false);
  assert.equal(ROLE_PROFESSIONAL_HOOKS.liveDomainData, false);
  assert.equal(inv.registry.rolesSeeded, 200);
  assert.equal(inv.registry.rolesFullySpecified, 9);
  assert.equal(inv.registry.rolesResearchRequired, 200);
  assert.equal(inv.health.sandboxLiveData, 0);
  assert.equal(inv.health.unexpectedLive, false);
  assert.equal(inv.selector.archetypesOnlyCompile, true);
  assert.ok(inv.sandboxes.every((s) => s.mode === "SIMULATION_ONLY" && s.liveData === false && s.autoTrade === false));
  assert.ok(inv.catalogs.every((c) => c.mode === "SIMULATION_ONLY" && c.autoTrade === false));
  assert.equal(inv.catalogs.find((c) => c.id === "AllDomains")?.status, "PARTIAL");
  assert.equal(inv.catalogs.find((c) => c.id === "Hospitality")?.status, "ABSENT");
  assert.equal(inv.catalogs.find((c) => c.id === "Healthcare")?.status, "ABSENT");
  assert.equal(inv.catalogs.find((c) => c.id === "Finance")?.status, "PARTIAL");
  assert.equal(inv.catalogs.find((c) => c.id === "Cybersecurity")?.status, "PARTIAL");
  assert.equal(inv.engines.ExperienceCompiler.status, "PARTIAL");
  assert.equal(inv.refused.ready, false);
});
