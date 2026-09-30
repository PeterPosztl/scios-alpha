import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CURSOR_RUNBOOK_HOOKS,
  inspectCursorRunbookSteps,
  inspectCursorRunbookFlags,
  inspectCursorBuildoutFiles,
  inspectRealisticRunbook,
  buildCursorRunbookWave,
} from "./cursor-runbook.js";

test("cursor-runbook does not npm-install or start a second sci CLI OS", () => {
  assert.equal(CURSOR_RUNBOOK_HOOKS.ready, false);
  assert.equal(CURSOR_RUNBOOK_HOOKS.autoTrade, false);
  assert.equal(CURSOR_RUNBOOK_HOOKS.preview, true);
  assert.equal(CURSOR_RUNBOOK_HOOKS.durable, false);
  assert.equal(CURSOR_RUNBOOK_HOOKS.execution, false);
  assert.equal(CURSOR_RUNBOOK_HOOKS.daemonInBoot, false);

  assert.equal(inspectCursorRunbookSteps().find((c) => c.id === "RB.1.npmInstall")?.result, "REFUSED");
  assert.equal(inspectCursorRunbookSteps().find((c) => c.id === "RB.8.runAllDemo")?.result, "REFUSED");
  assert.equal(inspectCursorRunbookSteps().find((c) => c.id === "RB.5.infraCjs")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectCursorRunbookFlags().find((c) => c.id === "RB.flag.daemon")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectCursorRunbookFlags().find((c) => c.id === "RB.flag.mobile")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectCursorRunbookFlags().find((c) => c.id === "RB.flag.alphaBeta")?.result, "REFUSED");

  const files = inspectCursorBuildoutFiles();
  assert.equal(files.length, 30);
  assert.equal(files.find((c) => c.id === "BO.1.sciCjs")?.result, "REFUSED");
  assert.equal(files.find((c) => c.id === "BO.16.orchestrator")?.result, "REFUSED");
  assert.equal(files.find((c) => c.id === "BO.25.daemonApp")?.result, "REFUSED");
  assert.equal(files.find((c) => c.id === "BO.26.electron")?.result, "REFUSED");
  assert.equal(files.find((c) => c.id === "BO.27.mobile")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(files.find((c) => c.id === "BO.29.runAll")?.result, "REFUSED");

  const realistic = inspectRealisticRunbook();
  assert.equal(realistic.length, 10);
  assert.equal(realistic.every((c) => c.result === "ANALOG_CONTRACT"), true);
  assert.equal(realistic.find((c) => c.id === "RR.2.smoke")?.evidence.includes("eclDil.smoke.ts"), true);
  assert.equal(realistic.find((c) => c.id === "RR.9.cockpit")?.note.includes("Do not pnpm sci:start"), true);

  const wave = buildCursorRunbookWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.health.npmLockfiles, 0);
  assert.equal(wave.health.scriptsInvented, 0);
  assert.equal(wave.health.parallelPackages, 0);
  assert.equal(wave.health.secondOsApps, 0);
  assert.equal(wave.health.filesInvented, 0);
  assert.equal(wave.health.daemonStarted, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.autoTrade === false && c.ready === false && c.applied === false), true);
});
