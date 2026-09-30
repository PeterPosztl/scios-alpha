import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OS_BLUEPRINT_HOOKS,
  KG_NODE_MAP,
  applyOsBlueprint,
  buildOsBlueprintIntegration,
  osBlueprintForRole,
} from "./os-blueprint-integration.js";

test("OS blueprints register analog cyber/investment/ops without Palantir/SAP/SIEM", () => {
  const pack = buildOsBlueprintIntegration();
  assert.equal(OS_BLUEPRINT_HOOKS.enabled, false);
  assert.equal(OS_BLUEPRINT_HOOKS.nationalGraph, false);
  assert.equal(OS_BLUEPRINT_HOOKS.secondWorkflowEngine, false);
  assert.equal(OS_BLUEPRINT_HOOKS.liveSiem, false);
  assert.equal(OS_BLUEPRINT_HOOKS.liveErp, false);
  assert.equal(OS_BLUEPRINT_HOOKS.ready, false);
  assert.equal(pack.blueprints.length, 3);
  assert.equal(pack.blueprints.find((b) => b.id === "cyber")?.result, "REGISTERED_ANALOG");
  assert.equal(pack.blueprints.find((b) => b.id === "investment")?.result, "REGISTERED_ANALOG");
  assert.equal(pack.blueprints.find((b) => b.id === "ops")?.catalogStatus, "STUB");
  assert.equal(pack.sapAlt.hr.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(pack.sapAlt.secondWorkflowEngine, false);
  assert.equal(pack.kg.nationalGraph, false);
  assert.equal(pack.kg.causalQueryEngine, "ABSENT");
  assert.deepEqual(pack.kg.layers.governance, ["policies", "limits", "approvals", "audits"]);
  assert.equal(pack.sapAlt.integration.decisions.includes("autoDecide=false"), true);
  assert.equal(pack.moduleMapping.PredictionPanel.researchRequired.includes("hospitality"), true);
  assert.equal(pack.moduleMapping.Decisions.autoDecide, false);
  assert.equal(KG_NODE_MAP.Person, "entity");
  assert.equal(KG_NODE_MAP.Decision, "decision");
  assert.equal(pack.kg.edgeMap.belongs_to, "SUPPORTS");
  assert.equal(pack.kg.edgeMap.triggers, "PRODUCES");
  assert.equal(pack.health.archetypesUnchanged, 9);
  assert.equal(pack.roleAliases.every((a) => a.inventedArchetype === false), true);
});

test("SOC / market analyst map to existing archetypes — no invented live series", () => {
  assert.equal(osBlueprintForRole("arch.soc_analyst")?.id, "cyber");
  assert.equal(osBlueprintForRole("arch.market_analyst")?.id, "investment");
  const empty = applyOsBlueprint("cyber");
  assert.equal(empty.status, "REGISTERED_ANALOG");
  assert.equal(empty.prediction.status, "UNKNOWN");
  assert.equal(empty.prediction.series.length, 0);
  assert.equal(empty.intelligence.edge, null);
  assert.equal(empty.liveSiem, false);
  const fake = applyOsBlueprint("cyber", { fraud_probability: [0.1, 0.8], anomaly_score: 9, baseline: 2 });
  assert.equal(fake.prediction.status, "ANALOG");
  assert.equal(fake.prediction.live, false);
  assert.equal(fake.intelligence.edge, 7);
  assert.equal(fake.liveSiem, false);
  assert.equal(fake.autoTrade, false);
  const padded = applyOsBlueprint("cyber", { fraud_probability: Array(30).fill(0.4) });
  assert.equal(padded.prediction.invented, false);
  assert.equal(padded.prediction.live, false);
});
