import assert from "node:assert/strict";
import { test } from "node:test";
import { HERO_PANEL_COPY_MAP, predictionBandVisible, reportingDisplayValue, truthGraphSlots } from "./hero-v3.js";

test("HeroV3 mission map is 8 panels and honesty helpers never fake 0.00", () => {
  assert.equal(Object.keys(HERO_PANEL_COPY_MAP).length, 8);
  assert.equal(predictionBandVisible({ abstain: true }), false);
  assert.equal(predictionBandVisible({ predictionInterval: [0.1, 0.2] }), true);
  assert.equal(reportingDisplayValue(null), "UNKNOWN");
  assert.equal(reportingDisplayValue(""), "UNKNOWN");
  assert.equal(reportingDisplayValue("0.00"), "UNKNOWN");
  assert.equal(reportingDisplayValue(0), "UNKNOWN");
  assert.equal(reportingDisplayValue(12), "12");
  const slots = truthGraphSlots({});
  assert.equal(slots.length, 6);
  assert.ok(slots.every((s) => s.present === false));
  assert.equal(
    truthGraphSlots({ lineageVerified: true }).find((s) => s.id === "Lineage").present,
    true
  );
});
