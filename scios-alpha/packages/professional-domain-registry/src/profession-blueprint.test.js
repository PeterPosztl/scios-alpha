import assert from "node:assert/strict";
import { test } from "node:test";
import { families, archetypes, rolesSeed } from "./index.js";
import {
  PROFESSION_BLUEPRINT_HONESTY,
  RIBBON_STAGES,
  composeProfessionBlueprint,
  listProfessionBlueprints,
  listFamilyOverlays,
  professionBlueprintCatalog,
  ohlcAllowedForFamily,
  composeFamilyUxV3,
  composeHeroV3,
  masterExecutionBox,
  MISSION_PANELS_V3,
} from "./profession-blueprint.js";

test("200 INST compose with frozen honesty and no specialist SOP", () => {
  const list = listProfessionBlueprints();
  assert.equal(list.length, 200);
  assert.equal(rolesSeed.count, 200);
  assert.equal(families.families.length, 21);
  assert.equal(archetypes.archetypes.length, 9);
  assert.equal(listFamilyOverlays().length, 21);
  assert.equal(RIBBON_STAGES.length, 11);

  const cat = professionBlueprintCatalog();
  assert.equal(cat.rolesSeeded, 200);
  assert.equal(cat.roles200Validated, false);
  assert.equal(cat.inventedSops, false);
  assert.equal(cat.honesty.autoTrade, false);
  assert.equal(cat.honesty.ready, false);
  assert.equal(cat.honesty.durable, false);
  assert.equal(cat.honesty.execution, false);
  assert.equal(cat.honesty.pgDriver, "ABSENT");
  assert.equal(cat.specialistInheritOnly, 65);
  assert.equal(cat.namedRoles, 135);

  for (const bp of list) {
    assert.equal(bp.schema, "sci-os-profession-blueprint/v1");
    assert.equal(bp.label, "ALPHA_NON_PRODUCTION");
    assert.equal(bp.status, "SEED_RESEARCH_REQUIRED");
    assert.deepEqual(bp.deltas, {});
    assert.equal(bp.inventedSops, false);
    assert.equal(bp.honesty.autoTrade, false);
    assert.equal(bp.honesty.ready, false);
    assert.equal(bp.honesty.durable, false);
    assert.equal(bp.governance.autoExecute, false);
    assert.equal(bp.lineage.verified, "UNKNOWN");
    assert.equal(bp.reporting.empty, "UNKNOWN");
    assert.equal(bp.ledger.actor, "human:" + bp.roleId);
    assert.equal(bp.ledger.persisted, false);
    assert.equal(bp.ontology.nationalGraph, false);
    assert.equal(bp.gw.GW2_GW7, "PREPARED_DISABLED");
    if (bp.specialist) {
      assert.match(bp.roleId, /specialist_\d+$/);
      assert.deepEqual(bp.deltas, {});
    }
  }

  const soc = composeProfessionBlueprint("role.cyber_ops.soc_analyst");
  assert.equal(soc.inherit, "FAM-01");
  assert.equal(soc.family.primaryObject || soc.domain.primaryObject, "Alert");
  assert.equal(ohlcAllowedForFamily("market_portfolio_risk"), true);
  assert.equal(ohlcAllowedForFamily("cyber_ops"), false);

  const spec = composeProfessionBlueprint("role.cyber_ops.specialist_141");
  assert.equal(spec.specialist, true);
  assert.equal(spec.inherit, "FAM-01");
  assert.deepEqual(spec.deltas, {});

  assert.equal(composeProfessionBlueprint("role.missing.nope"), null);
  assert.equal(PROFESSION_BLUEPRINT_HONESTY.roles200Validated, false);
});

