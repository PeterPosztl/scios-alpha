export function summary(): {
    label: string;
    families: number;
    archetypes: number;
    rolesSeeded: number;
    rolesFullySpecified: number;
    rolesResearchRequired: number;
    grammarObjects: number;
    loadMode: string;
    note: string;
};
import families from "./families.json" with { type: "json" };
import archetypes from "./archetypes.json" with { type: "json" };
import rolesSeed from "./roles-seed.json" with { type: "json" };
import uxGrammar from "./ux-grammar.json" with { type: "json" };
import familyOverlays from "./family-overlays.json" with { type: "json" };
export { families, archetypes, rolesSeed, uxGrammar, familyOverlays };
export { composeProfessionBlueprint, listProfessionBlueprints, professionBlueprintCatalog, listFamilyOverlays, composeFamilyUxV3, composeHeroV3, masterExecutionBox, PROFESSION_BLUEPRINT_HONESTY } from "./profession-blueprint.js";
