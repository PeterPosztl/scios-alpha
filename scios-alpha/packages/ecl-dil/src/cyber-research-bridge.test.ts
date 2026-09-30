import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOsBlueprint, KG_NODE_MAP, KG_EDGE_MAP } from "./os-blueprint-integration.js";
import {
  CYBER_BRIDGE_HOOKS,
  CYBER_RESEARCH_CHECKLIST,
  buildCyberResearchBridgeWave,
} from "./cyber-research-bridge.js";

test("cyber research stays analog — RESEARCH_COMPLETE and enableDomain refused", () => {
  const wave = buildCyberResearchBridgeWave();
  assert.equal(CYBER_BRIDGE_HOOKS.enabled, false);
  assert.equal(wave.ready, false);
  assert.equal(wave.researchComplete, false);
  assert.equal(wave.domainEnabled, false);
  assert.equal(wave.liveSiem, false);
  assert.equal(wave.livePnlImpact, false);
  assert.equal(wave.ldaPass, false);
  assert.equal(wave.autoDecide, false);
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.context.find((c) => c.id === "Context.cyberStatus")?.result, "ANALOG_CONTRACT");
  assert.equal(wave.research.find((c) => c.id === "Cyber.researchComplete")?.result, "REFUSED");
  assert.equal(wave.research.find((c) => c.id === "Cyber.requiredArtifacts")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(wave.enable.find((c) => c.id === "Cyber.enableDomain")?.result, "REFUSED");
  assert.equal(wave.bridge.find((c) => c.id === "Bridge.enable")?.result, "REFUSED");
  assert.equal(wave.bridge.find((c) => c.id === "Bridge.scenarios")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(wave.governance.find((c) => c.id === "Governance.LDA")?.result, "REFUSED");
  assert.equal(wave.cockpit.find((c) => c.id === "Cockpit.Prediction")?.result, "REFUSED");
  assert.equal(CYBER_RESEARCH_CHECKLIST.entities.includes("Account"), true);
  const empty = applyOsBlueprint("cyber");
  assert.equal(empty.prediction.status, "UNKNOWN");
  assert.equal(empty.prediction.series.length, 0);
  assert.equal(empty.intelligence.edge, null);
  assert.equal(empty.liveSiem, false);
});

test("investment bridge overlay maps RiskEvent without live PnL", () => {
  assert.equal(KG_NODE_MAP.RiskEvent, "risk");
  assert.equal(KG_EDGE_MAP.cyber_incident_impacts_pnl, "AFFECTS");
  assert.equal(KG_EDGE_MAP.cyber_incident_impacts_risk_budget, "AFFECTS");
  const wave = buildCyberResearchBridgeWave();
  assert.equal(wave.bridgeSpec.wave1Kind, "risk");
  assert.equal(wave.bridge.find((c) => c.id === "Bridge.RiskEvent")?.result, "ANALOG_CONTRACT");
  const inv = applyOsBlueprint("investment");
  assert.equal(inv.prediction.status, "UNKNOWN");
  assert.equal(inv.liveBroker, false);
});
