import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfessionalCompileReport } from "./professional-compile.js";

test("professional compile plan skips unmapped domains and never enables live execution", () => {
  const plan = buildProfessionalCompileReport();
  assert.equal(plan.ready, false);
  assert.equal(plan.autoTrade, false);
  assert.equal(plan.persisted, false);
  assert.equal(plan.inventedSops, false);
  assert.equal(plan.simulationOnly, true);
  assert.equal(plan.uniqueArchetypes.length, 9);
  assert.equal(plan.catalogs.length, 16);
  assert.equal(plan.sandboxes.length, 16);
  assert.equal(plan.engines.length, 8);
  assert.equal(plan.blueprints.length, 4);
  assert.equal(plan.os.length, 4);
  assert.equal(plan.catalogs.find((c) => c.id === "Hospitality")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(plan.catalogs.find((c) => c.id === "Healthcare")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(plan.catalogs.find((c) => c.id === "AllDomains")?.result, "COMPILED_ARCHETYPE");
  assert.equal(plan.catalogs.find((c) => c.id === "Finance")?.archetypes.length, 4);
  assert.equal(plan.blueprints.find((b) => b.id === "AgentSystem.LDA")?.result, "REFUSED");
  assert.equal(plan.blueprints.find((b) => b.id === "AgentSystem.LDA")?.autoPatch, false);
  assert.ok(plan.sandboxes.every((s) => s.mode === "SIMULATION_ONLY" && s.liveData === false));
  assert.equal(plan.health.liveExecution, false);
});

test("attaching archetype compiles does not invent SOPs or claim READY", () => {
  const live = buildProfessionalCompileReport({
    archetypes: [
      {
        roleId: "arch.market_analyst",
        compilerStatus: "DEGRADED",
        degraded: true,
        degradedReasons: ["evidence:availableData"],
        workspaceProfileId: "market_analysis",
        liveExecutionEnabled: false,
        autoTrade: false,
        persisted: false,
        invented: false,
      },
    ],
  });
  assert.equal(live.ready, false);
  const finance = live.catalogs.find((c) => c.id === "Finance");
  const market = finance?.archetypes.find((a) => a.roleId === "arch.market_analyst");
  assert.equal(market?.compilerStatus, "DEGRADED");
  assert.equal(market?.liveExecutionEnabled, false);
  assert.equal(live.catalogs.find((c) => c.id === "Hospitality")?.inventedSops, false);
});
