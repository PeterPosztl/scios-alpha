import { summary, rolesSeed, archetypes, families } from "./index.js";

const s = summary();
const errors = [];
if (s.families < 1) errors.push("no_families");
if (s.archetypes !== 8) errors.push(`archetypes_expected_8_got_${s.archetypes}`);
if (s.rolesSeeded < 200) errors.push(`roles_seed_lt_200_${s.rolesSeeded}`);
if (!rolesSeed.roles.every((r) => r.roleId && r.domainFamily)) {
  errors.push("role_missing_id_or_family");
}
if (!archetypes.archetypes.every((a) => a.status === "ARCHETYPE_DEFINED")) {
  errors.push("archetype_incomplete");
}
if (!families.families.every((f) => f.id && f.name)) {
  errors.push("family_incomplete");
}

const out = { ok: errors.length === 0, summary: s, errors };
console.log(JSON.stringify(out, null, 2));
process.exit(errors.length ? 1 : 0);
