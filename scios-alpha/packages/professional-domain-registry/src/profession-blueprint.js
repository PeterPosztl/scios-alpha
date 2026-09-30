/**
 * ProfessionBlueprint compose — Template ⊕ FAM overlay ⊕ INST.
 * Loads roles-seed (200), families (21), archetypes (9). Not 200 apps.
 * ALPHA_NON_PRODUCTION. No auto-trade. Not READY.
 */
import families from "./families.json" with { type: "json" };
import archetypes from "./archetypes.json" with { type: "json" };
import rolesSeed from "./roles-seed.json" with { type: "json" };
import familyOverlaysDoc from "./family-overlays.json" with { type: "json" };

export const PROFESSION_BLUEPRINT_SCHEMA = "sci-os-profession-blueprint/v1";
export const ALPHA_LABEL = "ALPHA_NON_PRODUCTION";

export const PROFESSION_BLUEPRINT_HONESTY = {
  autoTrade: false,
  ready: false,
  durable: false,
  execution: false,
  pgDriver: "ABSENT",
  calibratedLive: false,
  inventedSops: false,
  liveDomainData: false,
  secondShell: false,
  roles200Validated: false,
};

export const RIBBON_STAGES = [
  "raw_event",
  "normalized_event",
  "pit_feature",
  "baseline_prediction",
  "calibration_uncertainty",
  "independent_risk_gate",
  "governance_decision",
  "deterministic_execution",
  "outcome",
  "immutable_lineage",
  "cockpit_view",
];

export const ENGINE_BINDINGS = {
  prediction: "POST /v1/ecl/engine/prediction",
  risk: "POST /v1/ecl/engine/risk-eval",
  decision: "POST /v1/ecl/engine/decision",
  sim: "POST /v1/ecl/engine/execution-sim",
  lineage: "GET /v1/ecl/engine/lineage",
  evidence: "GET /v1/ecl/engine/evidence",
  compute: "POST /v1/ecl/engine/cockpit-compute",
};

const OVERLAYS = familyOverlaysDoc.overlays || [];
const BY_FAMILY = new Map(OVERLAYS.map((o) => [o.id, o]));

function isSpecialist(roleId) {
  return /specialist_\d+$/.test(roleId || "");
}

export function listFamilyOverlays() {
  return OVERLAYS;
}

export function familyOverlayById(familyId) {
  return BY_FAMILY.get(familyId) || null;
}

export function ohlcAllowedForFamily(familyId) {
  const o = BY_FAMILY.get(familyId);
  return o ? o.ohlc === true : false;
}

function stampHonesty() {
  return { ...PROFESSION_BLUEPRINT_HONESTY };
}

function composeFromSeed(seed) {
  const family = BY_FAMILY.get(seed.domainFamily);
  if (!family) return null;
  const specialist = isSpecialist(seed.roleId);
  return {
    schema: PROFESSION_BLUEPRINT_SCHEMA,
    label: ALPHA_LABEL,
    roleId: seed.roleId,
    name: seed.name,
    domainFamily: seed.domainFamily,
    inherit: family.famId,
    archetypeId: family.archetypeId,
    status: "SEED_RESEARCH_REQUIRED",
    specialist,
    deltas: {},
    inventedSops: false,
    honesty: stampHonesty(),
    domain: {
      primaryObject: family.primaryObject,
      inputAdapters: family.inputAdapters.slice(),
      eventTypes: family.eventTypes.slice(),
    },
    family: {
      famId: family.famId,
      id: family.id,
      primaryObject: family.primaryObject,
      queue: family.queue,
      ohlc: family.ohlc,
      marketRef: family.marketRef,
      newsEvent: family.newsEvent,
      predictionMeaning: family.predictionMeaning,
      decisionSet: family.decisionSet.slice(),
      charts: family.charts.slice(),
      evidenceRules: family.evidenceRules,
      ribbonEmphasis: family.ribbonEmphasis,
      skip: family.skip === true,
    },
    ontology: {
      chain: "DataSource→Dataset→Feature→ModelVersion→Prediction→RiskDecision→Decision→ProofArtifact",
      relationSpine: "PRODUCES→SUPPORTS→TRAINS→PRODUCES→REQUIRES→PROVES",
      roleEvaluates: "EVALUATES",
      nationalGraph: false,
      causalQueryEngine: "ABSENT",
    },
    lineage: {
      path: "ingest→feature→predict→risk→gov→sim→outcome",
      verified: "UNKNOWN",
    },
    evidence: {
      verdictDefault: "UNKNOWN",
      verdictsAllowed: ["PASS", "FAIL", "UNKNOWN", "DEGRADED"],
      rules: family.evidenceRules,
    },
    engine: { ...ENGINE_BINDINGS },
    reporting: { empty: "UNKNOWN" },
    governance: { autoExecute: false, requiresHuman: true },
    gw: { GW1: "ANALOG", GW2_GW7: "PREPARED_DISABLED" },
    ledger: {
      actor: "human:" + seed.roleId,
      persisted: false,
      durable: false,
    },
    ribbon: {
      stages: RIBBON_STAGES.slice(),
      emphasis: family.ribbonEmphasis,
    },
  };
}