test("FamilyUxV3 + HeroV3 inherit FAM without invented SOP", () => {
  const fams = listFamilyOverlays().map((o) => composeFamilyUxV3(o.id));
  assert.equal(fams.length, 21);
  assert.equal(MISSION_PANELS_V3.length, 8);
  const fam08 = composeFamilyUxV3("market_portfolio_risk");
  assert.equal(fam08.ohlc, true);
  assert.equal(fam08.famId, "FAM-08");
  const fam21 = composeFamilyUxV3("market_intelligence");
  assert.equal(fam21.ohlc, true);
  assert.equal(fam21.famId, "FAM-21");
  assert.equal(composeFamilyUxV3("physical_security").skip, true);
  assert.equal(composeFamilyUxV3("cloud_infra").skip, true);
  assert.equal(composeFamilyUxV3("supply_ops_risk").stub, true);
  const hosp = composeFamilyUxV3("hospitality");
  assert.equal(hosp.status, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(composeFamilyUxV3("healthcare").skip, true);

  const heroes = listProfessionBlueprints().map((b) => composeHeroV3(b.roleId));
  assert.equal(heroes.length, 200);
  for (const h of heroes) {
    assert.equal(h.inventedSops, false);
    assert.equal(h.roles200Validated, false);
    assert.equal(h.simulation.simulated, true);
    assert.equal(h.simulation.executed, false);
    assert.equal(h.lineage.verified, "UNKNOWN");
    assert.equal(h.decisionGate.autoExecute, false);
    assert.equal(h.honesty.pgDriver, "ABSENT");
    assert.equal(h.ledger.actor, "human:" + h.roleId);
    if (h.specialist) assert.equal(h.missionCopy.jtbd, "inherit_only");
  }
  const soc = composeHeroV3("role.cyber_ops.soc_analyst");
  assert.equal(soc.family.famId, "FAM-01");
  assert.equal(soc.ohlc, false);
  const spec = composeHeroV3("role.cyber_ops.specialist_141");
  assert.equal(spec.specialist, true);
  assert.deepEqual(spec.charts, soc.charts);
  const fromArch = composeHeroV3("arch.soc_analyst");
  assert.ok(fromArch);
  assert.equal(fromArch.family.id, "cyber_ops");
  const box = masterExecutionBox();
  assert.equal(box.ready, false);
  assert.equal(box.heroCount, 200);
  assert.equal(box.familyUxCount, 21);
  assert.equal(box.pgDriver, "ABSENT");
});

test("master execution box checklist never self-declares PASS without evidence", () => {
  const box = masterExecutionBox();
  const backend = box.checklist.backend;
  const frontend = box.checklist.frontend;

  // A literal true is an unevidenced PASS — the whole defect this guards.
  for (const group of [backend, frontend]) {
    for (const [key, value] of Object.entries(group)) {
      assert.notEqual(value, true, `${key} is literal true without evidence`);
    }
  }

  // Observable from this package.
  assert.equal(backend.professionBlueprintV1, "PASS");
  assert.equal(backend.inst200, "PASS");
  assert.equal(backend.fam21, "PASS");
  assert.equal(backend.familyUxV3, "PASS");
  assert.equal(backend.heroV3, "PASS");
  assert.equal(backend.missionPanels, "PASS");
  assert.equal(backend.ledgerActor, "PASS");

  // Not observable here — must stay UNKNOWN until the verifier resolves them.
  assert.equal(backend.dataFabricObjects, "UNKNOWN");
  assert.equal(backend.lineageHash, "UNKNOWN");
  assert.equal(backend.evidenceChain, "UNKNOWN");
  assert.equal(backend.engineRoutesWired, "UNKNOWN");
  for (const value of Object.values(frontend)) assert.equal(value, "UNKNOWN");

  assert.equal(box.checklist.verifier, "scripts/tests/master-execution-box-verify.cjs");
  assert.deepEqual(backend.engineRoutes, {
    prediction: "POST /v1/ecl/engine/prediction",
    risk: "POST /v1/ecl/engine/risk-eval",
    decision: "POST /v1/ecl/engine/decision",
    sim: "POST /v1/ecl/engine/execution-sim",
    lineage: "GET /v1/ecl/engine/lineage",
    evidence: "GET /v1/ecl/engine/evidence",
    compute: "POST /v1/ecl/engine/cockpit-compute",
  });
});
