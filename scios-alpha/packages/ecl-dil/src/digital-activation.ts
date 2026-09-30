/**
 * SAFE digital activation wave.
 * Requested: nationalGraph, causalQuery, LDA PASS, 191/191 seeds COMPLETE, 200/200 roles.
 * Actual: those flips are REFUSED. Analog contracts stay analog. Not READY.
 * ALPHA_NON_PRODUCTION. GOVERNANCE > AGENT. No evidence ⇒ UNKNOWN, never PASS.
 */
import { OS_BLUEPRINT_HOOKS, buildOsBlueprintIntegration } from "./os-blueprint-integration.js";
import { buildProfessionModuleExpansion } from "./profession-module-expansion.js";
import { buildProfessionalCompileReport } from "./professional-compile.js";
import { buildRoleProfessionalInventory } from "./role-professional.js";

import { isOn } from "./honesty-flags.js";
export type DigitalActivationResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "FAIL";

export type DigitalActivationCheck = {
  id: string;
  requested: string;
  result: DigitalActivationResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
};

function chk(
  id: string,
  requested: string,
  result: DigitalActivationResult,
  evidence: string,
  note: string
): DigitalActivationCheck {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false };
}

const REQUESTED_SEEDS = [
  "cyber_event",
  "cyber_case",
  "cyber_indicator",
  "cyber_risk",
  "cyber_decision",
  "cyber_evidence",
  "inv_instrument",
  "inv_scenario",
  "inv_strategy",
  "inv_risk",
  "inv_decision",
  "inv_evidence",
  "ops_order",
  "ops_fulfillment",
  "ops_invoice",
  "ops_payment",
  "ops_ledger",
  "hosp_demand",
  "hosp_staffing",
  "hosp_revenue",
  "hc_load",
  "hc_capacity",
  "hc_outcome",
  "pm_task",
  "pm_milestone",
  "pm_dependency",
  "consult_kpi",
  "consult_hypothesis",
  "consult_engagement",
  "sales_lead",
  "sales_pipeline",
  "sales_forecast",
  "re_property",
  "re_listing",
  "re_market",
  "sc_demand",
  "sc_procure",
  "sc_deliver",
] as const;

const ANALOG_SEED_PREFIX = /^(cyber_|inv_)/;

