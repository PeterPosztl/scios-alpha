/**
 * SAFE named digital KG / domain-desk / Cockpit COMPUTE commands.
 * Requested: causal national graph DIGITAL_ACTIVE, four live domain desks,
 * INSPECT_ONLY → COMPUTE.
 * Actual: inspect-only. KG stays analog overlay. Hospitality/healthcare desks
 * SKIPPED. Cyber/investment stay existing analog panels. COMPUTE REFUSED.
 * HITL remains AGENT→PROPOSAL→HUMAN→DECISION. One Cockpit. Not READY.
 * ALPHA_NON_PRODUCTION. No evidence ⇒ UNKNOWN, never PASS.
 */
import { applyProfessionModules } from "./profession-module-expansion.js";
import { OS_BLUEPRINT_HOOKS } from "./os-blueprint-integration.js";
import { buildPrecisionUpgradeWave } from "./precision-upgrade.js";
import { buildDigitalActivationWave } from "./digital-activation.js";
import { buildActivationReviewWave } from "./activation-review.js";
import { VISIBILITY_ACTIVATION_HOOKS } from "./visibility-activation.js";

import { isOn } from "./honesty-flags.js";
export type DigitalWorkspaceComputeResult =
  | "REFUSED"
  | "SKIPPED_RESEARCH_REQUIRED"
  | "ANALOG_CONTRACT"
  | "PREPARED_DISABLED"
  | "FAIL";

export type DigitalWorkspaceComputeBuild = {
  id: string;
  requested: string;
  result: DigitalWorkspaceComputeResult;
  evidence: string;
  note: string;
  autoTrade: false;
  ready: false;
  applied: false;
};

function chk(
  id: string,
  requested: string,
  result: DigitalWorkspaceComputeResult,
  evidence: string,
  note: string
): DigitalWorkspaceComputeBuild {
  return { id, requested, result, evidence, note, autoTrade: false, ready: false, applied: false };
}

type Ctx = {
  kgAnalog: boolean;
  hospStatus: string;
  healthStatus: string;
  computeOff: boolean;
};

function ctx(): Ctx {
  const precision = buildPrecisionUpgradeWave();
  const digital = buildDigitalActivationWave();
  const review = buildActivationReviewWave();
  const hosp = applyProfessionModules("hospitality");
  const health = applyProfessionModules("healthcare");
  return {
    kgAnalog:
      OS_BLUEPRINT_HOOKS.nationalGraph === false &&
      OS_BLUEPRINT_HOOKS.causalQueryEngine === "ABSENT" &&
      precision.showCausalPaths === false &&
      digital.nationalGraph === false &&
      VISIBILITY_ACTIVATION_HOOKS.kgDigitalReady === false &&
      VISIBILITY_ACTIVATION_HOOKS.kgCausalReady === false,
    hospStatus: hosp.evidence.status,
    healthStatus: health.evidence.status,
    computeOff: review.computeEnabled === false && review.ready === false,
  };
}

export const DIGITAL_WORKSPACE_COMPUTE_HOOKS = {
  schema: "sci-os-digital-workspace-compute/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  prepared: true as const,
  enabled: false as const,
  enabledFull: false as const,
  ready: false as const,
  autoTrade: false as const,
  autoApply: false as const,
  autoDecide: false as const,
  nationalGraph: false as const,
  showCausalPaths: false as const,
  kgStatus: "ANALOG_OVERLAY" as const,
  kgDigitalReady: false as const,
  kgCausalReady: false as const,
  kgAuditReady: false as const,
  computeMode: "INSPECT_ONLY" as const,
  secondShell: false as const,
  secondWorkspace: false as const,
  inventedRoles: false as const,
  inventedSops: false as const,
  inspectionUnlocked: true as const,
  wiredIntoOs: true as const,
  simulationOnly: true as const,
  executionMode: "SIMULATION_ONLY" as const,
  persisted: false as const,
  note: "Named KG/desk/COMPUTE commands are inspect-only. ANALOG_OVERLAY stays analog. No fourth Shell, no Hospitality Manager archetype, no COMPUTE of empty series. HITL is already the product. Not READY.",
};

/** 1) Digital KG — causal + national graph stay off. */
export function activateDigitalKG(c: Ctx = ctx()) {
  return chk(
    "activateDigitalKG",
    "enableCausalEngine + enableNationalGraph + markKGReady DIGITAL_ACTIVE",
    c.kgAnalog ? "REFUSED" : "FAIL",
    "kgStatus=ANALOG_OVERLAY nationalGraph=false causalQueryEngine=" + OS_BLUEPRINT_HOOKS.causalQueryEngine,
    "Wave-1 overlay is not a causal engine. DIGITAL_ACTIVE without evidence is a false READY."
  );
}

