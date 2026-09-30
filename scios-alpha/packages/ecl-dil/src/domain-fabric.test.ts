import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DOMAIN_FABRIC_HOOKS,
  inspectDomainFabricPath,
  inspectHospitalityDomain,
  inspectHealthcareDomain,
  inspectCyberInvestmentDomains,
  inspectMacroSectorNews,
  inspectDomainFabricBoot,
  buildDomainFabricWave,
} from "./domain-fabric.js";

test("domain-fabric does not create src/domain-fabric.ts or live hospitality/healthcare", () => {
  assert.equal(DOMAIN_FABRIC_HOOKS.ready, false);
  assert.equal(DOMAIN_FABRIC_HOOKS.autoTrade, false);
  assert.equal(DOMAIN_FABRIC_HOOKS.liveDomainData, false);
  assert.equal(DOMAIN_FABRIC_HOOKS.parallelTree, false);

  assert.equal(inspectDomainFabricPath().find((c) => c.id === "DF.path")?.result, "REFUSED");
  assert.equal(inspectDomainFabricPath().find((c) => c.id === "DF.sciOsX10Dep")?.result, "REFUSED");
  assert.equal(inspectDomainFabricPath().find((c) => c.id === "DF.npxTsx")?.result, "REFUSED");
  assert.equal(inspectDomainFabricPath().find((c) => c.id === "DF.entry")?.result, "REFUSED");
  assert.equal(inspectHospitalityDomain().find((c) => c.id === "DF1_150.hospitalityInstruments")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectHospitalityDomain().find((c) => c.id === "DF1_150.hospitalityIngest")?.result, "REFUSED");
  assert.equal(inspectHealthcareDomain().find((c) => c.id === "DF151_300.healthcarePhiSandbox")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectHealthcareDomain().find((c) => c.id === "DF151_300.healthcareLos")?.result, "REFUSED");
  assert.equal(inspectCyberInvestmentDomains().find((c) => c.id === "DF301_450.cyberMttrZero")?.result, "REFUSED");
  assert.equal(inspectCyberInvestmentDomains().find((c) => c.id === "DF451_600.investmentTradeNode")?.result, "REFUSED");
  assert.equal(inspectMacroSectorNews().find((c) => c.id === "DF601_750.macroFred")?.result, "REFUSED");
  assert.equal(inspectMacroSectorNews().find((c) => c.id === "DF901_1000.sentimentLexicon")?.result, "REFUSED");
  assert.equal(inspectDomainFabricBoot().find((c) => c.id === "DF8.sevenDomainsLive")?.result, "REFUSED");
  assert.equal(inspectDomainFabricBoot().find((c) => c.id === "DF8.getHospitalityKG")?.result, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(inspectDomainFabricBoot().find((c) => c.id === "DF8.ingestMacroNews")?.result, "REFUSED");

  const wave = buildDomainFabricWave();
  assert.equal(wave.wave, "REFUSED");
  assert.equal(wave.requestedPoints, 1000);
  assert.equal(wave.health.liveDesks, 0);
  assert.equal(wave.health.ingestedWithoutFetch, 0);
  assert.equal(wave.health.phiSandboxes, 0);
  assert.equal(wave.health.megaFiles, 0);
  assert.equal(wave.health.fail, 0);
  assert.equal(wave.checks.every((c) => c.liveDomainData === false && c.applied === false), true);
});
