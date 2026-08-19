/**
 * Professional Domain Registry — runtime compiler/loader.
 * SOURCE ROLE DATA → VALIDATION → COMPILED REGISTRY
 * ALPHA_NON_PRODUCTION
 */
import { families, archetypes, rolesSeed, uxGrammar } from "./index.js";
import { listWorkspaceProfiles } from "./experience-compiler.js";

const MAX_ERRORS = 32;

function pushError(errors, code, detail) {
  if (errors.length >= MAX_ERRORS) return;
  errors.push({ code, detail });
}

/**
 * @returns {{ ok: boolean, errors: Array<{code:string,detail:string}>, compiled: object|null }}
 */
export function compileProfessionalRegistry() {
  const errors = [];
  const famIds = new Set();
  for (const f of families.families || []) {
    if (!f.id || !f.name) pushError(errors, "FAMILY_INCOMPLETE", String(f.id || "?"));
    if (famIds.has(f.id)) pushError(errors, "FAMILY_DUPLICATE", f.id);
    famIds.add(f.id);
  }

  const roleIds = new Set();
  const archetypeList = archetypes.archetypes || [];
  for (const a of archetypeList) {
    if (!a.roleId) pushError(errors, "ARCHETYPE_MISSING_ROLE_ID", JSON.stringify(a));
    if (roleIds.has(a.roleId)) pushError(errors, "ROLE_DUPLICATE", a.roleId);
    roleIds.add(a.roleId);
    if (a.domainFamily && !famIds.has(a.domainFamily)) {
      pushError(errors, "INVALID_FAMILY_REF", `${a.roleId} → ${a.domainFamily}`);
    }
    if (!Array.isArray(a.topTasks) || a.topTasks.length < 1) {
      pushError(errors, "JTBD_MISSING", a.roleId);
    }
    if (!Array.isArray(a.requiredSCIcapabilities) || a.requiredSCIcapabilities.length < 1) {
      pushError(errors, "CAPABILITY_REF_MISSING", a.roleId);
    }
    if (!Array.isArray(a.commonWorkflows) || a.commonWorkflows.length < 1) {
      pushError(errors, "WORKFLOW_REF_MISSING", a.roleId);
    }
  }

  const seeds = rolesSeed.roles || [];
  for (const r of seeds) {
    if (!r.roleId || !r.domainFamily) {
      pushError(errors, "SEED_INCOMPLETE", String(r.roleId || "?"));
      continue;
    }
    if (roleIds.has(r.roleId)) pushError(errors, "SEED_DUPLICATE_ARCHETYPE", r.roleId);
    roleIds.add(r.roleId);
    if (!famIds.has(r.domainFamily)) {
      pushError(errors, "SEED_INVALID_FAMILY", `${r.roleId} → ${r.domainFamily}`);
    }
  }

  const profiles = listWorkspaceProfiles();
  for (const arch of archetypeList) {
    if (!profiles[arch.roleId]) {
      pushError(errors, "WORKSPACE_PROFILE_MISSING", arch.roleId);
    }
  }

  if ((uxGrammar.primaryObjects || []).length < 1) {
    pushError(errors, "UX_GRAMMAR_EMPTY", "primaryObjects");
  }

  const compiled = {
    schema: "sci-os-compiled-professional-registry/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    counts: {
      families: famIds.size,
      archetypes: archetypeList.length,
      rolesSeeded: seeds.length,
      workspaceProfiles: Object.keys(profiles).length,
      grammarObjects: (uxGrammar.primaryObjects || []).length,
    },
    families: families.families,
    archetypes: archetypeList,
    rolesSeeded: seeds,
    workspaceProfiles: profiles,
    uxGrammar,
    roleIndex: Object.fromEntries(
      [
        ...archetypeList.map((a) => [a.roleId, { ...a, tier: "ARCHETYPE_DEFINED" }]),
        ...seeds.map((r) => [r.roleId, { ...r, tier: "SEED_RESEARCH_REQUIRED" }]),
      ]
    ),
  };

  return {
    ok: errors.length === 0,
    errors,
    compiled: errors.length === 0 ? compiled : null,
  };
}

export function loadCompiledRegistryOrThrow() {
  const result = compileProfessionalRegistry();
  if (!result.ok) {
    const err = new Error(
      "PDR_COMPILE_FAILED: " + result.errors.map((e) => e.code).join(", ")
    );
    err.errors = result.errors;
    throw err;
  }
  return result.compiled;
}

const isMain =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("compile-registry.js");

if (isMain) {
  const out = compileProfessionalRegistry();
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}
