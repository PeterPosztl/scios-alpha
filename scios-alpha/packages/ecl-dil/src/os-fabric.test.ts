import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OS_FABRIC_HOOKS,
  inspectOsFabricPath,
  inspectOsDaemon,
  inspectOsDesktop,
  inspectOsMobile,
  inspectOsIntegration,
  inspectOsFabricBoot,
  buildOsFabricWave,
} from "./os-fabric.js";

test("os-fabric does not create src/os-fabric.ts or wire daemon into boot", () => {
  assert.equal(OS_FABRIC_HOOKS.ready, false);
  assert.equal(OS_FABRIC_HOOKS.autoTrade, false);
  assert.equal(OS_FABRIC_HOOKS.autoDecide, false);
  assert.equal(OS_FABRIC_HOOKS.daemonInBoot, false);
  assert.equal(OS_FABRIC_HOOKS.parallelTree, false);

  assert.equal(inspectOsFabricPath().find((c) => c.id === "OF.path")?.result, "REFUSED");
  assert.equal(inspectOsFabricPath().find((c) => c.id === "OF.entry")?.result, "REFUSED");
  assert.equal(inspectOsFabricPath().find((c) => c.id === "OF.npmInstall")?.result, "REFUSED");
  assert.equal(inspectOsFabricPath().find((c) => c.id === "OF.npxTsx")?.result, "REFUSED");
  assert.equal(inspectOsDaemon().find((c) => c.id === "OF1_300.startRunning")?.result, "REFUSED");
  assert.equal(inspectOsDaemon().find((c) => c.id === "OF1_300.engineInfra")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectOsDesktop().find((c) => c.id === "OF301_600.electron")?.result, "REFUSED");
  assert.equal(inspectOsDesktop().find((c) => c.id === "OF301_600.lrgReadyTrue")?.result, "REFUSED");
  assert.equal(inspectOsMobile().find((c) => c.id === "OF601_900.hospitalityDesk")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectOsIntegration().find((c) => c.id === "OF901_1000.cp8080")?.result, "REFUSED");
  assert.equal(inspectOsFabricBoot().find((c) => c.id === "OF7.startDaemon")?.result, "REFUSED");
  assert.equal(inspectOsFabricBoot().find((c) => c.id === "OF7.desktopMount")?.result, "REFUSED");
  assert.equal(inspectOsFabricBoot().find((c) => c.id === "OF7.connectAll")?.result, "REFUSED");

  const wave = buildOsFabricWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 1000);
  assert.equal(wave.health.daemonInBoot, 0);
  assert.equal(wave.health.electronHosts, 0);
  assert.equal(wave.health.liveDesks, 0);
  assert.equal(wave.health.megaFiles, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.autoDecide === false && c.applied === false), true);
});
