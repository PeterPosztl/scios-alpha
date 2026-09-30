import assert from "node:assert/strict";
import { test } from "node:test";
import { buildoutContracts, buildCopilotBlueprintWave, copilotResidualPlans } from "./phase-core-contracts.js";

test("Copilot 4-box contracts map 100 DeepSeek items without enabling auto engines or a second OS", () => {
  const rows = buildoutContracts();
  assert.equal(rows.length, 100);
  assert.equal(rows.every((r) => r.n >= 1 && r.n <= 100), true);
  assert.equal(new Set(rows.map((r) => r.n)).size, 100);
  assert.equal(rows.every((r) => r.autoTrade === false && r.ready === false && r.applied === false && r.preview === true), true);
  assert.equal(rows.find((r) => r.n === 1)?.result, "REFUSED");
  assert.equal(rows.find((r) => r.n === 3)?.result, "REFUSED");
  assert.equal(rows.find((r) => r.n === 34)?.result, "REFUSED");
  assert.equal(rows.find((r) => r.n === 51)?.result, "PREPARED_DISABLED");
  assert.equal(rows.find((r) => r.n === 61)?.result, "REFUSED");
  assert.equal(rows.find((r) => r.n === 68)?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(rows.find((r) => r.n === 80)?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(rows.find((r) => r.n === 85)?.result, "ANALOG_CONTRACT");
  assert.equal(rows.find((r) => r.n === 97)?.result, "REFUSED");
  assert.match(rows.find((r) => r.n === 51)?.orchestrator || "", /NOT start-sci-os/);
  assert.match(rows.find((r) => r.n === 61)?.next || "", /No Electron boot/);

  const residual = copilotResidualPlans();
  assert.equal(residual.length, 20);
  assert.equal(residual.find((r) => r.name === "plan-sci-os-x10-tree")?.result, "REFUSED");
  assert.equal(residual.find((r) => r.name === "plan-daemon-boot")?.result, "REFUSED");
  assert.equal(residual.find((r) => r.name === "plan-false-ready")?.result, "REFUSED");

  const wave = buildCopilotBlueprintWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.ready, false);
  assert.equal(wave.autoTrade, false);
  assert.equal(wave.persisted, false);
  assert.equal(wave.filesWritten, 0);
  assert.equal(wave.parallelTree, false);
  assert.equal(wave.beta, false);
  assert.equal(wave.boxes.box1.rows.length, 21);
  assert.equal(wave.boxes.box2.rows.length, 13);
  assert.equal(wave.boxes.box3.rows.length, 26);
  assert.equal(wave.boxes.box4.rows.length, 40);
  assert.equal(wave.deepseek.length, 100);
});
