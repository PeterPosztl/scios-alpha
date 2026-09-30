import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LEDGER_CORE_HOOKS,
  inspectLedgerCoreWriter,
  inspectLedgerArchive,
  inspectLedgerCorePath,
  inspectDurableFabricMegafile,
  buildLedgerCoreWave,
} from "./ledger-core.js";

test("ledger-core 1–200 does not stamp durable=true or delete hot history", () => {
  assert.equal(LEDGER_CORE_HOOKS.ready, false);
  assert.equal(LEDGER_CORE_HOOKS.autoTrade, false);
  assert.equal(LEDGER_CORE_HOOKS.durable, false);
  assert.equal(LEDGER_CORE_HOOKS.pgRequired, false);
  assert.equal(LEDGER_CORE_HOOKS.parallelTree, false);
  assert.equal(LEDGER_CORE_HOOKS.appendOnly, true);

  assert.equal(inspectLedgerCoreWriter().find((c) => c.id === "LC9.durableActivatorTrue")?.result, "REFUSED");
  assert.equal(inspectLedgerCoreWriter().find((c) => c.id === "LC7.memoryFallback")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectLedgerArchive().find((c) => c.id === "LA102.rotateDelete")?.result, "REFUSED");
  assert.equal(inspectLedgerArchive().find((c) => c.id === "LA104.archiveVerifyCount")?.result, "REFUSED");
  assert.equal(inspectLedgerCorePath().find((c) => c.id === "LX.path")?.result, "REFUSED");
  assert.equal(inspectLedgerCorePath().find((c) => c.id === "LX.sciOsX10File")?.result, "REFUSED");
  assert.equal(inspectLedgerCorePath().find((c) => c.id === "LX.npmInit")?.result, "REFUSED");
  assert.equal(inspectLedgerCorePath().find((c) => c.id === "LX.dockerPostgresBoot")?.result, "REFUSED");
  assert.equal(inspectDurableFabricMegafile().find((c) => c.id === "F12.sciosFabricBoot")?.result, "REFUSED");
  assert.equal(inspectDurableFabricMegafile().find((c) => c.id === "F13.healthBooksAllTrue")?.result, "REFUSED");
  assert.equal(inspectDurableFabricMegafile().find((c) => c.id === "F13.mainFreezeWrite")?.result, "REFUSED");
  assert.equal(inspectDurableFabricMegafile().find((c) => c.id === "F0.domainHospitalityHealthcare")?.result, "SKIPPED_RESEARCH_REQUIRED");

  const wave = buildLedgerCoreWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 1000);
  assert.equal(wave.health.durableStamps, 0);
  assert.equal(wave.health.hotDeletes, 0);
  assert.equal(wave.health.parallelPackages, 0);
  assert.equal(wave.health.megaFiles, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.durable === false && c.applied === false), true);
});
