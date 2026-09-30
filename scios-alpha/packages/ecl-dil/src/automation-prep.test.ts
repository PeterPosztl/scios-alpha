import assert from "node:assert/strict";
import { test } from "node:test";
import { applyProfessionModules } from "./profession-module-expansion.js";
import { AUTOMATION_PREP_HOOKS, buildAutomationPrepWave } from "./automation-prep.js";

test("automation prep REFUSES continuous auto-audit, auto freeze/hold, and scenario generation", () => {
  const wave = buildAutomationPrepWave();
  assert.equal(AUTOMATION_PREP_HOOKS.enabled, false);
  assert.equal(wave.ready, false);
  assert.equal(wave.autoAudit, false);
  assert.equal(wave.autoLimits, false);
  assert.equal(wave.autoScenarios, false);
  assert.equal(wave.autoDecide, false);
  assert.equal(wave.continuousAudit, false);
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.health.autoActions, 0);
  assert.equal(wave.health.accountsFrozen, 0);
  assert.equal(wave.health.paymentsHeld, 0);
  assert.equal(wave.health.scenariosGenerated, 0);
  assert.equal(wave.audit.find((c) => c.id === "Audit.engine")?.result, "REFUSED");
  assert.equal(wave.audit.find((c) => c.id === "Audit.cyber_incident_chain_complete")?.result, "ANALOG_CONTRACT");
  assert.equal(wave.audit.find((c) => c.id === "Audit.healthcare_icu_overload_chain")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(wave.limits.find((c) => c.id === "Limit.engine")?.result, "REFUSED");
  assert.equal(wave.limits.find((c) => c.id === "Limit.cyber_incident_tolerance")?.result, "REFUSED");
  assert.equal(wave.limits.find((c) => c.id === "Limit.investment_risk_budget")?.result, "ANALOG_CONTRACT");
  assert.equal(wave.scenarios.find((c) => c.id === "ScenarioGen.engine")?.result, "REFUSED");
  assert.equal(
    wave.scenarios.find((c) => c.id === "ScenarioGen.hospitality_demand_to_finance_scenario")?.result,
    "SKIPPED_RESEARCH_REQUIRED"
  );
  assert.equal(wave.next.find((c) => c.id === "Next.humanInTheLoop")?.result, "ANALOG_CONTRACT");
  const hosp = applyProfessionModules("hospitality", { demand_series: [1, 2, 3] });
  assert.equal(hosp.evidence.status, "SKIPPED_RESEARCH_REQUIRED");
});
