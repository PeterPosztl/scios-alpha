/**
 * SAFE inspect of requested KG FABRIC (5×200 = 1000 tasks).
 * Requested: src/kg-fabric.ts + npx tsx, depends on sci-os-x10.ts,
 * live nodes/edges, ingested++ without fetch, causal edges, scenario edges,
 * Palantir national graph.
 * Actual: Wave-1 analog overlay. nationalGraph=false causalQueryEngine=ABSENT.
 * No second file, no second boot. ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT.
 */
export type KgFabricResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type KgFabricCheck = {
  id: string;
  requested: string;
  result: KgFabricResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
  nationalGraph: false;
};

function chk(
  id: string,
  requested: string,
  result: KgFabricResult,
  evidence: string,
  note: string
): KgFabricCheck {
  return {
    id,
    requested,
    result,
    evidence,
    note,
    autoTrade: false,
    ready: false,
    applied: false,
    nationalGraph: false,
  };
}

export const KG_FABRIC_HOOKS = {
  schema: "sci-os-kg-fabric/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  nationalGraph: false as const,
  causalQueryEngine: "ABSENT" as const,
  persisted: false as const,
  parallelTree: false as const,
  analogApi: "GET /v1/ecl/engine/lineage" as const,
  note: "KG-fabric 1–1000 inspect. No src/kg-fabric.ts. No sci-os-x10.ts. Analog overlay only. ingested++ without fetch refused. Not READY.",
};