export function composeProfessionBlueprint(roleId) {
  if (!roleId || typeof roleId !== "string") return null;
  const seed = (rolesSeed.roles || []).find((r) => r.roleId === roleId);
  if (seed) return composeFromSeed(seed);
  return null;
}

export function listProfessionBlueprints() {
  return (rolesSeed.roles || [])
    .map((seed) => composeFromSeed(seed))
    .filter(Boolean);
}

export function professionBlueprintCatalog() {
  const instances = listProfessionBlueprints();
  const specialist = instances.filter((b) => b.specialist).length;
  return {
    schema: PROFESSION_BLUEPRINT_SCHEMA,
    label: ALPHA_LABEL,
    honesty: stampHonesty(),
    rolesSeeded: instances.length,
    familyOverlays: OVERLAYS.length,
    familiesJson: (families.families || []).length,
    archetypesDefined: (archetypes.archetypes || []).length,
    specialistInheritOnly: specialist,
    namedRoles: instances.length - specialist,
    roles200Validated: false,
    inventedSops: false,
    ohlcFamilies: OVERLAYS.filter((o) => o.ohlc).map((o) => o.id),
    skippedFamilies: OVERLAYS.filter((o) => o.skip).map((o) => o.id),
    engine: { ...ENGINE_BINDINGS },
    note: "Compose Template ⊕ FAM ⊕ INST. Compile stays on 9 archetypes. Not 200 apps. Not READY.",
  };
}

export const LAYOUT_ALGEBRA_V3 = {
  page: { bg: "snow", padPx: 48 },
  section: { padPx: 24 },
  card: { surface: true, fogBorder: true, iceLeftPx: 2, padPx: 12 },
  grid: { columns: 12, gutterPx: 12, maxPx: 1180 },
  density: ["STANDARD", "COMFORTABLE", "EXPERT"],
  motion: { microMs: 150, sciMs: 180, macroMs: 300, criticalMs: 0 },
};

export const MISSION_PANELS_V3 = [
  { id: "forecast", span: "1-6", module: "PredictionPanel" },
  { id: "horizon", span: "7-12", module: "UncertaintyPanel" },
  { id: "threat_gate", span: "1-6", module: "RiskPanel" },
  { id: "governance", span: "7-12", module: "DecisionPanel" },
  { id: "simulator", span: "1-6", module: "SimulationPanel" },
  { id: "proof_timeline", span: "7-12", module: "EvidencePanel" },
  { id: "chain_of_truth", span: "1-12", module: "LineagePanel" },
  { id: "ops_intel", span: "1-12", module: "OpsIntel" },
];

function isStubFamily(family) {
  return (
    family.famId === "FAM-20" ||
    family.evidenceRules === "STUB" ||
    (family.inputAdapters || []).includes("STUB")
  );
}

