import { summary, rolesSeed, archetypes, families } from "./index.js";
import {
  listProfessionBlueprints,
  listFamilyOverlays,
  professionBlueprintCatalog,
  composeFamilyUxV3,
  composeHeroV3,
  masterExecutionBox,
} from "./profession-blueprint.js";

const s = summary();
const errors = [];
if (s.families < 1) errors.push("no_families");
if (s.archetypes < 8) errors.push(`archetypes_expected_at_least_8_got_${s.archetypes}`);
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
const overlays = listFamilyOverlays();
if (overlays.length !== 21) errors.push("family_overlays_not_21");
const instances = listProfessionBlueprints();
if (instances.length !== 200) errors.push("blueprints_not_200");
if (instances.some((b) => b.honesty.ready === true || b.honesty.autoTrade === true)) {
  errors.push("blueprint_honesty_flipped");
}
if (instances.filter((b) => b.specialist).some((b) => Object.keys(b.deltas || {}).length > 0)) {
  errors.push("specialist_invented_deltas");
}
const cat = professionBlueprintCatalog();
if (cat.roles200Validated !== false) errors.push("roles200Validated_flipped");
const hosp = composeFamilyUxV3("hospitality");
if (!hosp || hosp.status !== "SKIPPED_RESEARCH_REQUIRED") errors.push("hospitality_not_skipped");
const heroes = instances.map((b) => composeHeroV3(b.roleId));
if (heroes.length !== 200) errors.push("heroes_not_200");
if (heroes.some((h) => h.inventedSops === true || h.honesty.ready === true)) errors.push("hero_honesty_flipped");
if (composeFamilyUxV3("market_portfolio_risk")?.ohlc !== true) errors.push("fam08_ohlc");
if (composeFamilyUxV3("supply_ops_risk")?.stub !== true) errors.push("fam20_stub");
const box = masterExecutionBox();
if (box.ready === true || box.autoTrade === true) errors.push("master_box_flag_flip");
const checklistValues = [
  ...Object.values(box.checklist.backend || {}),
  ...Object.values(box.checklist.frontend || {}),
];
if (checklistValues.some((v) => v === true)) errors.push("master_box_checklist_unevidenced_pass");

const out = { ok: errors.length === 0, summary: { ...s, familyOverlays: overlays.length, blueprints: instances.length }, errors };
console.log(JSON.stringify(out, null, 2));
process.exit(errors.length ? 1 : 0);
