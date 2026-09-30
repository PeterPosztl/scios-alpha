/**
 * Domain hydration — professional registry validation + archetype JTBD.
 * ALPHA_NON_PRODUCTION
 */
import { compileProfessionalRegistry } from "../compile-registry.js";
import { archetypes } from "../index.js";

export function hydrateDomain(input = {}) {
  const roleId = input.roleId || null;
  const registry = compileProfessionalRegistry();
  const arch = (archetypes.archetypes || []).find((a) => a.roleId === roleId);
  const missing = [];

  if (!roleId) missing.push("roleId");
  if (!arch) missing.push("archetype");
  if (!registry.ok) missing.push("registry_validation");

  const domainOntology = {
    domainFamily: arch?.domainFamily || "UNKNOWN",
    entityTypes: arch?.commonEntities || [],
    archetypeName: arch?.name || null,
  };

  const jobToBeDone = {
    mission: arch?.primaryMission || null,
    topTasks: arch?.topTasks || [],
    criticalDecisions: arch?.criticalDecisions || [],
    workflows: arch?.commonWorkflows || [],
  };

  return {
    schema: "sci-os-hydration-domain/v1",
    ok: registry.ok && !!arch,
    registryOk: registry.ok,
    registryErrors: registry.errors || [],
    roleId,
    domainOntology,
    jobToBeDone,
    requiredCapabilities: arch?.requiredSCIcapabilities || [],
    missing,
  };
}
