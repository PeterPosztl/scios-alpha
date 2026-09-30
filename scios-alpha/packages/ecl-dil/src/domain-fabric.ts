/**
 * SAFE inspect of requested DOMAIN FABRIC (7 domains × 1000 tasks).
 * Requested: src/domain-fabric.ts + DomainFabric boot, depends on sci-os-x10.ts,
 * live hospitality/healthcare catalogs, PHI sandbox, ingested++ without fetch,
 * FRED/WorldBank as live, empty series → 0.
 * Actual: analog profession modules. Hospitality/Healthcare ABSENT.
 * No second file, no second boot. ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT.
 */
export type DomainFabricResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type DomainFabricCheck = {
  id: string;
  requested: string;
  result: DomainFabricResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
  liveDomainData: false;
};

function chk(
  id: string,
  requested: string,
  result: DomainFabricResult,
  evidence: string,
  note: string
): DomainFabricCheck {
  return {
    id,
    requested,
    result,
    evidence,
    note,
    autoTrade: false,
    ready: false,
    applied: false,
    liveDomainData: false,
  };
}

export const DOMAIN_FABRIC_HOOKS = {
  schema: "sci-os-domain-fabric/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  liveDomainData: false as const,
  persisted: false as const,
  parallelTree: false as const,
  analogApi: "GET /v1/ecl/professional/modules" as const,
  note: "Domain-fabric 1–1000 inspect. No src/domain-fabric.ts. No sci-os-x10.ts dependency. Hospitality/Healthcare SKIPPED. ingested++ without fetch refused. Not READY.",
};

