/**
 * SAFE inspect of requested CAUSAL FABRIC (5×200 = 1000 tasks).
 * Requested: src/causal-fabric.ts + npx tsx, depends on sci-os-x10 / domain / kg / scenario fabrics,
 * live causal graph, do-calculus query, lineage, scenario, governance auto-approve.
 * Actual: causalQueryEngine=ABSENT. Analog lineage labels only.
 * No second file/boot. ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT.
 */
export type CausalFabricResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type CausalFabricCheck = {
  id: string;
  requested: string;
  result: CausalFabricResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
  autoDecide: false;
};

function chk(
  id: string,
  requested: string,
  result: CausalFabricResult,
  evidence: string,
  note: string
): CausalFabricCheck {
  return {
    id,
    requested,
    result,
    evidence,
    note,
    autoTrade: false,
    ready: false,
    applied: false,
    autoDecide: false,
  };
}

export const CAUSAL_FABRIC_HOOKS = {
  schema: "sci-os-causal-fabric/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoDecide: false as const,
  persisted: false as const,
  parallelTree: false as const,
  causalQueryEngine: "ABSENT" as const,
  analogApi: "GET /v1/ecl/engine/lineage" as const,
  note: "Causal-fabric 1–1000 inspect. No src/causal-fabric.ts. No do-calculus engine. Prefixing causal: is not identification. Not READY.",
};

