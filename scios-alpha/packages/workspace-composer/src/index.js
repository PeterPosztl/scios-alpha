/**
 * Workspace Composer — derives modules from Professional Domain Registry Experience Compiler.
 * Does NOT own a separate profile authority table.
 * ALPHA_NON_PRODUCTION
 */
import {
  compileExperience,
  listWorkspaceProfiles,
} from "@scios/professional-domain-registry/compiler";

const ROLE_BY_PROFILE = {
  market_analysis: "arch.market_analyst",
  fraud_investigation: "arch.fraud_investigator",
  soc_ops: "arch.soc_analyst",
  portfolio_risk: "arch.fin_risk_analyst",
  eng_ops: "arch.eng_operator",
};

export function composeWorkspace(profileId, opts = {}) {
  const roleId = opts.roleId || ROLE_BY_PROFILE[profileId] || null;
  if (roleId) {
    const compiled = compileExperience({
      roleId,
      userExperienceLevel: opts.userExperienceLevel || "intermediate",
      runtimeMount: false,
      availableData: opts.availableData || { status: "UNKNOWN", bindings: [] },
      permission: opts.permission || { source: null, actionsAllowed: [], actionsDenied: [] },
    });
    const modules = (compiled.output?.modules || []).map((m, i) => ({
      id: m.id,
      order: m.order || i + 1,
      system: m.system,
    }));
    return {
      label: "ALPHA_NON_PRODUCTION",
      profileId: compiled.output?.workspaceProfileId || profileId,
      roleId,
      modules,
      density: compiled.output?.density || opts.density || "compact",
      disclosureDefault:
        compiled.output?.disclosureDefault || opts.disclosureDefault || "L2",
      runtimeStatus: "DERIVED_FROM_EXPERIENCE_COMPILER",
      authority: "@scios/professional-domain-registry/compiler",
      note: "Host UI must render modules; composer does not invent data",
    };
  }

  const profiles = listWorkspaceProfiles();
  const entry = Object.values(profiles).find(
    (p) => p.workspaceProfileId === profileId
  );
  const modules = (entry?.modules || [{ id: "AttentionHome", order: 1 }]).map(
    (m, i) => ({
      id: m.id,
      order: m.order || i + 1,
    })
  );
  return {
    label: "ALPHA_NON_PRODUCTION",
    profileId,
    modules,
    density: opts.density || "compact",
    disclosureDefault: opts.disclosureDefault || "L2",
    runtimeStatus: "DERIVED_FROM_EXPERIENCE_COMPILER",
    authority: "@scios/professional-domain-registry/compiler",
    note: "Host UI must render modules; composer does not invent data",
  };
}

/** @deprecated Do not use as authority — use listWorkspaceProfiles() from compiler */
export const PROFILES = Object.fromEntries(
  Object.values(listWorkspaceProfiles()).map((p) => [
    p.workspaceProfileId,
    p.modules.map((m) => m.id),
  ])
);
