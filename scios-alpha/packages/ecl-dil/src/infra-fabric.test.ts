import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INFRA_FABRIC_HOOKS,
  inspectInfraFabricPath,
  inspectInfraEngine,
  inspectInfraMetrics,
  inspectInfraReadiness,
  inspectInfraDepRecovery,
  inspectInfraFabricBoot,
  buildInfraFabricWave,
} from "./infra-fabric.js";

test("infra-fabric does not create src/infra-fabric.ts or auto-recover", () => {
  assert.equal(INFRA_FABRIC_HOOKS.ready, false);
  assert.equal(INFRA_FABRIC_HOOKS.autoTrade, false);
  assert.equal(INFRA_FABRIC_HOOKS.autoDecide, false);
  assert.equal(INFRA_FABRIC_HOOKS.autoRecovery, false);
  assert.equal(INFRA_FABRIC_HOOKS.daemonInBoot, false);
  assert.equal(INFRA_FABRIC_HOOKS.parallelTree, false);

  assert.equal(inspectInfraFabricPath().find((c) => c.id === "IF.path")?.result, "REFUSED");
  assert.equal(inspectInfraFabricPath().find((c) => c.id === "IF.deps")?.result, "REFUSED");
  assert.equal(inspectInfraFabricPath().find((c) => c.id === "IF.entry")?.result, "REFUSED");
  assert.equal(inspectInfraEngine().find((c) => c.id === "IF1_200.probeAlwaysUp")?.result, "REFUSED");
  assert.equal(inspectInfraEngine().find((c) => c.id === "IF1_200.daemonUp")?.result, "REFUSED");
  assert.equal(inspectInfraEngine().find((c) => c.id === "IF1_200.degradedMode")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectInfraMetrics().find((c) => c.id === "IF201_400.prometheusScrape")?.result, "REFUSED");
  assert.equal(inspectInfraReadiness().find((c) => c.id === "IF401_600.readyStamp")?.result, "REFUSED");
  assert.equal(inspectInfraReadiness().find((c) => c.id === "IF401_600.engineInfra")?.result, "ANALOG_CONTRACT");
  assert.equal(inspectInfraDepRecovery().find((c) => c.id === "IF801_1000.autoRecover")?.result, "REFUSED");
  assert.equal(inspectInfraFabricBoot().find((c) => c.id === "IF7.postgresCtor")?.result, "REFUSED");
  assert.equal(inspectInfraFabricBoot().find((c) => c.id === "IF7.daemonBeat")?.result, "REFUSED");
  assert.equal(inspectInfraFabricBoot().find((c) => c.id === "IF7.recoverPostgres")?.result, "REFUSED");
  assert.equal(inspectInfraFabricBoot().find((c) => c.id === "IF7.postgresReadyTrue")?.result, "REFUSED");
  assert.equal(inspectInfraEngine().find((c) => c.id === "IF1_200.percentEmpty1")?.result, "REFUSED");
  assert.equal(inspectInfraDepRecovery().find((c) => c.id === "IF801_1000.alwaysTrueSteps")?.result, "REFUSED");
  assert.equal(inspectInfraFabricBoot().find((c) => c.id === "IF7.alwaysTrueCtor")?.result, "REFUSED");
  assert.equal(inspectInfraReadiness().find((c) => c.id === "IF401_600.waitForReady")?.result, "REFUSED");

  const wave = buildInfraFabricWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 1000);
  assert.equal(wave.health.autoRecoveries, 0);
  assert.equal(wave.health.daemonInBoot, 0);
  assert.equal(wave.health.megaFiles, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.autoDecide === false && c.applied === false), true);
});
