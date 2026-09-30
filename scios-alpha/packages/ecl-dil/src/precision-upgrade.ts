/**
 * SAFE precision upgrade overlay.
 * Requested: digital KG spine (causal paths), hospitality/healthcare domain-enable,
 * DIGITAL cockpit module flows, minSeriesLength=30.
 * Actual: analog inspect contracts only. Causal/live/ABSENT domains REFUSED or SKIPPED.
 * Prerequisite digital activation (LDA PASS, 191 COMPLETE, 200/200) remains REFUSED.
 * ALPHA_NON_PRODUCTION. Snow/Navy tokens only. No second Shell. Not READY.
 */
import { buildDigitalActivationWave } from "./digital-activation.js";
import { OS_BLUEPRINT_HOOKS, buildOsBlueprintIntegration, KG_NODE_MAP } from "./os-blueprint-integration.js";
import { PROFESSION_EXPANSION_HOOKS, buildProfessionModuleExpansion } from "./profession-module-expansion.js";

import { isOn } from "./honesty-flags.js";
export type PrecisionResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "FAIL";

export type PrecisionCheck = {
  id: string;
  requested: string;
  result: PrecisionResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  requested: string,
  result: PrecisionResult,
  evidence: string,
  note: string
): PrecisionCheck {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false };
}

/** SCI palette only — UXD-COLOR-001. Not Palantir neon. */
export const KG_VISUAL_TOKENS = {
  Person: { color: "Graphite", cssVar: "--graphite", emphasis: "medium" },
  Org: { color: "Navy", cssVar: "--navy", emphasis: "strong" },
  Asset: { color: "Fog", cssVar: "--fog", emphasis: "medium" },
  Event: { color: "Ice", cssVar: "--ice", emphasis: "strong" },
  Case: { color: "Navy", cssVar: "--navy", emphasis: "strong" },
  Instrument: { color: "Fog", cssVar: "--fog", emphasis: "medium" },
  Policy: { color: "Snow", cssVar: "--snow", emphasis: "medium" },
  Risk: { color: "Graphite", cssVar: "--graphite", emphasis: "strong" },
  Decision: { color: "Navy", cssVar: "--navy", emphasis: "strong" },
  Evidence: { color: "Snow", cssVar: "--snow", emphasis: "medium" },
} as const;

export const KG_SPINE_LAYERS = [
  {
    id: "operational",
    label: "Operational Layer",
    nodes: ["Event", "Transaction", "Log", "Case"],
    edges: ["triggers", "records", "belongs_to"],
    visible: true as const,
    populated: false as const,
  },
  {
    id: "analytical",
    label: "Analytical Layer",
    nodes: ["Model", "Prediction", "Risk", "Scenario"],
    edges: ["derived_from", "evaluates", "impacts"],
    visible: true as const,
    populated: false as const,
  },
  {
    id: "governance",
    label: "Governance Layer",
    nodes: ["Policy", "Limit", "Approval", "Decision", "Evidence"],
    edges: ["governs", "violates", "approved_by", "supported_by"],
    visible: true as const,
    populated: false as const,
  },
] as const;

const RESEARCH_FLOWS = {
  hospitality: {
    entities: ["Hotel", "Room", "Reservation", "Guest", "Shift", "RevenueCenter"],
    signals: ["occupancy", "adr", "pickup", "cancellations", "staff_load"],
    predictionTargets: ["demand_curve", "revenue_forecast", "staffing_need"],
    riskDimensions: ["overbooking", "understaffing", "guest_satisfaction", "cost_risk"],
    decisions: ["adjust_staffing", "change_pricing", "reallocate_rooms"],
    lineageChain: ["signal", "model", "prediction", "decision", "outcome"],
    evidenceChain: ["booking_log", "staff_schedule", "revenue_report", "audit_entry"],
  },
  healthcare: {
    entities: ["Hospital", "Ward", "Bed", "Patient", "Staff", "Supply"],
    signals: ["icu_load", "er_load", "staff_availability", "supply_level"],
    predictionTargets: ["icu_overload_risk", "er_wait_time", "resource_strain"],
    riskDimensions: ["overload", "shortage", "outcome_risk"],
    decisions: ["allocate_capacity", "adjust_staffing", "prioritize_cases"],
    lineageChain: ["signal", "capacity_model", "prediction", "decision", "clinical_outcome"],
    evidenceChain: ["admission_log", "capacity_report", "triage_record", "audit_entry"],
  },
} as const;