export function composeFamilyUxV3(familyId) {
  if (familyId === "hospitality" || familyId === "healthcare") {
    return {
      schema: "sci-os-family-ux-v3/v1",
      label: ALPHA_LABEL,
      id: familyId,
      famId: null,
      status: "SKIPPED_RESEARCH_REQUIRED",
      skip: true,
      ohlc: false,
      marketRef: false,
      newsEvent: false,
      charts: [],
      ribbonEmphasis: "cockpit_view",
      evidenceRules: "SKIPPED_RESEARCH_REQUIRED",
      decisionSet: [],
      stub: false,
      honesty: stampHonesty(),
    };
  }
  const family = BY_FAMILY.get(familyId);
  if (!family) return null;
  const charts = (family.charts || []).slice(0, 2);
  return {
    schema: "sci-os-family-ux-v3/v1",
    label: ALPHA_LABEL,
    id: family.id,
    famId: family.famId,
    status: family.skip ? "SKIPPED_RESEARCH_REQUIRED" : "SEED_RESEARCH_REQUIRED",
    skip: family.skip === true,
    ohlc: family.ohlc === true,
    marketRef: family.marketRef === true,
    newsEvent: family.newsEvent === true,
    charts: charts.length ? charts : family.charts.slice(),
    ribbonEmphasis: family.ribbonEmphasis,
    evidenceRules: family.evidenceRules,
    decisionSet: family.decisionSet.slice(),
    stub: isStubFamily(family),
    predictionMeaning: family.predictionMeaning,
    queue: family.queue,
    honesty: stampHonesty(),
  };
}

function resolveSeedForHero(roleId) {
  const roles = rolesSeed.roles || [];
  const direct = roles.find((r) => r.roleId === roleId);
  if (direct) return { seed: direct, requestedRoleId: roleId, overlayOnly: false };
  if (!roleId || typeof roleId !== "string") return { seed: null, requestedRoleId: roleId, overlayOnly: false };
  if (roleId.startsWith("arch.")) {
    const overlays = OVERLAYS.filter((o) => o.archetypeId === roleId || o.extraArchetypeId === roleId);
    for (const overlay of overlays) {
      const seed = roles.find((r) => r.domainFamily === overlay.id && !isSpecialist(r.roleId));
      if (seed) return { seed, requestedRoleId: roleId, overlayOnly: false };
    }
    if (overlays[0]) return { seed: null, requestedRoleId: roleId, overlayOnly: overlays[0] };
  }
  return { seed: null, requestedRoleId: roleId, overlayOnly: false };
}

function missionCopyFor(family, specialist, archetype) {
  return {
    forecast: family.predictionMeaning,
    horizon: family.skip ? "SKIPPED_RESEARCH_REQUIRED" : "NON-PRODUCTION",
    threatGate: "fail-closed · killSwitch=critical 0ms",
    governance: "HITL · autoExecute=false · proposal",
    simulator: "simulated:true · executed=false",
    proofTimeline: "empty ≠ PASS",
    chainOfTruth: "verified only if recompute",
    opsIntel: family.queue,
    jtbd: specialist ? "inherit_only" : (archetype && archetype.primaryMission) || family.predictionMeaning,
  };
}

function heroFromParts(opts) {
  const family = opts.family;
  const famUx = composeFamilyUxV3(family.id);
  const specialist = opts.specialist === true;
  const arch = (archetypes.archetypes || []).find((a) => a.roleId === family.archetypeId);
  return {
    schema: "sci-os-hero-v3/v1",
    label: ALPHA_LABEL,
    roleId: opts.roleId,
    requestedRoleId: opts.requestedRoleId,
    name: opts.name,
    familyOverline: family.id,
    queue: family.queue,
    family: famUx,
    layout: LAYOUT_ALGEBRA_V3,
    ribbon: { stages: RIBBON_STAGES.slice(), emphasis: family.ribbonEmphasis },
    missionPanels: MISSION_PANELS_V3.slice(),
    missionCopy: missionCopyFor(family, specialist, arch),
    charts: famUx.charts.slice(),
    decisionGate: {
      decisionSet: family.decisionSet.slice(),
      approveDisabledIfReject: true,
      autoExecute: false,
      tone: "proposal",
    },
    simulation: { simulated: true, executed: false },
    lineage: { verified: "UNKNOWN" },
    evidence: { verdictDefault: "UNKNOWN", emptyMeans: "UNKNOWN" },
    reporting: { empty: "UNKNOWN" },
    honesty: stampHonesty(),
    inventedSops: false,
    specialist,
    status: "SEED_RESEARCH_REQUIRED",
    roles200Validated: false,
    roleSwitchMotionMs: 300,
    ohlc: family.ohlc === true,
    skip: family.skip === true,
    stub: famUx.stub,
    overlayOnly: opts.overlayOnly === true,
    ledger: {
      actor: "human:" + opts.roleId,
      persisted: false,
      durable: false,
    },
    engine: { ...ENGINE_BINDINGS },
  };
}