export function buildDigitalActivationWave() {
  const inv = buildRoleProfessionalInventory();
  const compile = buildProfessionalCompileReport();
  const os = buildOsBlueprintIntegration();
  const expansion = buildProfessionModuleExpansion();
  const lda = compile.blueprints.find((b) => b.id === "AgentSystem.LDA") as
    | { id: string; result?: string; autoPatch?: boolean }
    | undefined;
  const kgHook = os.kg;

  const kg = [
    chk(
      "KG.nationalGraph",
      "nationalGraph=true",
      isOn(kgHook.nationalGraph) ? "FAIL" : "REFUSED",
      "nationalGraph=" + String(isOn(kgHook.nationalGraph)),
      "A national graph is not in ALPHA evidence. Overlay labels stay analog."
    ),
    chk(
      "KG.causalQuery",
      "causalQuery=true",
      kgHook.causalQueryEngine === "ABSENT" && OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT"
        ? "REFUSED"
        : "FAIL",
      "causalQueryEngine=" + String(kgHook.causalQueryEngine),
      "Causal query engine remains ABSENT. No evidence ⇒ UNKNOWN, never PASS."
    ),
    chk(
      "KG.nodeContract",
      "register Person/Org/Asset/… as DIGITAL runtime nodes",
      "ANALOG_CONTRACT",
      "wave1Kinds=" + (kgHook.wave1NodeKinds || []).join(","),
      "Node names map onto Wave-1 entity/event/decision/risk/evidence/policy. Runtime graph engine ABSENT."
    ),
    chk(
      "KG.edgeContract",
      "register belongs_to/triggers/… as DIGITAL runtime edges",
      "ANALOG_CONTRACT",
      "wave1Relations=" + (kgHook.wave1Relations || []).slice(0, 4).join(",") + "…",
      "Spec edges overlay Wave-1 PRODUCES/REQUIRES/AFFECTS/PROVES. Not a new relation runtime."
    ),
  ];

  const ldaChecks = [
    chk(
      "AgentSystem.LDA.enable",
      "enableLDA allowCompose/workspaces/roleExpansion/KG",
      lda?.result === "REFUSED" && lda.autoPatch === false ? "REFUSED" : "FAIL",
      "result=" +
        (lda?.result || "UNKNOWN") +
        " autoPatch=" +
        String(lda?.autoPatch === true) +
        " autoApply=" +
        String(isOn(OS_BLUEPRINT_HOOKS.autoApply)),
      "LDA auto-compose would violate GOVERNANCE > AGENT. Cursor stays implementer outside the product."
    ),
  ];

  const domainAlias: Record<string, { os?: string; expansion?: string }> = {
    cyber: { os: "cyber" },
    investment: { os: "investment" },
    hospitality: { expansion: "hospitality" },
    healthcare: { expansion: "healthcare" },
    pm: { expansion: "project-management" },
    consulting: { expansion: "consulting" },
    sales: { expansion: "sales" },
    real_estate: { expansion: "real-estate" },
    supply_chain: { os: "ops", expansion: "supply-chain" },
  };

  const domains = Object.entries(domainAlias).map(([id, alias]) => {
    const osHit = alias.os ? os.blueprints.find((b) => b.id === alias.os) : undefined;
    const expHit = alias.expansion
      ? expansion.professions.find((p) => p.id === alias.expansion)
      : undefined;
    if (osHit?.result === "REGISTERED_ANALOG" || expHit?.result === "REGISTERED_ANALOG") {
      return chk(
        "Domain." + id,
        "registerDomain workspace_" + id + " DIGITAL",
        "ANALOG_CONTRACT",
        "os=" +
          (osHit?.result || "none") +
          " expansion=" +
          (expHit?.result || "none") +
          " catalog=" +
          String(osHit?.catalogStatus || expHit?.catalogStatus || "UNKNOWN"),
        "Existing analog/STUB compose. Not a generated DIGITAL domain pack."
      );
    }
    return chk(
      "Domain." + id,
      "registerDomain workspace_" + id + " DIGITAL",
      "SKIPPED_RESEARCH_REQUIRED",
      "expansion=" + (expHit?.result || "UNKNOWN"),
      "Unmapped domain. Do not invent specialist SOPs or DIGITAL feeds."
    );
  });

  const seeds = REQUESTED_SEEDS.map((id) =>
    chk(
      "Seed." + id,
      "completeSeed + markSeedReady",
      ANALOG_SEED_PREFIX.test(id) ? "ANALOG_CONTRACT" : "SKIPPED_RESEARCH_REQUIRED",
      ANALOG_SEED_PREFIX.test(id) ? "maps to existing cyber/finance analog family" : "no family evidence",
      "SEED_RESEARCH_REQUIRED is not COMPLETE. markSeedReady refused."
    )
  );

  const roles = [
    chk(
      "RoleCatalog.200",
      "stabilizeRole 1..200 → 200/200 STABILIZED",
      "REFUSED",
      "fullySpecified=" + inv.registry.rolesFullySpecified + " researchRequired=" + inv.registry.rolesResearchRequired,
      "9 archetypes remain the only fully specified roles. 191 seeds stay incomplete."
    ),
    chk(
      "RoleAlias.hospitality_manager",
      "registerRoleAlias Hospitality Manager",
      "SKIPPED_RESEARCH_REQUIRED",
      "catalog Hospitality ABSENT",
      "Aliases cannot mint archetypes. Cyber Analyst / Investment Strategist already map to existing 9."
    ),
  ];

  const all = [...kg, ...ldaChecks, ...domains, ...seeds, ...roles];
  const fail = all.filter((c) => c.result === "FAIL").length;
  const refused = all.filter((c) => c.result === "REFUSED").length;
  const analog = all.filter((c) => c.result === "ANALOG_CONTRACT").length;
  const skipped = all.filter((c) => c.result === "SKIPPED_RESEARCH_REQUIRED").length;

  return {
    schema: "sci-os-digital-activation-wave/v1" as const,
    label: "ALPHA_NON_PRODUCTION" as const,
    ready: false as const,
    holeless: false as const,
    autoTrade: false as const,
    persisted: false as const,
    simulationOnly: true as const,
    executionMode: "SIMULATION_ONLY" as const,
    inventedSops: false as const,
    digitalRuntime: false as const,
    nationalGraph: false as const,
    causalQuery: false as const,
    ldaPass: false as const,
    lda: "REFUSED" as const,
    seedsComplete: 0 as const,
    seedsResearchRequired: 191 as const,
    roles200Stabilized: false as const,
    rolesFullySpecified: inv.registry.rolesFullySpecified,
    wave: fail > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    kg,
    ldaChecks,
    domains,
    seeds,
    roles,
    health: {
      fail,
      refused,
      analogContract: analog,
      skippedResearchRequired: skipped,
      requestedSeeds: REQUESTED_SEEDS.length,
      seedsMarkedReady: 0,
      liveSiem: 0,
      liveErp: 0,
    },
    note: "SAFE digital activation. National graph, causal query, LDA PASS, 191 seed COMPLETE, and 200/200 roles are REFUSED. Analog contracts remain analog. Cockpit still Snow/Navy. Not READY.",
  };
}
