/**
 * Design-system layer map — compose into Cockpit, do not mkdir V1 ui-* packages.
 * Chain: ui-tokens → ui-core → layout → molecules → organisms
 * ALPHA_NON_PRODUCTION
 */
import { sciTokens } from "./tokens.js";

export const UI_LAYER_MAP = {
  schema: "sci-os-ui-layers/v1",
  label: "ALPHA_NON_PRODUCTION",
  note: "V1 folder names map to live files. Not a second design system.",
  layers: {
    "ui-tokens": { live: "packages/design-system/src/tokens.js + tokens.css", status: "WIRED" },
    "ui-core": { live: "apps/cockpit-ui/src/safe-dom.js + components/primitives.js", status: "WIRED" },
    layout: { live: "cockpit 12-col .sci-metrics / .sci-table / nav", status: "WIRED" },
    molecules: { live: "status chip, metric card, heat cell, guardrail bar", status: "WIRED" },
    organisms: { live: "renderDilConsole, renderEclConsole, professional-ux panels", status: "WIRED" },
  },
  tokens: sciTokens,
};

export { sciTokens };
