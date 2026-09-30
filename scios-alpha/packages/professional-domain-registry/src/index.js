/**
 * Bundle-safe Professional Domain Registry data exports.
 * Static JSON imports — esbuild inlines for CJS/ESM packaged backends.
 * No runtime source-tree paths. ALPHA_NON_PRODUCTION
 */
import families from "./families.json" with { type: "json" };
import archetypes from "./archetypes.json" with { type: "json" };
import rolesSeed from "./roles-seed.json" with { type: "json" };
import uxGrammar from "./ux-grammar.json" with { type: "json" };
import familyOverlays from "./family-overlays.json" with { type: "json" };

export { families, archetypes, rolesSeed, uxGrammar, familyOverlays };
export {
  composeProfessionBlueprint,
  listProfessionBlueprints,
  professionBlueprintCatalog,
  listFamilyOverlays,
  composeFamilyUxV3,
  composeHeroV3,
  masterExecutionBox,
  PROFESSION_BLUEPRINT_HONESTY,
} from "./profession-blueprint.js";

export function summary() {
  return {
    label: "ALPHA_NON_PRODUCTION",
    families: families.families.length,
    archetypes: archetypes.archetypes.length,
    rolesSeeded: rolesSeed.count ?? rolesSeed.roles?.length ?? 0,
    rolesFullySpecified: archetypes.archetypes.length,
    rolesResearchRequired: (rolesSeed.roles || []).filter(
      (r) => r.status === "SEED_RESEARCH_REQUIRED"
    ).length,
    grammarObjects: uxGrammar.primaryObjects.length,
    loadMode: "static_json_import",
    note: "No 200 pages generated. Compose remaining roles onto validated workspace primitives.",
  };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("index.js")) {
  console.log(JSON.stringify(summary(), null, 2));
}