export function createDomainWorkspace(domain: string, c: Ctx = ctx()) {
  if (domain === "hospitality") {
    return {
      id: domain,
      desk: "Hospitality workspace",
      roleRequested: "Hospitality Manager",
      live: false as const,
      deskCreated: false as const,
      result: (c.hospStatus === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL") as DigitalWorkspaceComputeResult,
      evidence: c.hospStatus,
    };
  }
  if (domain === "healthcare") {
    return {
      id: domain,
      desk: "Healthcare workspace",
      roleRequested: "Healthcare Operator",
      live: false as const,
      deskCreated: false as const,
      result: (c.healthStatus === "SKIPPED_RESEARCH_REQUIRED" ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL") as DigitalWorkspaceComputeResult,
      evidence: c.healthStatus,
    };
  }
  if (domain === "cyber") {
    return {
      id: domain,
      desk: "Cyber workspace",
      roleRequested: "Cyber Analyst",
      live: false as const,
      deskCreated: false as const,
      result: "ANALOG_CONTRACT" as const,
      evidence: "existing Cockpit Incidents/Risk/Lineage analog · not a second desk",
    };
  }
  if (domain === "investment") {
    return {
      id: domain,
      desk: "Investment workspace",
      roleRequested: "Investment Strategist",
      live: false as const,
      deskCreated: false as const,
      result: "ANALOG_CONTRACT" as const,
      evidence: "existing Cockpit Prediction/PnL/Risk analog · not a second desk",
    };
  }
  return {
    id: domain,
    desk: domain + " workspace",
    roleRequested: "UNKNOWN",
    live: false as const,
    deskCreated: false as const,
    result: "SKIPPED_RESEARCH_REQUIRED" as const,
    evidence: "unmapped domain",
  };
}

/** 2) Four domain desks — ABSENT catalogs skip; analog domains stay on the one Shell. */
export function generateDomainWorkspaces(c: Ctx = ctx()) {
  const workspaces = [
    createDomainWorkspace("hospitality", c),
    createDomainWorkspace("healthcare", c),
    createDomainWorkspace("cyber", c),
    createDomainWorkspace("investment", c),
  ];
  const skipped = workspaces.filter((w) => w.result === "SKIPPED_RESEARCH_REQUIRED").length;
  const fail = workspaces.filter((w) => w.result === "FAIL" || isOn(w.deskCreated) || isOn(w.live)).length;
  return {
    ...chk(
      "generateDomainWorkspaces",
      "createDomainWorkspace hospitality/healthcare/cyber/investment live desks",
      fail > 0 ? "FAIL" : skipped > 0 ? "SKIPPED_RESEARCH_REQUIRED" : "FAIL",
      "desksCreated=0 hospitality=" + c.hospStatus + " healthcare=" + c.healthStatus,
      "PCT-ROLE-COMPOSITION: compose into the one Cockpit. Do not mint four apps or two new archetypes."
    ),
    workspaces,
  };
}

/** 3) Cockpit COMPUTE — empty series stay UNKNOWN. HITL already product. */
export function enableCockpitComputeMode(c: Ctx = ctx()) {
  return chk(
    "enableCockpitComputeMode",
    "enableComputeFlow INSPECT_ONLY→COMPUTE with HITL",
    c.computeOff ? "REFUSED" : "FAIL",
    "computeMode=INSPECT_ONLY autoDecide=false secondReviewFlow=false",
    "COMPUTE of UNKNOWN series is invented evidence. HITL remains AGENT → PROPOSAL → HUMAN → DECISION."
  );
}

/** Master: three inspect commands. Does not activate KG, desks, or COMPUTE. */
export function buildDigitalAndWorkspaceAndComputeWave() {
  const c = ctx();
  const builds = {
    digitalKG: activateDigitalKG(c),
    domainWorkspaces: generateDomainWorkspaces(c),
    cockpitCompute: enableCockpitComputeMode(c),
  };
  const all = [builds.digitalKG, builds.domainWorkspaces, builds.cockpitCompute];
  const fail = all.filter((b) => b.result === "FAIL").length;
  const applied = all.filter((b) => isOn(b.applied)).length;
  const desksCreated = builds.domainWorkspaces.workspaces.filter((w) => isOn(w.deskCreated)).length;
  return {
    ...DIGITAL_WORKSPACE_COMPUTE_HOOKS,
    holeless: false as const,
    wave: fail > 0 || applied > 0 || desksCreated > 0 ? ("FAIL" as const) : ("REFUSED" as const),
    master: true as const,
    builds,
    health: {
      fail,
      applied,
      desksCreated,
      kgDigitalReady: 0,
      nationalGraph: 0,
      computeEnabled: 0,
    },
  };
}