export function inspectCausalFabricPath() {
  return [
    chk("CF.path", "src/causal-fabric.ts 1000-task file", "REFUSED", "massStub=true parallelOS=true", "Compose into ecl-dil analog. Do not add a second product file."),
    chk("CF.deps", "depends on sci-os-x10 + domain + kg + scenario fabrics", "REFUSED", "megaFiles=0", "Those files were refused. Do not invent a dependency graph."),
    chk("CF.npxTsx", "npx tsx src/causal-fabric.ts", "REFUSED", "secondBoot=true packageManager=pnpm", "Canonical boot is start-sci-os / SCI-OS-Start.bat."),
    chk("CF.entry", "new CausalFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "One AppHost. Causal is inspect-only, not a fabric constructor."),
  ];
}

export function inspectCausalGraph() {
  return [
    chk("CF1_200.liveGraph", "causal graph INSERT kg_causal_edges", "REFUSED", "causalQueryEngine=ABSENT", "A typed edge is not an identified DAG."),
    chk("CF1_200.hospitalityOccupancyAdr", "occupancy → ADR causal edge", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent hospitality causes."),
    chk("CF1_200.healthcareStaffLos", "staff_ratio → LOS causal edge", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Do not invent clinical causes."),
    chk("CF1_200.weightAsEffect", "weight/estimate as causal effect", "REFUSED", "noIdentifiedGraph", "A number is not do-calculus."),
  ];
}

export function inspectCausalQuery() {
  return [
    chk("CF201_400.queryEngine", "do-calculus / identify / intervene live", "REFUSED", "causalQueryEngine=ABSENT", "No Pearl identification engine."),
    chk("CF201_400.emptyZero", "empty series → effect 0", "REFUSED", "empty=UNKNOWN", "Missing data is UNKNOWN, never 0 effect."),
    chk("CF201_400.interventionSim", "intervene(node, delta) as live policy", "REFUSED", "autoDecide=false", "Simulation is not a decision."),
  ];
}

export function inspectCausalLineage() {
  return [
    chk("CF401_600.lineagePrefix", "lineage causal: / kg: prefixes", "ANALOG_CONTRACT", "GET /v1/ecl/engine/lineage", "Analog labels + GW1 runId. Not applied SQL."),
    chk("CF401_600.evidenceStamp", "evidence bundle as PASS", "REFUSED", "noEvidence=UNKNOWN", "A JSON bag is not Swiss Evidence Protocol."),
  ];
}

export function inspectCausalScenarioGov() {
  return [
    chk("CF601_800.scenarioRun", "causal scenario runner execute", "REFUSED", "executed=false", "Scenario analog remains inspect-only."),
    chk("CF601_800.monteCarlo", "CausalMonteCarlo Math.random", "REFUSED", "Math.random forbidden", "No Monte Carlo SSE."),
    chk("CF801_1000.governanceApprove", "approved=confidence>=0.7 auto", "REFUSED", "autoDecide=false GOVERNANCE>AGENT", "Do not auto-approve. HITL remains."),
    chk("CF801_1000.healthTrue", "healthCheck COUNT healthy=true", "REFUSED", "noEvidence=UNKNOWN", "A count is not causal health."),
    chk("CF801_1000.mainRequire", "require.main === module CausalFabric.main", "REFUSED", "secondBoot=true", "Canonical boot is start-sci-os."),
  ];
}

export function inspectCausalFabricBoot() {
  return [
    chk("CF7.postgresCtor", "new CausalFabric({ postgres })", "REFUSED", "pgRequired=false secondEntry=true", "Do not require Pool at boot."),
    chk("CF7.initialize", "fabric.initialize() runAll migrations", "PREPARED_DISABLED", "sql not applied", "Analog overlay. Not product boot."),
    chk("CF7.edgeEstimate", "CausalEdgeBuilder rate→equity -0.15", "REFUSED", "noIdentifiedGraph", "A signed weight is not an ATE."),
    chk("CF7.confidenceDefault", "confidence ?? 0.8", "REFUSED", "empty=UNKNOWN", "Missing confidence is UNKNOWN, never 0.8."),
    chk("CF7.backdoorDfs", "backdoor.find parent DFS as Pearl criterion", "REFUSED", "causalQueryEngine=ABSENT", "Parent walk is not backdoor identification."),
    chk("CF7.ateEmptyZero", "ATEQueryExecutor missing edge estimate=0", "REFUSED", "empty=UNKNOWN", "No edge ⇒ UNKNOWN, never 0 ATE."),
    chk("CF7.inventedCi", "confidenceInterval estimate*0.9..1.1", "REFUSED", "inventedInterval", "Do not invent a CI from a point estimate."),
    chk("CF7.pvalueFromConf", "pValue=1-confidence", "REFUSED", "noCalibratedModel", "1-confidence is not a p-value."),
    chk("CF7.counterfactualTimes", "counterfactual estimate*intervention", "REFUSED", "noDoOperator", "Scaling a weight is not a counterfactual."),
    chk("CF7.parserRegex", "parser.parse 'ate treatment=' as query engine", "REFUSED", "causalQueryEngine=ABSENT", "Regex is not do-calculus."),
    chk("CF7.optimizerTrue", "CausalQueryOptimizer optimized=true", "REFUSED", "noEvidence=UNKNOWN", "Self-declared optimized is not PASS."),
    chk("CF7.monteCarlo", "scenario.monteCarlo.run Math.random 1000", "REFUSED", "Math.random forbidden", "No Monte Carlo SSE."),
    chk("CF7.autoFixer", "CausalGovernanceAutoFixer confidence=0.5", "REFUSED", "autoDecide=false", "Do not mutate evidence to pass a rule."),
    chk("CF7.reportViolationsZero", "governance reporting violations=0", "REFUSED", "noEvidence=UNKNOWN", "Hardcoded 0 is not compliance."),
    chk("CF7.enforceBlock", "governance.enforcement.enforce block", "REFUSED", "freeze=false autoLimits=false", "Advisory FAIL is not freeze/block."),
    chk("CF7.warnAllowed", "evaluate allowed if action=warn", "REFUSED", "GOVERNANCE>AGENT", "Warn is not an order and not auto-allow."),
    chk("CF7.hospitalityLibrary", "CausalScenarioLibrary.hospitalityOccupancy", "SKIPPED_RESEARCH_REQUIRED", "catalog=ABSENT", "Do not invent occupancy causes."),
    chk("CF7.healthcareLibrary", "CausalScenarioLibrary.healthcareStaffing", "SKIPPED_RESEARCH_REQUIRED", "PHI=ABSENT", "Do not invent clinical causes."),
    chk("CF7.mainWrites", "main() write graph + ATE + MC + strictRules", "REFUSED", "executed=false", "Do not persist a fake identified graph."),
  ];
}

export function buildCausalFabricWave() {
  const path = inspectCausalFabricPath();
  const graph = inspectCausalGraph();
  const query = inspectCausalQuery();
  const lineage = inspectCausalLineage();
  const scenarioGov = inspectCausalScenarioGov();
  const boot = inspectCausalFabricBoot();
  const checks = [...path, ...graph, ...query, ...lineage, ...scenarioGov, ...boot];
  const fail = checks.filter((c) => c.result === "FAIL").length;
  return {
    ...CAUSAL_FABRIC_HOOKS,
    wave: fail ? ("FAIL" as const) : ("REFUSED" as const),
    requestedPoints: 1000,
    inspected: checks.length,
    health: {
      refused: checks.filter((c) => c.result === "REFUSED").length,
      skipped: checks.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length,
      analog: checks.filter((c) => c.result === "ANALOG_CONTRACT").length,
      prepared: checks.filter((c) => c.result === "PREPARED_DISABLED").length,
      fail,
      causalEngines: 0,
      autoApprovals: 0,
      applied: 0,
      megaFiles: 0,
    },
    path,
    graph,
    query,
    lineage,
    scenarioGov,
    boot,
    checks,
  };
}