export function inspectDomainFabricPath() {
  return [
    chk("DF.path", "src/domain-fabric.ts 1000-task file", "REFUSED", "massStub=true parallelOS=true", "Compose into ecl-dil analog. Do not add a second product file."),
    chk("DF.sciOsX10Dep", "depends on sci-os-x10.ts Fabric", "REFUSED", "sci-os-x10=ABSENT", "The durable fabric megafile was refused. Do not invent a dependency."),
    chk("DF.npxTsx", "npx tsx src/domain-fabric.ts", "REFUSED", "secondBoot=true packageManager=pnpm", "Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("DF.entry", "new DomainFabric({ domains: [...] })", "REFUSED", "secondEntry=true", "One AppHost. Domain packs are analog GET, not a fabric constructor."),
  ];
}

export function inspectHospitalityDomain() {
  return [
    chk("DF1_150.hospitalityInstruments", "HospitalityInstrumentSetBuilder rooms/ADR/RevPAR", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent occupancy instruments."),
    chk("DF1_150.hospitalityKg", "hotel/room/guest/booking KG nodes", "SKIPPED_RESEARCH_REQUIRED", "nationalGraph=false", "No hospitality graph. Analog overlay only."),
    chk("DF1_150.hospitalityScenarios", "high_season/event_surge live", "SKIPPED_RESEARCH_REQUIRED", "scenarios=ABSENT", "Do not invent SOP templates as live."),
    chk("DF1_150.hospitalityIngest", "HospitalityKGIngestionPipeline ingested=signals.length", "REFUSED", "ingested++ without fetch", "Counting payloads is not ingest."),
    chk("DF1_150.hospitalityForecastZero", "historical.length<7 → fill(0)", "REFUSED", "empty=UNKNOWN", "Missing series is UNKNOWN, never 0 occupancy."),
    chk("DF1_150.hospitalityFactory", "HospitalityDomainFactory.createConfig live", "SKIPPED_RESEARCH_REQUIRED", "DOMAIN_CATALOGS.hospitality=ABSENT", "Factory does not create a catalog."),
  ];
}

export function inspectHealthcareDomain() {
  return [
    chk("DF151_300.healthcareInstruments", "beds/OR/ventilator/mortality instruments", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT PHI=ABSENT", "Do not invent clinical instruments."),
    chk("DF151_300.healthcareKg", "patient/staff/encounter nodes", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "No EHR graph."),
    chk("DF151_300.healthcarePhiSandbox", "HealthcarePHISandbox.redact + hash", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "String redaction is not a PHI sandbox. Do not fake healthcare."),
    chk("DF151_300.healthcareLos", "LOSPredictor invented age/ICU formula", "REFUSED", "noModel=UNKNOWN", "Hardcoded LOS is not evidence."),
    chk("DF151_300.healthcareReadmit", "ReadmissionRiskModel score 0–1", "REFUSED", "noCalibratedModel", "Invented weights are not a clinical model."),
    chk("DF151_300.healthcareForecastZero", "admissions<7 → fill(0)", "REFUSED", "empty=UNKNOWN", "Missing admissions is UNKNOWN."),
    chk("DF151_300.healthcareFactory", "HealthcareDomainFactory.createConfig live", "SKIPPED_RESEARCH_REQUIRED", "DOMAIN_CATALOGS.healthcare=ABSENT", "No clinical desk."),
  ];
}

export function inspectCyberInvestmentDomains() {
  return [
    chk("DF301_450.cyberInstruments", "CyberInstrumentSetBuilder live endpoints", "ANALOG_CONTRACT", "GET /v1/ecl/professional/modules?professionId=cyber", "Analog cyber bridge. liveSiem=false."),
    chk("DF301_450.cyberKg", "asset/threat/incident Palantir graph", "REFUSED", "nationalGraph=false", "Wave-1 analog overlay. No live SOC graph."),
    chk("DF301_450.cyberMttrZero", "empty incidents → MTTR 0", "REFUSED", "empty=UNKNOWN", "No incidents ⇒ UNKNOWN, never 0 MTTR."),
    chk("DF301_450.cyberFactory", "CyberDomainFactory createConfig", "ANALOG_CONTRACT", "cyber-research-bridge inspect", "Prepared analog. Not a live SIEM pack."),
    chk("DF451_600.investmentInstruments", "InvestmentInstrumentSetBuilder live books", "ANALOG_CONTRACT", "GET /v1/pnl-book GET /v1/risk-book preview=true", "Notional preview. realized=false."),
    chk("DF451_600.investmentVolZero", "returns.length<2 → vol 0", "REFUSED", "empty=UNKNOWN", "Missing returns is UNKNOWN, never 0 vol."),
    chk("DF451_600.investmentTradeNode", "InvestmentKGNodeBuilder trade executedAt=now", "REFUSED", "executed=false autoTrade=false", "A KG node is not a fill."),
    chk("DF451_600.investmentFactory", "InvestmentDomainFactory createConfig", "ANALOG_CONTRACT", "ecl engine analog", "Investment analog remains. No second domain OS."),
  ];
}

export function inspectMacroSectorNews() {
  return [
    chk("DF601_750.macroFred", "ingestFromFRED live series", "REFUSED", "FRED=ABSENT", "Caller-supplied numbers are not a FRED connector."),
    chk("DF601_750.macroWorldBank", "ingestFromWorldBank live", "REFUSED", "WorldBank=ABSENT", "Do not stamp ingested from a value argument."),
    chk("DF601_750.macroRegime", "goldilocks/stagflation from empty means", "REFUSED", "empty=UNKNOWN", "Empty GDP/inflation is UNKNOWN, not a regime."),
    chk("DF601_750.macroInflationZero", "historical<3 → fill(0)", "REFUSED", "empty=UNKNOWN", "Missing CPI is UNKNOWN."),
    chk("DF751_900.sectorIngestCount", "ingest ingested=signals.length", "REFUSED", "ingested++ without fetch", "Counting is not ingest."),
    chk("DF751_900.sectorRotation", "SectorRotationDetector live GICS", "PREPARED_DISABLED", "noVenueFeed", "Analog labels only. Not certified sector data."),
    chk("DF901_1000.newsIngest", "NewsIngestionPipeline ingested=items.length", "REFUSED", "ingested++ without fetch", "Headlines in memory are not a news fabric."),
    chk("DF901_1000.sentimentLexicon", "SentimentAnalyzer word-list as live NLP", "REFUSED", "noCalibratedModel", "A 20-word lexicon is not sentiment. UNKNOWN without evidence."),
    chk("DF901_1000.newsImpact", "NewsImpactEstimator invented source weights", "REFUSED", "inventedWeights", "Do not claim Reuters/Bloomberg impact without a licensed feed."),
  ];
}

export function inspectDomainFabricBoot() {
  return [
    chk("DF8.sevenDomainsLive", "new DomainFabric 7 domains incl hospitality/healthcare", "REFUSED", "liveDomainData=false catalogs=ABSENT", "Constructor registration is not a catalog. Hospitality/Healthcare stay SKIPPED."),
    chk("DF8.healthSizeTrue", "healthCheck healthy=configs.size>0", "REFUSED", "noEvidence=UNKNOWN", "A Map size is not domain health. Missing probe ⇒ UNKNOWN."),
    chk("DF8.getHospitalityKG", "getHospitalityKG().nodes.buildHotel live", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent Grand Hotel nodes."),
    chk("DF8.lexiconSentiment", "analyzeSentiment('Market is great!')", "REFUSED", "noCalibratedModel", "A word list is not sentiment. UNKNOWN without evidence."),
    chk("DF8.macroRegimeTwoPoints", "detectMacroRegime([0.03,0.02],[0.02,0.03]) live", "REFUSED", "noCertifiedSeries", "Two invented points are not a macro regime."),
    chk("DF8.sectorRotationPadded", "detectSectorRotation({tech:0.15,energy:-0.05})", "REFUSED", "paddedSector=true", "Do not invent leading/lagging from caller numbers."),
    chk("DF8.ingestMacroNews", "ingestMacro/ingestNews/ingestHeadline ingested++", "REFUSED", "ingested++ without fetch", "Counting is not ingest. FRED/Reuters ABSENT."),
    chk("DF9.mainRequire", "require.main === module DomainFabric.main", "REFUSED", "secondBoot=true", "Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("DF9.all1000Init", "console 'All 1000 tasks initialized'", "REFUSED", "noEvidence=UNKNOWN", "A log line is not READY."),
  ];
}

export function buildDomainFabricWave() {
  const path = inspectDomainFabricPath();
  const hospitality = inspectHospitalityDomain();
  const healthcare = inspectHealthcareDomain();
  const cyberInvest = inspectCyberInvestmentDomains();
  const macroSectorNews = inspectMacroSectorNews();
  const boot = inspectDomainFabricBoot();
  const checks = [...path, ...hospitality, ...healthcare, ...cyberInvest, ...macroSectorNews, ...boot];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...DOMAIN_FABRIC_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 1000,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      liveDesks: 0,
      ingestedWithoutFetch: 0,
      phiSandboxes: 0,
      applied: 0,
      megaFiles: 0,
    },
    path,
    hospitality,
    healthcare,
    cyberInvest,
    macroSectorNews,
    boot,
    checks,
  };
}
