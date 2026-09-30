import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOsBlueprint } from "./os-blueprint-integration.js";
import { applyProfessionModules } from "./profession-module-expansion.js";
import { ENTERPRISE_PREP_HOOKS, buildEnterprisePrepWave } from "./enterprise-prep.js";

test("enterprise prep REFUSES live ingestion, durable ledger, and ABSENT-domain scenarios", () => {
  const wave = buildEnterprisePrepWave();
  assert.equal(ENTERPRISE_PREP_HOOKS.enabled, false);
  assert.equal(wave.ready, false);
  assert.equal(wave.liveIngestion, false);
  assert.equal(wave.durableLedger, false);
  assert.equal(wave.crossDomainEngine, false);
  assert.equal(wave.allowPnLPropagation, false);
  assert.equal(wave.autoDecide, false);
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.health.liveIngestion, 0);
  assert.equal(wave.health.durableStreams, 0);
  assert.equal(wave.scenarios.find((c) => c.id === "Scenario.engine")?.result, "REFUSED");
  assert.equal(wave.scenarios.find((c) => c.id === "Scenario.cyber_breach_impacts_pnl")?.result, "ANALOG_CONTRACT");
  assert.equal(
    wave.scenarios.find((c) => c.id === "Scenario.icu_overload_impacts_supplychain")?.result,
    "SKIPPED_RESEARCH_REQUIRED"
  );
  assert.equal(wave.ledger.find((c) => c.id === "Ledger.enableDurable")?.result, "REFUSED");
  assert.equal(wave.live.find((c) => c.id === "Feed.enableLiveIngestion")?.result, "REFUSED");
  assert.equal(wave.next.find((c) => c.id === "Next.autoAudit")?.result, "PREPARED_DISABLED");
  assert.equal(wave.liveFeeds.siem_feed.enabled, false);
  assert.equal(wave.ledgerStreams.healthcare_supply.result, "SKIPPED_RESEARCH_REQUIRED");
  const empty = applyOsBlueprint("cyber");
  assert.equal(empty.liveSiem, false);
  assert.equal(empty.prediction.status, "UNKNOWN");
  const hosp = applyProfessionModules("hospitality", { occupancy: [0.9] });
  assert.equal(hosp.prediction.series.length, 0);
});