export const PRECISION_UPGRADE_HOOKS = {
  schema: "sci-os-precision-upgrade/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  inventedSops: false as const,
  digitalRuntime: false as const,
  nationalGraph: false as const,
  showCausalPaths: false as const,
  minSeriesLengthEnforced: false as const,
  liveDomainData: false as const,
  secondShell: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Precision overlay on analog contracts. Causal paths, hospitality/healthcare enable, and pad-to-30 series are REFUSED. Not READY.",
};

export function buildPrecisionUpgradeWave() {
  const prior = buildDigitalActivationWave();
  const os = buildOsBlueprintIntegration();
  const expansion = buildProfessionModuleExpansion();
  const cyber = os.blueprints.find((b) => b.id === "cyber");
  const investment = os.blueprints.find((b) => b.id === "investment");
  const hosp = expansion.professions.find((p) => p.id === "hospitality");
  const health = expansion.professions.find((p) => p.id === "healthcare");

  const prerequisite = [
    chk(
      "Prerequisite.digitalActivation",
      "Digitális KG aktiválva · LDA PASS · Seeds COMPLETE · 200/200",
      prior.wave === "REFUSED" && prior.ldaPass === false && prior.seedsComplete === 0
        ? "REFUSED"
        : "FAIL",
      "wave=" +
        prior.wave +
        " ldaPass=" +
        String(isOn(prior.ldaPass)) +
        " seedsComplete=" +
        String(prior.seedsComplete) +
        " roles200Stabilized=" +
        String(isOn(prior.roles200Stabilized)),
      "Precision cannot ride a refused activation. Analog overlay only."
    ),
  ];

  const spine = [
    chk(
      "KG.spine.layout",
      "configureKGSpine layout=layered DIGITAL runtime",
      "ANALOG_CONTRACT",
      "layers=" + KG_SPINE_LAYERS.map((l) => l.id).join("/"),
      "Layer labels overlay Wave-1 + os.kg.layers. No graph layout engine."
    ),
    chk(
      "KG.spine.causalPaths",
      "showCausalPaths=true",
      OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT" && os.kg.causalQueryEngine === "ABSENT"
        ? "REFUSED"
        : "FAIL",
      "causalQueryEngine=" + String(os.kg.causalQueryEngine),
      "Causal paths would invent do-calculus. Engine remains ABSENT."
    ),
    chk(
      "KG.spine.populated",
      "nationalGraph populated visualization spine",
      os.kg.populated === false && os.kg.nationalGraph === false ? "REFUSED" : "FAIL",
      "populated=" + String(isOn(os.kg.populated)) + " nationalGraph=" + String(isOn(os.kg.nationalGraph)),
      "Spine is inspectable analog, not a Palantir Foundry graph."
    ),
    chk(
      "KG.visualTokens",
      "node colors Snow/Navy-compatible Swiss=0",
      "ANALOG_CONTRACT",
      "tokens=" +
        Object.keys(KG_VISUAL_TOKENS).length +
        " Person=" +
        KG_VISUAL_TOKENS.Person.cssVar +
        " mapped=" +
        KG_NODE_MAP.Person,
      "SCI palette only. No neon. Radius remains 0."
    ),
  ];

  const domainFlows = [
    chk(
      "DomainFlow.cyber",
      "enableDomainFlow cyber DIGITAL",
      cyber?.result === "REGISTERED_ANALOG" ? "ANALOG_CONTRACT" : "FAIL",
      "signals=" + (cyber?.signals.length || 0) + " entities=" + (cyber?.entities.length || 0),
      "Existing cyber analog schema. Not a live SIEM pack."
    ),
    chk(
      "DomainFlow.investment",
      "enableDomainFlow investment DIGITAL",
      investment?.result === "REGISTERED_ANALOG" ? "ANALOG_CONTRACT" : "FAIL",
      "signals=" + (investment?.signals.length || 0) + " entities=" + (investment?.entities.length || 0),
      "Existing investment analog schema. Not a live broker pack."
    ),
    chk(
      "DomainFlow.hospitality",
      "enableDomainFlow hospitality DIGITAL",
      hosp?.result === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "catalog=" + (hosp?.catalogStatus || "UNKNOWN") + " schemaSignals=" + RESEARCH_FLOWS.hospitality.signals.length,
      "Research schema is inspectable. Apply still ignores payload. No invented occupancy curve."
    ),
    chk(
      "DomainFlow.healthcare",
      "enableDomainFlow healthcare DIGITAL",
      health?.result === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "catalog=" + (health?.catalogStatus || "UNKNOWN") + " schemaSignals=" + RESEARCH_FLOWS.healthcare.signals.length,
      "Research schema is inspectable. No invented ICU load series."
    ),
  ];

  const moduleFlows = [
    chk(
      "ModuleFlow.PredictionPanel",
      "wireModuleFlow compute_predictions DIGITAL including hospitality/healthcare",
      "ANALOG_CONTRACT",
      "analog=cyber,investment,ops · researchRequired=hospitality,healthcare",
      "Empty series stays UNKNOWN. No pad-to-30 demo curve."
    ),
    chk(
      "ModuleFlow.RiskPanel",
      "wireModuleFlow compute_risk_matrix DIGITAL",
      "ANALOG_CONTRACT",
      "empty risk cells remain UNKNOWN",
      "No invented 36-cell decoration."
    ),
    chk(
      "ModuleFlow.LineagePanel",
      "wireModuleFlow render_lineage_paths + causal_paths",
      "REFUSED",
      "kgOverlay=true nationalGraph=false causalPaths=false",
      "Lineage analog chain only. Causal path renderer ABSENT."
    ),
    chk(
      "ModuleFlow.EvidencePanel",
      "wireModuleFlow compose_evidence_chain DIGITAL",
      "ANALOG_CONTRACT",
      "audit templates analog · evidenceBound=false without payload",
      "Not a bound ledger."
    ),
    chk(
      "ModuleFlow.Intelligence",
      "wireModuleFlow compute_edge DIGITAL",
      "ANALOG_CONTRACT",
      "edgeWithoutPayload=UNKNOWN",
      "Hospitality demand−capacity never computed from ABSENT catalog."
    ),
    chk(
      "ModuleFlow.Decisions",
      "wireModuleFlow compose_decision_options DIGITAL auto-ready",
      "ANALOG_CONTRACT",
      "autoDecide=false",
      "Human remains decision maker. AGENT → PROPOSAL → HUMAN → DECISION."
    ),
  ];

  const precision = [
    chk(
      "Precision.minSeriesLength",
      "minSeriesLength=30",
      "REFUSED",
      "predictionFoundationSeries empty ⇒ []",
      "Padding to 30 would invent a demo curve. No evidence ⇒ UNKNOWN, never PASS."
    ),
    chk(
      "Precision.minSignalsPerDomain",
      "minSignalsPerDomain=5 live",
      "ANALOG_CONTRACT",
      "cyber=" +
        (cyber?.signals.length || 0) +
        " investment=" +
        (investment?.signals.length || 0) +
        " hospitality schema=" +
        RESEARCH_FLOWS.hospitality.signals.length +
        " live=0",
      "Listed analog/research signals are not live certified feeds."
    ),
    chk(
      "Precision.requireEvidenceForDecision",
      "requireEvidenceForDecision live gate",
      "ANALOG_CONTRACT",
      "decision templates exist · hospitality skipped",
      "Template is not a production evidence gate."
    ),
    chk(
      "Precision.enforceDomainLimits",
      "enforceDomainLimits live",
      "REFUSED",
      "liveDomainData=" + String(isOn(PROFESSION_EXPANSION_HOOKS.liveDomainData)),
      "No live domain limit engine. SIMULATION_ONLY."
    ),
    chk(
      "Usability.reducedMotion",
      "reducedMotionRespect=true",
      "ANALOG_CONTRACT",
      "prefers-reduced-motion + data-reduced-motion already in Shell",
      "Existing SCI motion tokens. No new animation framework."
    ),
    chk(
      "Usability.domainContextHeader",
      "domainContextHeader=true",
      "ANALOG_CONTRACT",
      "context-bar ctx-role already present",
      "Horizontal SCI nav unchanged."
    ),
    chk(
      "Usability.maxPanelComplexity",
      "maxPanelComplexity=7",
      "ANALOG_CONTRACT",
      "Analyze modules already ≤7 primary cards",
      "No extra Palantir rail."
    ),
  ];

  const all = [...prerequisite, ...spine, ...domainFlows, ...moduleFlows, ...precision];
  const fail = all.filter((c) => c.result === "FAIL").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const analog = all.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = all.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;

  return {
    ...PRECISION_UPGRADE_HOOKS,
    ldaPass: false as const,
    seedsComplete: 0 as const,
    roles200Stabilized: false as const,
    holeless: false as const,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    prerequisite,
    spine,
    domainFlows,
    moduleFlows,
    precision,
    kgSpine: {
      layout: "layered-analog" as const,
      layers: KG_SPINE_LAYERS,
      tokens: KG_VISUAL_TOKENS,
      defaults: {
        maxDepth: 6 as const,
        showCausalPaths: false as const,
        showAuditChain: true as const,
        showDomainOverlay: true as const,
        populated: false as const,
      },
    },
    researchFlows: RESEARCH_FLOWS,
    analogFlows: {
      cyber: cyber
        ? {
            entities: cyber.entities,
            signals: cyber.signals,
            predictionTargets: cyber.prediction,
            riskDimensions: cyber.riskDimensions,
            decisions: cyber.decisions,
            lineageChain: cyber.lineage,
            evidenceChain: cyber.evidence,
          }
        : null,
      investment: investment
        ? {
            entities: investment.entities,
            signals: investment.signals,
            predictionTargets: investment.prediction,
            riskDimensions: investment.riskDimensions,
            decisions: investment.decisions,
            lineageChain: investment.lineage,
            evidenceChain: investment.evidence,
          }
        : null,
    },
    cockpitFlows: {
      PredictionPanel: {
        inputs: ["signals", "models", "domain_blueprints"],
        process: "inspect_analog_series",
        outputs: ["prediction_series", "uncertainty_bands"],
        analog: ["cyber", "investment", "ops"],
        researchRequired: ["hospitality", "healthcare"],
      },
      RiskPanel: {
        inputs: ["prediction_series", "domain_risk_dimensions"],
        process: "inspect_analog_matrix",
        outputs: ["risk_grid", "risk_scores"],
        analog: ["cyber", "investment", "ops"],
        researchRequired: ["hospitality", "healthcare"],
      },
      LineagePanel: {
        inputs: ["kg_nodes", "kg_edges", "domain_lineage_chain"],
        process: "inspect_analog_chain",
        outputs: ["lineage_view"],
        analog: ["cyber", "investment", "ops"],
        causalPaths: false as const,
      },
      EvidencePanel: {
        inputs: ["evidence_chain", "audit_entries", "policies"],
        process: "inspect_analog_audit",
        outputs: ["evidence_view", "audit_trail"],
        analog: ["cyber", "investment", "ops"],
        researchRequired: ["hospitality", "healthcare"],
      },
      Intelligence: {
        inputs: ["prediction_series", "risk_scores", "domain_limits"],
        process: "inspect_analog_edge",
        outputs: ["edge_indicator", "confidence_score"],
        analog: ["cyber", "investment", "ops"],
        researchRequired: ["hospitality", "healthcare"],
        edgeWithoutPayload: "UNKNOWN" as const,
      },
      Decisions: {
        inputs: ["edge_indicator", "risk_matrix", "evidence_view", "policies"],
        process: "inspect_decision_template",
        outputs: ["decision_templates"],
        analog: ["cyber", "investment", "ops"],
        researchRequired: ["hospitality", "healthcare"],
        autoDecide: false as const,
      },
    },
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      liveSiem: 0,
      liveErp: 0,
      inventedSeries: 0,
    },
  };
}