export function inspectKgFabricPath() {
  return [
    chk("KG.path", "src/kg-fabric.ts 1000-task file", "REFUSED", "massStub=true parallelOS=true", "Compose into ecl-dil analog overlay. Do not add a second product file."),
    chk("KG.sciOsX10Dep", "depends on sci-os-x10.ts Fabric", "REFUSED", "sci-os-x10=ABSENT", "The durable fabric megafile was refused. Do not invent a dependency."),
    chk("KG.npxTsx", "npx tsx src/kg-fabric.ts", "REFUSED", "secondBoot=true packageManager=pnpm", "Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("KG.entry", "new KgFabric() second entry", "REFUSED", "secondEntry=true", "One AppHost. KG is analog GET, not a fabric constructor."),
  ];
}

export function inspectKgNodes() {
  return [
    chk("KG1_200.liveNodes", "KG nodes 1–200 INSERT kg_nodes", "ANALOG_CONTRACT", "os-blueprint KG_NODE_MAP overlay", "Labels only. Not applied SQL."),
    chk("KG1_200.hospitalityNodes", "hotel/room/guest nodes", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent hospitality graph."),
    chk("KG1_200.healthcareNodes", "patient/staff/encounter nodes", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "No EHR graph."),
    chk("KG1_200.validTrueDefault", "node.valid=true from constructor", "REFUSED", "noEvidence=UNKNOWN", "Missing probe ⇒ UNKNOWN, never PASS."),
  ];
}

export function inspectKgEdges() {
  return [
    chk("KG201_400.liveEdges", "KG edges 201–400 INSERT kg_edges", "ANALOG_CONTRACT", "os-blueprint KG_EDGE_MAP overlay", "Labels only. Not applied SQL."),
    chk("KG201_400.cascade", "ON DELETE CASCADE kg_edges", "REFUSED", "append-only analog", "Do not cascade-delete overlay history."),
    chk("KG201_400.weightDefault1", "weight=1 as evidence", "REFUSED", "noEvidence=UNKNOWN", "Default weight is not a calibrated edge."),
  ];
}

export function inspectKgIngestion() {
  return [
    chk("KG401_600.ingestCount", "ingest ingested=items.length", "REFUSED", "ingested++ without fetch", "Counting payloads is not ingest."),
    chk("KG401_600.fredNews", "FRED/Reuters as KG source", "REFUSED", "liveFeed=false", "Caller arrays are not licensed feeds."),
    chk("KG401_600.errorsZero", "errors=0 without try path", "REFUSED", "noEvidence=UNKNOWN", "Silent success is not ingest health."),
  ];
}

export function inspectKgCausal() {
  return [
    chk("KG601_800.causalType", "kg_edges type=causal live", "REFUSED", "causalQueryEngine=ABSENT", "Prefixing causal: is not do-calculus."),
    chk("KG601_800.weightAsCause", "weight as causal strength", "REFUSED", "noIdentifiedGraph", "A number is not an identified effect."),
    chk("KG601_800.nationalGraph", "nationalGraph=true / Palantir", "REFUSED", "nationalGraph=false", "Wave-1 analog overlay only."),
  ];
}

export function inspectKgScenario() {
  return [
    chk("KG801_1000.scenarioEdges", "scenario → instrument edges live", "PREPARED_DISABLED", "GET /v1/ecl/professional/automation-prep", "Analog scenario labels. Not a live edge fabric."),
    chk("KG801_1000.hospitalityScenario", "hosp.high_season affects_demand", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent occupancy causal edges."),
    chk("KG801_1000.mainRequire", "require.main === module kg-fabric", "REFUSED", "secondBoot=true", "Canonical boot is start-sci-os."),
  ];
}

export function inspectKgFabricBoot() {
  return [
    chk("KG7.postgresCtor", "new KGFabric({ postgres })", "REFUSED", "pgRequired=false OPTIONAL_INFRA_DEGRADED", "Do not require Pool at boot. durable=true only after INSERT."),
    chk("KG7.initialize", "fabric.initialize() runAll migrations", "PREPARED_DISABLED", "sql prepared not applied", "Analog overlay. Tables are not product boot."),
    chk("KG7.hospitalityHotelWrite", "nodes.writer.write buildHospitalityHotel Grand/Bp", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent hotel nodes."),
    chk("KG7.byDomainHospitality", "byDomainQuery.byDomain('hospitality')", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Empty catalog is not a domain graph."),
    chk("KG7.healthcarePatientAsGuest", "buildHealthcarePatient used as guest node", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Do not mix PHI stubs into hospitality edges."),
    chk("KG7.cyberThreatWrite", "edges.writer.write threat→asset 0.9", "ANALOG_CONTRACT", "cyber-research-bridge overlay liveSiem=false", "Analog labels. Not a live SOC graph."),
    chk("KG7.pathFinderSql", "pathFinder.findPaths live SQL DFS", "PREPARED_DISABLED", "nationalGraph=false", "Wave-1 overlay. No Palantir path engine."),
    chk("KG7.fredIngest", "ingestion.fred.ingestSeries caller values", "REFUSED", "FRED=ABSENT ingested++ without fetch", "Caller GDP 25000 is not a FRED connector."),
    chk("KG7.rssIngest", "ingestion.rss.ingest reuters.com/rss", "REFUSED", "licensedFeed=ABSENT", "Do not stamp Reuters ingest without a feed."),
    chk("KG7.twitterIngest", "TwitterIngestion live tweets", "REFUSED", "twitter=ABSENT", "Do not invent a social ingest OS."),
    chk("KG7.causalWrite", "causal.builder.build rate→equity -0.15 + writer", "REFUSED", "causalQueryEngine=ABSENT", "A signed weight is not do-calculus."),
    chk("KG7.monteCarloRandom", "scenarios.monteCarlo.run Math.random 1000", "REFUSED", "Math.random forbidden", "Monte Carlo SSE is not analog. Deterministic preview only."),
    chk("KG7.healthCountTrue", "healthCheck COUNT(*) healthy=true", "REFUSED", "noEvidence=UNKNOWN", "Empty tables or missing probe ⇒ UNKNOWN, never PASS."),
    chk("KG7.pgPasswordSecret", "PG_PASSWORD=secret default", "REFUSED", "noSecretsCommitted", "Do not commit credentials."),
    chk("KG7.all1000Init", "console All 1000 tasks initialized", "REFUSED", "noEvidence=UNKNOWN", "A log line is not READY."),
  ];
}

export function buildKgFabricWave() {
  const path = inspectKgFabricPath();
  const nodes = inspectKgNodes();
  const edges = inspectKgEdges();
  const ingestion = inspectKgIngestion();
  const causal = inspectKgCausal();
  const scenario = inspectKgScenario();
  const boot = inspectKgFabricBoot();
  const checks = [...path, ...nodes, ...edges, ...ingestion, ...causal, ...scenario, ...boot];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...KG_FABRIC_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 1000,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      nationalGraphStamps: 0,
      ingestedWithoutFetch: 0,
      causalEngines: 0,
      applied: 0,
      megaFiles: 0,
    },
    path,
    nodes,
    edges,
    ingestion,
    causal,
    scenario,
    boot,
    checks,
  };
}
