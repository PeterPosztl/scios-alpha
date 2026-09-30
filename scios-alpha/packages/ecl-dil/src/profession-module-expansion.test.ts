import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PROFESSION_EXPANSION_HOOKS,
  applyProfessionModules,
  buildProfessionModuleExpansion,
  resolveEdgeDetector,
  resolveSeriesAdapter,
} from "./profession-module-expansion.js";

test("expansion registers analog contracts without enabling live domains or inventing SOPs", () => {
  const exp = buildProfessionModuleExpansion();
  assert.equal(PROFESSION_EXPANSION_HOOKS.enabled, false);
  assert.equal(PROFESSION_EXPANSION_HOOKS.liveDomainData, false);
  assert.equal(PROFESSION_EXPANSION_HOOKS.inventedSops, false);
  assert.equal(PROFESSION_EXPANSION_HOOKS.ready, false);
  assert.equal(exp.professions.length, 7);
  assert.equal(exp.health.liveDomainData, 0);
  assert.equal(exp.professions.find((p) => p.id === "hospitality")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(exp.professions.find((p) => p.id === "healthcare")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(exp.professions.find((p) => p.id === "supply-chain")?.result, "REGISTERED_ANALOG");
  assert.equal(exp.professions.find((p) => p.id === "supply-chain")?.catalogStatus, "STUB");
  assert.ok(exp.professions.every((p) => p.ready === false && p.enabled === false && p.inventedSops === false));
});

test("ABSENT hospitality ignores caller payload — no fake demand curve", () => {
  const withPayload = resolveSeriesAdapter("hospitality", { timeseries: [0.2, 0.35, 0.9] });
  assert.equal(withPayload.status, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(withPayload.series.length, 0);
  assert.equal(withPayload.invented, false);
  const edge = resolveEdgeDetector("hospitality", { demand: 12, capacity: 8, confidence: 0.9 });
  assert.equal(edge.status, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(edge.edge, null);
});

test("STUB supply-chain stays UNKNOWN without analog payload and never auto-trades", () => {
  const empty = resolveSeriesAdapter("supply-chain", {});
  assert.equal(empty.status, "UNKNOWN");
  assert.equal(empty.series.length, 0);
  const analog = resolveSeriesAdapter("supply-chain", { fill: [0.1, 0.2, 0.15] });
  assert.equal(analog.status, "ANALOG");
  assert.equal(analog.live, false);
  assert.equal(analog.series.length, 3);
  const applied = applyProfessionModules("supply-chain");
  assert.equal(applied.intelligence.edge, null);
  assert.equal(applied.decisions.autoDecide, false);
  assert.equal(applied.autoTrade, false);
  assert.equal(applied.liveDomainData, false);
});