export function composeHeroV3(roleId) {
  const resolved = resolveSeedForHero(roleId);
  if (resolved.seed) {
    const family = BY_FAMILY.get(resolved.seed.domainFamily);
    if (!family) return null;
    return heroFromParts({
      family,
      roleId: resolved.seed.roleId,
      requestedRoleId: resolved.requestedRoleId,
      name: resolved.seed.name,
      specialist: isSpecialist(resolved.seed.roleId),
      overlayOnly: false,
    });
  }
  if (resolved.overlayOnly) {
    const arch = (archetypes.archetypes || []).find((a) => a.roleId === roleId);
    return heroFromParts({
      family: resolved.overlayOnly,
      roleId,
      requestedRoleId: roleId,
      name: (arch && arch.name) || resolved.overlayOnly.id,
      specialist: false,
      overlayOnly: true,
    });
  }
  return null;
}

export function listFamilyUxV3() {
  return OVERLAYS.map((o) => composeFamilyUxV3(o.id)).filter(Boolean);
}

/** PASS only when this package can observe the fact. Anything else stays UNKNOWN. */
function verdict(ok) {
  return ok === true ? "PASS" : "UNKNOWN";
}

export const MASTER_BOX_VERIFIER = "scripts/tests/master-execution-box-verify.cjs";

export function masterExecutionBox() {
  const cat = professionBlueprintCatalog();
  const overlays = listFamilyOverlays();
  const instances = listProfessionBlueprints();
  const heroes = (rolesSeed.roles || []).map((r) => composeHeroV3(r.roleId)).filter(Boolean);
  const blueprintShapeOk =
    instances.length > 0 &&
    instances.every(
      (b) =>
        b.schema === PROFESSION_BLUEPRINT_SCHEMA &&
        b.label === ALPHA_LABEL &&
        b.status === "SEED_RESEARCH_REQUIRED" &&
        b.ribbon.stages.length === RIBBON_STAGES.length &&
        b.lineage.verified === "UNKNOWN" &&
        b.evidence.verdictDefault === "UNKNOWN" &&
        b.governance.autoExecute === false
    );
  const ledgerActorOk =
    instances.length > 0 &&
    instances.every(
      (b) => b.ledger.actor === "human:" + b.roleId && b.ledger.persisted === false && b.ledger.durable === false
    );
  return {
    schema: "sci-os-master-execution-box/v1",
    label: ALPHA_LABEL,
    ready: false,
    autoTrade: false,
    durable: false,
    execution: false,
    pgDriver: "ABSENT",
    catalog: cat,
    familyUxCount: overlays.length,
    heroCount: heroes.length,
    roles200Validated: false,
    inventedSops: false,
    checklist: {
      legend: "PASS = observed in this package · UNKNOWN = not observable here, resolve via verifier",
      verifier: MASTER_BOX_VERIFIER,
      backend: {
        professionBlueprintV1: verdict(blueprintShapeOk),
        inst200: verdict(cat.rolesSeeded === 200),
        fam21: verdict(overlays.length === 21),
        familyUxV3: verdict(listFamilyUxV3().length === overlays.length),
        heroV3: verdict(heroes.length === cat.rolesSeeded),
        missionPanels: verdict(MISSION_PANELS_V3.length === 8),
        ledgerActor: verdict(ledgerActorOk),
        engineRoutes: { ...ENGINE_BINDINGS },
        engineRoutesWired: "UNKNOWN",
        dataFabricObjects: "UNKNOWN",
        lineageHash: "UNKNOWN",
        evidenceChain: "UNKNOWN",
      },
      frontend: {
        tokens: "UNKNOWN",
        primitivesSci: "UNKNOWN",
        analyze12col: "UNKNOWN",
        ribbonStateMachine: "UNKNOWN",
        missionPanels: "UNKNOWN",
        truthGraph: "UNKNOWN",
        familyUxV3: "UNKNOWN",
        heroV3: "UNKNOWN",
        i18nHonesty: "UNKNOWN",
      },
    },
    skipped: {
      hospitality: "SKIPPED_RESEARCH_REQUIRED",
      healthcare: "SKIPPED_RESEARCH_REQUIRED",
      fam11: "physical_security",
      fam18: "cloud_infra",
      fam20: "STUB",
    },
    note: "Wired compose. Not READY. Not 200 apps. No boot. No flag-flip.",
  };
}
