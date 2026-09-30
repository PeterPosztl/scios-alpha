import { createServer } from "node:http";
import { sciTokens } from "@scios/design-system";
import { SAFE_DOM_BROWSER_SOURCE } from "./safe-dom.js";
import { PRIMITIVES_BROWSER_SOURCE } from "./components/primitives.js";
import {
  PROFESSIONAL_UX_BROWSER_SOURCE,
  PROFESSIONAL_UX_CONTRACT,
  PROFESSIONAL_UX_SOURCE_ID,
} from "./professional-ux.js";
import { WORKSPACE_RENDERER_BROWSER_SOURCE } from "./workspace/WorkspaceRenderer.js";
import { ECL_DIL_CONSOLE_BROWSER_SOURCE } from "./ecl-dil-console.js";
import { I18N_BROWSER_SOURCE } from "./i18n.js";
import { PRODUCT_SETTINGS_BROWSER_SOURCE } from "./product-settings.js";
import { SCI_CHARTS_BROWSER_SOURCE } from "./sci-charts.js";
import { ANALYTICS_DETECTIVE_BROWSER_SOURCE } from "./analytics-detective.js";
import { BLUEPRINT_STUDIO_BROWSER_SOURCE } from "./blueprint-studio.js";
import { HERO_V3_BROWSER_SOURCE } from "./hero-v3.js";

const PORT = Number(process.env.PORT ?? process.env.SCIOS_COCKPIT_PORT ?? 4000);
const BIND = process.env.SCIOS_BIND ?? "127.0.0.1";
const CONTROL_URL =
  process.env.CONTROL_URL ?? "http://127.0.0.1:3000";

/** Design System is token authority — Cockpit must not invent a parallel palette. */
const T = sciTokens;
const TOKEN_CSS = `
    :root {
      --snow:${T.color.snow}; --fog:${T.color.fog}; --graphite:${T.color.graphite}; --navy:${T.color.navy};
      --ice:${T.color.ice}; --red:${T.color.red}; --ok:${T.color.ok}; --warn:${T.color.warn};
      --sci-unknown:${T.color.unknown}; --sci-info:${T.color.info};
      --sci-space-1:${T.space[1]}; --sci-space-2:${T.space[2]}; --sci-space-3:${T.space[3]}; --sci-space-4:${T.space[4]};
      --sci-space-5:${T.space[5]}; --sci-space-6:${T.space[6]}; --sci-space-8:${T.space[8]};
      --sci-radius:${T.radius}; --sci-font:${T.typography.fontFamily};
      --sci-surface:${T.color.surface}; --sci-surface-muted:${T.color.surfaceMuted}; --sci-border:var(--fog);
      --sci-focus:${T.focus};
      --sci-brand-size:${T.typography.brandSize};
      --sci-type-display:${T.typography.display}; --sci-type-title:${T.typography.title};
      --sci-type-meta:${T.typography.meta}; --sci-type-overline:${T.typography.overline};
      --sci-elev-1:${T.elevation[1]}; --sci-elev-2:${T.elevation[2]}; --sci-elev-3:${T.elevation[3]};
      --sci-motion:${T.motion.duration}; --sci-motion-micro:${T.motion.micro}; --sci-motion-macro:${T.motion.macro};
      --sci-motion-critical:${T.motion.critical}; --sci-ease:${T.motion.easing};
      --sci-grid-gutter:${T.grid.gutter};
    }`;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SCI OS ×10</title>
  <style>
${TOKEN_CSS}
    * { box-sizing: border-box; }
    body { margin:0; font-family:var(--sci-font); color:var(--navy);
      background: linear-gradient(165deg,#f4f7fb 0%, var(--snow) 40%, var(--fog) 100%); min-height:100vh; }
    :focus-visible { outline:var(--sci-focus); outline-offset:2px; }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }
    .cmdk { display:none; position:fixed; inset:0; background:rgba(11,31,51,0.35); z-index:50; align-items:flex-start; justify-content:center; padding-top:12vh; }
    .cmdk.on { display:flex; }
    .cmdk-box { width:min(560px,92vw); background:var(--sci-surface); border:1px solid var(--sci-border); box-shadow:0 18px 50px rgba(11,31,51,0.18); }
    .cmdk-box input { width:100%; border:0; border-bottom:1px solid var(--sci-border); padding:0.85rem 1rem; font-size:1rem; }
    .cmdk-list { max-height:320px; overflow:auto; }
    .cmdk-item { display:flex; justify-content:space-between; gap:0.75rem; padding:0.7rem 1rem; cursor:pointer; border:0; width:100%; background:#fff; text-align:left; font:inherit; }
    .cmdk-item:hover, .cmdk-item.on { background:var(--ice); }
    .cmdk-item .meta { font-size:0.7rem; color:var(--graphite); text-transform:uppercase; letter-spacing:0.05em; }
    .level { font-size:0.65rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--graphite); margin:0 0 0.25rem; }
    .approval-card { border:1px solid var(--fog); background:var(--sci-surface); padding:1rem 1.1rem; margin:0.75rem 0; }
    .approval-card.proposal { border-left:3px solid var(--warn); }
    .approval-card h3 { margin:0 0 0.35rem; font-size:0.95rem; }
    .approval-card .badge-prop { display:inline-block; font-size:0.65rem; letter-spacing:0.06em; text-transform:uppercase; background:#FEF3C7; color:#92400E; padding:0.15rem 0.4rem; margin-bottom:0.5rem; }
    .approval-actions { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem; }
    .approval-actions button { font:inherit; padding:0.45rem 0.85rem; border:1px solid var(--fog); background:#fff; cursor:pointer; }
    .approval-actions button.primary { background:var(--navy); color:#fff; border-color:var(--navy); }
    .approval-actions button:disabled { opacity:0.45; cursor:not-allowed; }
    .trust-capsule { border:1px solid var(--ice); background:#fff; padding:0.85rem 1rem; margin:0.75rem 0; }
    .trust-capsule h3 { margin:0 0 0.4rem; font-size:0.9rem; }
    .trust-capsule dl { display:grid; grid-template-columns:9rem 1fr; gap:0.25rem 0.75rem; margin:0; font-size:0.85rem; }
    .trust-capsule dt { color:var(--graphite); }
    .trust-capsule dd { margin:0; }
    .ai-panel { border:1px solid var(--ice); background:linear-gradient(180deg,#f8fbfe,#fff); padding:1rem 1.1rem; margin:0.75rem 0 1rem; }
    .ai-panel h3 { margin:0 0 0.35rem; font-size:0.95rem; }
    .ai-panel ul { margin:0.4rem 0 0; padding-left:1.1rem; color:var(--graphite); font-size:0.9rem; }
    .ai-panel .ctx { font-size:0.75rem; color:var(--graphite); margin-top:0.6rem; }
    .shell-tools select { font:inherit; border:1px solid var(--fog); padding:0.4rem 0.45rem; background:#fff; }
    header { display:flex; justify-content:space-between; align-items:center; gap:1rem;
      padding:0.9rem 1.5rem; border-bottom:1px solid var(--fog); background:rgba(255,255,255,0.92); backdrop-filter:blur(8px); }
    .brand { display:flex; flex-direction:column; gap:0.1rem; }
    .brand h1 { margin:0; font-size:1.35rem; font-weight:650; letter-spacing:-0.03em; }
    .brand p { margin:0; font-size:0.72rem; color:var(--graphite); letter-spacing:0.04em; text-transform:uppercase; }
    .searchwrap { flex:1; max-width:420px; }
    .searchwrap input { width:100%; border:1px solid var(--fog); padding:0.55rem 0.75rem; background:#fff; font-size:0.9rem; }
    .badge { font-size:0.68rem; letter-spacing:0.06em; padding:0.3rem 0.55rem; border:1px solid var(--fog); background:#fff; }
    .badge.ok { color:var(--ok); } .badge.warn { color:var(--warn); } .badge.err { color:var(--red); }
    nav.primary { display:flex; gap:0.15rem; padding:0.35rem 1.5rem; background:#fff; border-bottom:1px solid var(--fog); flex-wrap:wrap; }
    nav.primary button, nav.eng button { border:0; background:transparent; padding:0.5rem 0.75rem; cursor:pointer; font-size:0.78rem;
      letter-spacing:0.04em; text-transform:uppercase; color:var(--graphite);
      transition: background var(--sci-motion) var(--sci-ease), color var(--sci-motion) var(--sci-ease); }
    nav.primary button:hover, nav.eng button:hover { background:var(--ice); color:var(--navy); }
    nav.primary button.on { color:var(--navy); border-bottom:2px solid var(--navy); font-weight:600; }
    nav.eng { display:flex; gap:0.15rem; padding:0.25rem 1.5rem; background:#fafbfc; border-bottom:1px solid var(--fog); flex-wrap:wrap; }
    nav.eng button.on { color:var(--navy); border-bottom:2px solid var(--graphite); }
    main { max-width:1180px; margin:0 auto; padding:3rem 1.5rem; }
    .view { display:none; } .view.on { display:block; }
    .homeHeadline { font-size:1.55rem; font-weight:650; letter-spacing:-0.02em; margin:0 0 0.35rem; }
    .sub { color:var(--graphite); margin:0 0 1rem; font-size:0.9rem; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:0.75rem; }
    .card { background:#fff; border:1px solid var(--fog); padding:0.85rem 1rem; }
    .card h2, .card h3 { margin:0 0 0.55rem; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--graphite); }
    .card .big { font-size:1.35rem; font-weight:650; }
    .card ul { margin:0; padding-left:1.1rem; font-size:0.85rem; }
    .card li { margin:0.25rem 0; }
    .linkish { color:var(--navy); cursor:pointer; text-decoration:underline; text-underline-offset:2px; background:none; border:0; padding:0; font:inherit; }
    pre { margin:0; font:0.72rem/1.45 ui-monospace,Menlo,Consolas,monospace; white-space:pre-wrap; word-break:break-word;
      max-height:280px; overflow:auto; }
    .pipe { display:flex; flex-wrap:wrap; gap:0.35rem; margin:0.75rem 0; }
    .stage { font-size:0.68rem; padding:0.3rem 0.45rem; background:var(--ice); color:var(--graphite); }
    .stage.done { background:#d9efe3; color:var(--ok); }
    .stage.run { background:#fff3d6; color:var(--warn); }
    .stage.wait { opacity:0.65; }
    form.analyze { display:grid; grid-template-columns:repeat(3,1fr) auto; gap:0.6rem; align-items:end; margin-bottom:0.75rem; }
    label { display:grid; gap:0.25rem; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--graphite); }
    input { border:1px solid var(--fog); padding:0.55rem 0.65rem; }
    button.go { background:var(--navy); color:#fff; border:0; padding:0.6rem 1rem; cursor:pointer; height:2.4rem; }
    button.ghost { background:#fff; border:1px solid var(--fog); padding:0.45rem 0.7rem; cursor:pointer; font-size:0.78rem; }
    .actions { display:flex; flex-wrap:wrap; gap:0.4rem; margin:0.75rem 0 1rem; }
    .why { font-size:0.85rem; color:var(--graphite); margin:0.5rem 0 0; }
    .banner { padding:0.6rem 1rem; background:#fff3f3; border:1px solid #f0c9c9; color:var(--red); margin-bottom:1rem; display:none; }
    .mode { display:flex; gap:0.35rem; margin:0 0 0.85rem; }
    .mode button { border:1px solid var(--fog); background:#fff; padding:0.4rem 0.7rem; cursor:pointer; font-size:0.75rem; color:var(--graphite); }
    .mode button.on { border-color:var(--navy); color:var(--navy); font-weight:600; }
    .pro-grid { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:12px; max-width:1180px; }
    .pro-card[data-span="12"], .sci-span-12 { grid-column:1 / -1; }
    .pro-card[data-span="6"] { grid-column:span 6; }
    @media (max-width:900px) { .pro-card[data-span="6"] { grid-column:1 / -1; } }
    .hero-v3-head { margin:0 0 1.5rem; transition:opacity var(--sci-motion-macro) var(--sci-ease); }
    .sci-decision-gate { border:1px solid var(--fog); border-left:2px solid var(--warn); background:var(--sci-surface); padding:0.75rem; }
    .sci-lineage-node { font-size:0.8rem; padding:0.35rem 0; border-bottom:1px solid var(--fog); }
    .sci-button { font:inherit; padding:0.45rem 0.85rem; border:1px solid var(--fog); background:#fff; cursor:pointer; }
    .sci-button.primary { background:var(--navy); color:#fff; border-color:var(--navy); }
    .sci-button:disabled { opacity:0.45; cursor:not-allowed; }
    .sci-token { display:inline-block; font-size:0.65rem; letter-spacing:0.05em; text-transform:uppercase;
      border:1px solid var(--sci-border); padding:0.15rem 0.4rem; color:var(--sci-unknown); background:var(--sci-surface); }
    .sci-token[data-tone="unknown"] { color:var(--sci-unknown); }
    .sci-token[data-tone="degraded"] { color:var(--warn); border-color:var(--warn); }
    .sci-token[data-tone="unverified"] { color:var(--sci-unknown); }
    .sci-token[data-tone="simulated"] { color:var(--navy); border-color:var(--ice); }
    .sci-token[data-tone="critical"] { color:var(--red); border-color:var(--red); transition-duration:var(--sci-motion-critical); }
    .sci-token[data-tone="proposal"] { color:var(--warn); border-color:var(--warn); }
    .sci-ribbon { display:flex; flex-wrap:wrap; gap:0.35rem; margin:0 0 var(--sci-space-5, 1.5rem); }
    .sci-ribbon-step { font-size:0.62rem; letter-spacing:0.04em; text-transform:uppercase; border:1px solid var(--fog);
      background:var(--sci-surface); color:var(--graphite); padding:0.3rem 0.45rem; cursor:default; }
    .sci-ribbon-step[data-status="current"] { border-left:2px solid var(--ice); color:var(--navy); transition:border-color var(--sci-motion-micro) var(--sci-ease); }
    .sci-ribbon-step[data-status="unknown"] { color:var(--sci-unknown); }
    .sci-ribbon-step[data-status="degraded"] { color:var(--warn); }
    .sci-ribbon-step[data-status="critical"] { color:var(--red); border-color:var(--red); transition-duration:var(--sci-motion-critical); }
    .sci-ribbon-step[data-status="locked"] { opacity:0.45; }
    .sci-ribbon-step[data-emphasis="1"] { font-weight:650; }
    .sci-sim-badge { font-size:0.65rem; letter-spacing:0.05em; text-transform:uppercase; color:var(--navy); border:1px solid var(--ice); padding:0.15rem 0.4rem; }
    /* SCI panel: Snow surface, Fog border, Ice edge. Not a dark vendor clone. */
    .pro-card { background:var(--sci-surface); border:1px solid var(--sci-border); border-left:2px solid var(--ice);
      padding:0.75rem; box-shadow:var(--sci-elev-1); }
    .view.on .pro-card { animation: sci-enter var(--sci-motion) var(--sci-ease); }
    @keyframes sci-enter { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
    .pro-card[data-exp-hidden="1"] { display:none; animation:none; }
    .pro-card.partial-mod { border-style:dashed; opacity:0.92; }
    .pro-card h3 { margin:0 0 0.35rem; font-size:0.72rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--graphite); }
    .pro-card .val { font-size:1.05rem; font-weight:600; color:var(--navy); }
    .pro-card .hint { margin:0.35rem 0 0; font-size:0.8rem; color:var(--graphite); }
    .exp-compose { display:flex; flex-wrap:wrap; gap:0.35rem; margin:0.5rem 0 0.85rem; }
    .exp-chip { font-size:0.65rem; letter-spacing:0.05em; text-transform:uppercase; padding:0.3rem 0.45rem; border:1px solid var(--fog); background:#fff; color:var(--graphite); }
    .exp-chip.on { border-color:var(--navy); color:var(--navy); }
    .exp-chip.partial { border-style:dashed; color:var(--warn); }
    .exp-meta { font-size:0.78rem; color:var(--graphite); margin:0 0 0.75rem; }
    .role-bar { display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; margin:0 0 0.85rem; }
    .role-bar select { border:1px solid var(--fog); padding:0.4rem 0.55rem; font:inherit; background:#fff; }
    .banner.degraded { background:#fff8eb; border-color:#f0d9a8; color:var(--warn); }
    .model-truth { font-size:0.65rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--warn); margin:0.25rem 0 0; }
    .empty { color:var(--graphite); font-size:0.85rem; }
    .tech { display:none; } .tech.on { display:block; }
    .pro { display:none; } .pro.on { display:block; }
    .entityHead { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:0.85rem; }
    .entityHead h2 { margin:0; font-size:1.35rem; letter-spacing:-0.02em; }
    .tabs { display:flex; flex-wrap:wrap; gap:0.25rem; margin-bottom:0.85rem; }
    .tabs span { font-size:0.72rem; padding:0.35rem 0.55rem; border:1px solid var(--fog); background:#fff; color:var(--graphite); }
    .tabs span.on { border-color:var(--navy); color:var(--navy); font-weight:600; }
    .results { display:grid; gap:0.5rem; }
    .hit { background:#fff; border:1px solid var(--fog); padding:0.7rem 0.9rem; display:flex; justify-content:space-between; gap:0.75rem; align-items:center; }
    .hit .meta { font-size:0.72rem; color:var(--graphite); text-transform:uppercase; letter-spacing:0.05em; }
    .context-bar { padding:0.55rem 1.5rem; background:#fff; border-bottom:1px solid var(--fog); }
    .context-bar .ctx-title { margin:0 0 0.35rem; font-size:0.65rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--graphite); }
    .context-bar .ctx-grid { display:flex; flex-wrap:wrap; gap:0.5rem 1.25rem; }
    .context-bar .ctx-cell { display:flex; gap:0.35rem; align-items:baseline; font-size:0.78rem; }
    .context-bar .ctx-k { color:var(--graphite); text-transform:uppercase; letter-spacing:0.04em; font-size:0.65rem; }
    .context-bar .ctx-v { font-weight:600; color:var(--navy); }
    .context-bar .ctx-role { margin:0 0 0.45rem; font-size:1rem; font-weight:600; color:var(--navy); letter-spacing:-0.02em; }
    .context-bar .ctx-cell.warn .ctx-v { color:var(--warn); }
    .context-bar .ctx-cell.ok .ctx-v { color:var(--ok); }
    .context-bar .ctx-note { margin:0.35rem 0 0; font-size:0.75rem; color:var(--warn); }
    .kv-grid { display:grid; grid-template-columns:10rem 1fr; gap:0.25rem 0.75rem; margin:0; font-size:0.85rem; }
    .kv-grid.compact { font-size:0.78rem; }
    .kv-grid dt { color:var(--graphite); margin:0; }
    .kv-grid dd { margin:0; font-weight:500; }
    .kv-grid dd.truth-warn { color:var(--warn); }
    .job-card { background:#fff; border:1px solid var(--fog); padding:0.85rem 1rem; margin-bottom:0.65rem; }
    .job-head { display:flex; justify-content:space-between; align-items:center; gap:0.75rem; }
    .job-head h3 { margin:0; font-size:0.95rem; }
    .job-state { font-size:0.65rem; letter-spacing:0.06em; text-transform:uppercase; padding:0.2rem 0.45rem; border:1px solid var(--fog); }
    .job-state.ok { color:var(--ok); border-color:#c8e6d4; }
    .job-state.warn { color:var(--warn); border-color:#f0d9a8; }
    .job-state.err { color:var(--red); border-color:#f0c9c9; }
    .evidence-list { margin:0.5rem 0 0; padding-left:1.1rem; font-size:0.82rem; color:var(--graphite); }
    .eng-section { display:block; }
    .eng-section[hidden] { display:none !important; }
    body[data-density="EXPERT"] .pro-card .hint { display:none; }
    body[data-density="EXPERT"] .pro-card .val { font-size:0.95rem; }
    body[data-density="COMFORTABLE"] .pro-card .val { font-size:1.2rem; }
    body[data-disclosure="L1"] .pro-card .level { display:none; }
    body[data-disclosure="L1"] .model-truth { display:none; }
    body[data-disclosure="L3"] .model-truth { display:block; }
    @media (max-width:800px) {
      form.analyze { grid-template-columns:1fr; }
      header { flex-wrap:wrap; }
      .searchwrap { max-width:none; width:100%; order:3; }
    }
    .sci-callout { background:var(--sci-surface); border:1px solid var(--fog); padding:0.85rem 1rem; margin:0 0 0.85rem; box-shadow:var(--sci-elev-1); }
    .sci-metrics { display:grid; grid-template-columns:repeat(12,1fr); gap:var(--sci-grid-gutter); margin:0 0 1rem; }
    .sci-metrics > * { grid-column: span 3; }
    .dil-toolbar, .guardrail-bar { display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; margin:0 0 0.85rem; }
    .guardrail-bar { padding:0.65rem 0.85rem; border:1px solid var(--fog); background:#fff; }
    .guardrail-bar.ok { border-color:#c8e6d4; }
    .guardrail-bar.breach { border-color:#f0c9c9; background:#fff8f8; }
    .dil-toolbar button.on, .dil-toolbar .ghost.on { border-color:var(--navy); color:var(--navy); font-weight:600; }
    .dil-maps { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin:0 0 0.85rem; }
    .heat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:0.4rem; }
    .heat-cell { border:1px solid var(--fog); background:#fff; padding:0.55rem 0.5rem; font:inherit; font-size:0.78rem; text-align:left; cursor:pointer; }
    .heat-cell.heat-lo { background:#f4faf6; }
    .heat-cell.heat-mid { background:#fff8eb; }
    .heat-cell.heat-hi { background:#fff3f3; }
    .sci-table { display:grid; gap:0; border:1px solid var(--fog); }
    .sci-row { display:grid; grid-template-columns:2fr 0.8fr 0.7fr 0.7fr 1fr 1fr 0.7fr 0.7fr 0.9fr; gap:0.35rem; padding:0.45rem 0.55rem; font-size:0.78rem; border-top:1px solid var(--fog); }
    .sci-row.head { font-size:0.65rem; letter-spacing:0.05em; text-transform:uppercase; color:var(--graphite); border-top:0; background:var(--sci-surface-muted); }
    .sci-row:focus { outline:var(--sci-focus); }
    .sci-chip { font-size:0.65rem; letter-spacing:0.06em; text-transform:uppercase; padding:0.15rem 0.4rem; border:1px solid var(--fog); }
    .sci-chip.warn { color:var(--warn); border-color:#f0d9a8; }
    .sci-chip.ok { color:var(--ok); } .sci-chip.error { color:var(--red); } .sci-chip.unknown { color:var(--sci-unknown); }
    .error-state { border:1px solid var(--red); color:var(--navy); }
    .dil-toolbar select { font:inherit; border:1px solid var(--fog); padding:0.35rem 0.45rem; background:#fff; }
    .dil-toolbar input { font:inherit; border:1px solid var(--fog); padding:0.35rem 0.45rem; background:#fff; }
    .sci-chart { width:100%; max-width:100%; height:auto; display:block; }
    .sci-chart-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:0.75rem; margin:0.75rem 0; }
    .sci-chart-card { min-height:8rem; }
    @media (prefers-reduced-motion: reduce) {
      .heat-cell, .sci-row, button.go, nav.primary button, nav.eng button { transition: none; }
      .view.on .pro-card { animation: none; }
      .sci-ribbon-step { transition: none; }
    }
    body[data-reduced-motion="1"] * { transition: none !important; animation: none !important; }
    .settings-tabs { display:flex; flex-wrap:wrap; gap:0.35rem; margin:0 0 0.85rem; }
    .settings-card-row { display:flex; flex-wrap:wrap; gap:0.35rem; align-items:center; margin:0.35rem 0; }
    .settings-card-row span { flex:1; font-size:0.85rem; }
    body[data-theme="SCI_HIGH_CONTRAST"] { --sci-border: var(--navy); }
    body[data-theme="SCI_HIGH_CONTRAST"] .card,
    body[data-theme="SCI_HIGH_CONTRAST"] .pro-card { border-width: 2px; }
    body[data-theme="SCI_FOG"] { background: var(--fog); }
    body[data-layout="COMPACT"] main { max-width: 960px; }
    body[data-layout="COMPACT"] .grid { gap: 0.45rem; }
    body[data-layout="WIDE"] main { max-width: 1400px; }
    body[data-notify-alerts="0"] #btnNotes { opacity: 0.55; }
    .settings-tabs + .pro-card select, .settings-tabs + .pro-card label { display:block; margin:0.45rem 0; }
    .rec-panel { border-left:3px solid var(--ice); }
    @media (max-width:960px) {
      .sci-metrics > * { grid-column: span 6; }
      .dil-maps { grid-template-columns:1fr; }
      .sci-row, .sci-row.head { grid-template-columns:1fr 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
    <h1>SCI OS ×10</h1>
      <p id="flow" data-i18n="product.tag">Enterprise intelligence OS · ALPHA</p>
    </div>
    <div class="searchwrap">
      <input id="globalSearch" type="search" placeholder="Search anything… e.g. AAPL" aria-label="Global search" data-i18n-placeholder="hdr.search" data-i18n-aria="hdr.search" />
    </div>
    <div class="shell-tools">
      <button type="button" class="ghost" id="btnCmd" data-action-id="open_command_palette" title="Command palette (Ctrl+K)" data-i18n="hdr.command">Command</button>
      <button type="button" class="ghost" id="btnJobs" data-action-id="open_jobs" data-i18n="hdr.jobs">Jobs</button>
      <button type="button" class="ghost" id="btnNotes" data-action-id="open_notifications" data-i18n="hdr.alerts">Alerts</button>
      <label class="sr-only" for="langSelect" data-i18n="hdr.language">Language</label>
      <select id="langSelect" aria-label="Language" data-i18n-aria="hdr.language">
        <option value="en-US">en-US</option>
        <option value="hu-HU">hu-HU</option>
        <option value="de-DE">de-DE</option>
      </select>
      <button type="button" class="ghost" id="btnSettings" data-action-id="open_settings" data-i18n="nav.settings">Settings</button>
      <div id="verdict" class="badge warn">UNKNOWN</div>
    </div>
  </header>
  <div id="contextHeaderBar" class="context-bar" aria-live="polite"></div>
  <div id="cmdk" class="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="cmdk-box">
      <label class="sr-only" for="cmdkInput">Command</label>
      <input id="cmdkInput" type="search" placeholder="Go to… intelligence, reporting, decisions, work, evidence" autocomplete="off" />
      <div class="cmdk-list" id="cmdkList"></div>
    </div>
  </div>
  <nav class="primary" aria-label="Primary">
    <button class="on" data-v="home" data-action-id="nav_home" data-i18n="nav.home">Home</button>
    <button data-v="work" data-i18n="nav.work">Work</button>
    <button data-v="entities" data-i18n="nav.entities">Entities</button>
    <button data-v="roles" data-i18n="nav.roles">Roles</button>
    <button data-v="slice" data-i18n="nav.analyze">Analyze</button>
    <button data-v="decisions" data-i18n="nav.decisions">Decisions</button>
    <button data-v="dil" data-i18n="nav.intelligence">Intelligence</button>
    <button data-v="ecl" data-i18n="nav.reporting">Reporting</button>
    <button data-v="analysis" data-i18n="nav.analysis">Analysis</button>
    <button data-v="detective" data-i18n="nav.detective">Detective</button>
    <button data-v="evidence" data-i18n="nav.evidence">Evidence</button>
    <button data-v="system" data-i18n="nav.system">System</button>
    <button data-v="settings" data-i18n="nav.settings">Settings</button>
    <button data-v="engineering" data-i18n="nav.engineering">Engineering</button>
  </nav>
  <nav class="eng" id="engNav" hidden aria-label="Engineering">
    <button data-eng="dash">Technical cockpit</button>
    <button data-eng="lineage">Lineage Explorer</button>
    <button data-eng="kg" data-i18n="eng.kg">KG Explorer</button>
    <button data-eng="agent" data-i18n="eng.agent">Agent Studio</button>
    <button data-eng="workflow" data-i18n="eng.workflow">Workflow Studio</button>
    <button data-eng="dist" data-i18n="eng.distributed">Distributed OS</button>
    <button data-eng="risk">Risk / Gov Studio</button>
    <button data-eng="exec">Execution Monitor</button>
    <button data-eng="health">System Health</button>
  </nav>
  <main>
    <div class="banner" id="banner"></div>

    <div class="view on" id="home">
      <h2 class="homeHeadline" id="homeHeadline" data-i18n="home.headline">What needs your attention?</h2>
      <p class="sub" id="homeSub" data-i18n="home.loading">Loading home…</p>
      <div class="role-bar">
        <label for="roleSelect">Professional role</label>
        <select id="roleSelect" aria-label="Professional role"></select>
        <span class="badge" id="expStatus">EXPERIENCE · UNKNOWN</span>
      </div>
      <p class="exp-meta" id="roleHint"></p>
      <p class="exp-meta" id="compiledWorkspace"></p>
      <div class="exp-compose" id="expComposeHome" aria-live="polite"></div>
      <div class="grid" id="homeGrid"></div>
    </div>

    <div class="view" id="work">
      <h2 class="homeHeadline" data-i18n="work.headline">My Work</h2>
      <p class="sub" data-i18n="work.sub">Open analyses, tasks, and saved context.</p>
      <div class="actions">
        <button type="button" class="ghost" id="workWorkflowBtn" data-i18n="eng.workflow">Workflow Studio</button>
        <button type="button" class="ghost" id="workAgentBtn" data-i18n="eng.devAssistant">Dev Assistant</button>
      </div>
      <div class="grid" id="workGrid"></div>
    </div>

    <div class="view" id="entities">
      <div class="entityHead">
        <div>
          <h2 id="entTitle">Open an entity</h2>
          <p class="sub" id="entSub">Search AAPL or pick from results to open Entity360.</p>
        </div>
        <button class="go" type="button" id="entAnalyze" hidden>Analyze</button>
      </div>
      <div class="tabs" id="entTabs"></div>
      <div class="grid" id="entGrid"></div>
      <p class="empty" id="entEmpty">NO ENTITY SELECTED — search AAPL, then open the entity.</p>
    </div>

    <div class="view" id="roles">
      <h2 class="homeHeadline" data-i18n="roles.headline">Professional workspace</h2>
      <p class="sub" data-i18n="roles.sub">200 role seeds, 9 archetypes, domain sandboxes. SIMULATION_ONLY. Compile stays on archetypes. Not 200 apps. Not READY.</p>
      <div id="rolesRoot" aria-live="polite"></div>
    </div>

    <div class="view" id="slice">
      <form class="analyze" id="form">
        <label>Instrument <input id="instrumentId" value="AAPL" required /></label>
        <label>Horizon (sec) <input id="horizonSec" type="number" value="3600" min="1" /></label>
        <label>Size <input id="size" type="number" value="10" step="0.01" /></label>
        <button class="go" type="submit" id="go">Analyze</button>
    </form>
      <div class="pipe" id="pipeProgress" aria-live="polite"></div>
      <p class="why" id="status"></p>
      <div class="mode" role="group" aria-label="View mode">
        <button type="button" class="on" id="modePro" data-mode="pro">Professional</button>
        <button type="button" id="modeTech" data-mode="tech">Technical / Evidence</button>
      </div>
      <div class="actions" id="resultActions" hidden>
        <button type="button" class="ghost" data-act="explain" data-action-id="act.explain">Explain</button>
        <button type="button" class="ghost" data-act="scenario" data-action-id="act.scenario">Run Scenario</button>
        <button type="button" class="ghost" data-act="compare" data-action-id="act.compare">Compare</button>
        <button type="button" class="ghost" data-act="evidence" data-action-id="act.evidence">Evidence</button>
        <button type="button" class="ghost" data-act="lineage" data-action-id="act.lineage">Full Lineage</button>
        <button type="button" class="ghost" data-act="tech" data-action-id="act.tech">Technical View</button>
      </div>
      <div class="ai-panel" id="aiContextPanel" hidden>
        <p class="level">AI · Contextual OS service</p>
        <h3>Assistant context</h3>
        <ul id="aiContextList"></ul>
        <p class="ctx" id="aiContextMeta">AI may explain and prepare actions. It may not bypass risk, governance, or required human approval.</p>
      </div>
      <div class="trust-capsule" id="trustCapsule" hidden>
        <p class="level">Trust capsule · consequential result</p>
        <h3>What can we trust about this analysis?</h3>
        <dl id="trustCapsuleDl"></dl>
        <p class="hint">Full forensic detail expands in Technical / Evidence / Lineage.</p>
      </div>
      <div class="approval-card proposal" id="approvalCard" hidden>
        <span class="badge-prop">LOCAL REVIEW — not durable governed execution approval</span>
        <h3 id="approvalTitle">Human local review</h3>
        <p class="hint" id="approvalReason"></p>
        <p class="hint" id="approvalImpact"></p>
        <p class="hint" id="approvalEvidence"></p>
        <div class="approval-actions">
          <button type="button" class="primary" id="approvalApprove" data-action-id="act.local_review.approve" disabled>LOCAL REVIEW</button>
          <button type="button" id="approvalReject" data-action-id="act.local_review.reject">LOCAL REJECT NOTE</button>
          <button type="button" id="approvalHold" data-action-id="act.local_review.hold">LOCAL HOLD</button>
        </div>
        <p class="hint" id="approvalStatus">LOCAL REVIEW STATE — session-only; not DecisionAction API / audit / evidence.</p>
      </div>
      <div class="pro on" id="proView">
        <p class="exp-meta" id="expComposeMeta">Experience modules bind to panels below.</p>
        <div class="exp-compose" id="expComposeSlice"></div>
        <div class="hero-v3-head" id="heroV3Head">
          <p class="level" id="heroOverline">Family · ALPHA_NON_PRODUCTION</p>
          <h2 class="homeHeadline" id="heroTitle">Analyze</h2>
          <div id="heroTokens"></div>
          <p class="sci-chip" id="heroQueue"></p>
        </div>
        <div class="sci-ribbon" id="sciRibbon" role="list" aria-label="Vertical slice workflow"></div>
        <div class="pro-grid" id="proGrid">
          <div class="pro-card" data-span="12" data-exp-module="ContextHeader" id="modContextHeader"><p class="level">L1 · What happened?</p><h3>Situation</h3><div class="val" id="proWhat">NO ANALYSIS YET</div><p class="hint empty" id="proWhatHint">Run an analysis to generate prediction, risk and decision information.</p></div>
          <div class="pro-card" data-span="6" data-exp-module="PredictionPanel" id="modPredictionPanel"><p class="level">1–6 · Forecast</p><h3>Expected outcome</h3><div class="val" id="proCertain">—</div><p class="hint" id="proCertainHint"></p><p class="model-truth" id="predModelTruth">MODEL · FOUNDATION · ALPHA · UNVALIDATED</p><div id="predProfessionHost"></div></div>
          <div class="pro-card" data-span="6" data-exp-module="UncertaintyPanel" id="modUncertaintyPanel"><p class="level">7–12 · Horizon</p><h3>Confidence & calibration</h3><div class="val" id="proUncertainty">—</div><p class="hint" id="proUncertaintyHint">No calibration object — treat as NON-PRODUCTION science.</p><p class="model-truth" id="uncertaintyModelTruth">MODEL · FOUNDATION · ALPHA · UNVALIDATED</p></div>
          <div class="pro-card" data-span="6" data-exp-module="RiskPanel" id="modRiskPanel"><p class="level">1–6 · Threat gate</p><h3>What is the risk?</h3><div class="val" id="proRisk">—</div><p class="hint" id="proRiskHint"></p><p class="model-truth" id="riskModelTruth">MODEL · FOUNDATION · ALPHA · UNVALIDATED</p><div id="riskProfessionHost"></div></div>
          <div class="pro-card" data-span="6" data-exp-module="DecisionPanel" id="modDecisionPanel"><p class="level">7–12 · Governance</p><h3>Recommended next step</h3><div class="val" id="proDecision">—</div><p class="hint" id="proDecisionHint"></p></div>
          <div class="pro-card" data-span="6" data-exp-module="SimulationPanel" id="modSimulationPanel"><p class="level">1–6 · Simulator</p><h3>Simulation outcome</h3><div class="val" id="proExec">—</div><p class="hint" id="proExecHint">SIMULATION_ONLY — no live money.</p></div>
          <div class="pro-card" data-span="6" data-exp-module="EvidencePanel" id="modEvidencePanel"><p class="level">7–12 · Proof timeline</p><h3>Evidence</h3><div class="val" id="proEvidence">—</div><p class="hint">Open Technical / Evidence or Full Lineage for provenance. Empty ≠ PASS.</p><div id="evidenceProfessionHost"></div></div>
          <div class="pro-card" data-span="12" data-exp-module="LineagePanel" id="modLineagePanel"><p class="level">1–12 · Chain-of-Truth</p><h3>Lineage integrity</h3><div class="val" id="proLineage">—</div><p class="hint" id="proLineageHint">Hash recompute + prevHash when verified by Control Plane.</p><div id="lineageProfessionHost"></div></div>
          <div class="pro-card" data-span="12" data-exp-module="OpsIntel" id="modOpsIntel"><p class="level">1–12 · Ops Intel</p><h3>Family queue</h3><div class="val" id="proOpsIntel">UNKNOWN</div><p class="hint" id="proOpsIntelHint">No family overlay bound yet.</p></div>
        </div>
        <div class="pro-grid" id="heroAux">
          <div class="pro-card" data-span="6" id="heroCharts"></div>
          <div class="pro-card" data-span="6" id="heroDecisionGate"></div>
          <div class="pro-card" data-span="12" id="heroTruthGraph"></div>
        </div>
        <div class="pro-grid" id="partialModuleHost"></div>
      </div>
      <div class="tech" id="techView">
        <div class="grid">
          <div class="card"><h2>Normalized</h2><pre id="normalized">NO ANALYSIS YET. Run Analyze.</pre></div>
          <div class="card"><h2>PIT features</h2><pre id="features">NO ANALYSIS YET. Run Analyze.</pre></div>
          <div class="card"><h2>Prediction</h2><pre id="prediction">NO ANALYSIS YET. Run Analyze.</pre></div>
          <div class="card"><h2>Risk</h2><pre id="risk">NO ANALYSIS YET. Run Analyze.</pre></div>
          <div class="card"><h2>Governance</h2><pre id="decision">NO ANALYSIS YET. Run Analyze.</pre></div>
          <div class="card"><h2>Execution + outcome</h2><pre id="execution">NO ANALYSIS YET. Run Analyze.</pre></div>
        </div>
      </div>
    </div>

    <div class="view" id="dil">
      <h2 class="homeHeadline" data-i18n="dil.headline">Decision Intelligence</h2>
      <p class="sub" data-i18n="dil.sub">Where is the edge — and what size fits the bankroll? Simulated Polymarket/Kalshi. Agent proposes; you decide.</p>
      <div id="dilRoot" aria-live="polite"></div>
      <div id="dilProfessionHost" class="pro-card"></div>
    </div>

    <div class="view" id="ecl">
      <h2 class="homeHeadline" data-i18n="ecl.headline">ECL Reporting</h2>
      <p class="sub" data-i18n="ecl.sub">Where do PnL and risk stand today? Simulated book. ALPHA_NON_PRODUCTION.</p>
      <div id="eclRoot" aria-live="polite"></div>
    </div>

    <div class="view" id="analysis">
      <h2 class="homeHeadline" data-i18n="analysis.headline">Analysis workbench</h2>
      <p class="sub" data-i18n="analysis.sub">Instrument drilldown, scenario compare, risk exposure, decision impact. Simulated. Not a live book.</p>
      <div id="analysisRoot" aria-live="polite"></div>
    </div>

    <div class="view" id="detective">
      <h2 class="homeHeadline" data-i18n="detective.headline">Who decided — and why?</h2>
      <p class="sub" data-i18n="detective.sub">Timeline, evidence chain, filters (user, instrument, time, risk). Session audit. Not enterprise SIEM.</p>
      <div id="detectiveRoot" aria-live="polite"></div>
    </div>

    <div class="view" id="decisions">
      <h2 class="homeHeadline" data-i18n="decisions.headline">Decisions</h2>
      <p class="sub" data-i18n="decisions.sub">DIL proposals (human accept/reject writes audit only — no trade) and GW1 analysis outcomes.</p>
      <div class="card" id="decisionsProRoot"></div>
      <div id="decisionsProfessionHost" class="pro-card"></div>
      <div id="dilDecisionsRoot"></div>
      <details class="card" style="margin-top:0.75rem"><summary>Technical JSON</summary><pre id="decisionsPre">Run Analyze to populate decisions.</pre></details>
    </div>

    <div class="view" id="evidence">
      <h2 class="homeHeadline" data-i18n="evidence.headline">Evidence</h2>
      <p class="sub" data-i18n="evidence.sub">Lineage and provenance for the latest analysis.</p>
      <div class="card" id="evidenceProRoot"></div>
      <div id="dilEvidenceRoot"></div>
      <details class="card" style="margin-top:0.75rem"><summary>Technical JSON</summary><pre id="lineagePre" data-i18n="fill.evidenceJson">Run a slice first.</pre></details>
    </div>

    <div class="view" id="jobs">
      <h2 class="homeHeadline">Job Center</h2>
      <p class="sub" id="jobCenterSummary">Background jobs — CF11 state on local-durable store.</p>
      <div class="actions">
        <button type="button" class="ghost" id="jobRefreshBtn">Refresh jobs</button>
      </div>
      <div id="jobCenterRoot"></div>
    </div>

    <div class="view" id="system">
      <h2 class="homeHeadline" data-i18n="system.headline">System</h2>
      <p class="sub" data-i18n="system.sub">Readiness and foundation status — derived from live control plane APIs.</p>
      <div class="grid">
        <div class="card" id="sysHealthRoot"></div>
        <div class="card" id="sysReadinessRoot"></div>
        <div class="card" id="sysWorkerRoot"></div>
        <div class="card" id="sysPersistenceRoot"></div>
        <div class="card" id="sysValidationRoot"></div>
        <div class="card" id="sysRunsRoot"></div>
        <div class="card" id="sysArchRoot"></div>
        <div class="card"><h2>Pipeline</h2><div class="pipe" id="dashPipe"></div></div>
      </div>
    </div>

    <div class="view" id="settings">
      <h2 class="homeHeadline" data-i18n="settings.headline">Settings</h2>
      <p class="sub" data-i18n="settings.sub">Local session preferences. Not an OIDC profile. Not durable enterprise config.</p>
      <div id="settingsRoot"></div>
    </div>

    <div class="view" id="engineering">
      <p class="sub" data-i18n="eng.sub">Technical / Evidence view — engineering surfaces preserved.</p>
      <div id="engPanel">
        <div class="eng-section" data-eng-panel="dash"><div class="card"><h2>Technical cockpit</h2><pre id="engDash">Open sub-views above.</pre></div></div>
        <div class="eng-section" data-eng-panel="risk" hidden>
          <div class="card" id="riskStudioPro"></div>
          <div class="card"><h2>GW1 Risk / Gov JSON</h2><pre id="riskStudio" data-i18n="fill.riskEmpty">—</pre></div>
        </div>
        <div class="eng-section" data-eng-panel="exec" hidden>
          <div class="card" id="execMonPro"></div>
          <div class="card"><h2>GW1 execution JSON</h2><pre id="execMon" data-i18n="fill.simEmpty">SIMULATION_ONLY — no live money.</pre></div>
        </div>
        <div class="eng-section" data-eng-panel="lineage" hidden>
          <div class="card" id="kgLineageRoot"></div>
          <div class="card"><h2>Lineage Explorer</h2><pre id="engLineagePre" data-i18n="fill.lineageEmpty">Run Analyze to populate lineage JSON.</pre></div>
        </div>
        <div class="eng-section" data-eng-panel="kg" hidden><div class="card" id="kgStudioRoot"></div></div>
        <div class="eng-section" data-eng-panel="agent" hidden><div class="card" id="agentStudioRoot"></div></div>
        <div class="eng-section" data-eng-panel="workflow" hidden><div class="card" id="workflowStudioRoot"></div></div>
        <div class="eng-section" data-eng-panel="dist" hidden><div class="card" id="distOsRoot"></div></div>
        <div class="eng-section" data-eng-panel="health" hidden><div class="card"><h2>Health snapshot</h2><pre id="healthPre">—</pre></div></div>
      </div>
    </div>

    <div class="view" id="searchResults">
      <h2 class="homeHeadline">Search results</h2>
      <p class="sub" id="searchSub"></p>
      <div class="results" id="searchList"></div>
    </div>
  </main>
  <script>
    const CONTROL = ${JSON.stringify(CONTROL_URL)};
    const SESSION_KEY = "sci-os-x10.session.v1";
    let lastData = null;
    let currentEntity = null;
    let approvalState = "idle";
    let lastCompiled = null;
    let currentRoleId = "arch.market_analyst";
    let inspectedCatalogId = null;
    let lastProfessionExpansion = null;
    let lastOsBlueprints = null;
    let lastPrecisionUpgrade = null;
    let lastCyberBridge = null;
    let lastActivationReview = null;
    let lastEnterprisePrep = null;
    let lastAutomationPrep = null;
    let lastVisibilityPrep = null;
    let lastVisibilityActivation = null;
    let lastVisibilityDeep = null;
    let lastExplainabilityPrep = null;
    let lastExplainVisibility = null;
    let lastDigitalWorkspaceCompute = null;
    let lastActivationPass = null;
    function paintDomainAnalogs() {
      paintProfessionPanelAnalogs(lastProfessionExpansion, inspectedCatalogId, {
        osBlueprints: lastOsBlueprints,
        roleId: currentRoleId,
      });
      if (lastPrecisionUpgrade) paintPrecisionOverlay(lastPrecisionUpgrade);
      if (lastCyberBridge) paintCyberBridgeOverlay(lastCyberBridge);
      if (lastActivationReview) paintActivationReviewOverlay(lastActivationReview);
      if (lastEnterprisePrep) paintEnterprisePrepOverlay(lastEnterprisePrep);
      if (lastAutomationPrep) paintAutomationPrepOverlay(lastAutomationPrep);
      if (lastVisibilityPrep) paintVisibilityPrepOverlay(lastVisibilityPrep);
      if (lastVisibilityActivation) paintVisibilityActivationOverlay(lastVisibilityActivation);
      if (lastVisibilityDeep) paintVisibilityDeepOverlay(lastVisibilityDeep);
      if (lastExplainabilityPrep) paintExplainabilityPrepOverlay(lastExplainabilityPrep);
      if (lastExplainVisibility) paintExplainVisibilityOverlay(lastExplainVisibility);
      if (lastDigitalWorkspaceCompute) paintDigitalWorkspaceComputeOverlay(lastDigitalWorkspaceCompute);
      if (lastActivationPass) paintActivationPassOverlay(lastActivationPass);
    }
    let lastHeroV3 = null;
    let actorEnvelope = null;
    let lastSystemBundle = null;
${SAFE_DOM_BROWSER_SOURCE}
${PRIMITIVES_BROWSER_SOURCE}
${PROFESSIONAL_UX_BROWSER_SOURCE}
${WORKSPACE_RENDERER_BROWSER_SOURCE}
${ECL_DIL_CONSOLE_BROWSER_SOURCE}
${I18N_BROWSER_SOURCE}
${PRODUCT_SETTINGS_BROWSER_SOURCE}
${SCI_CHARTS_BROWSER_SOURCE}
${ANALYTICS_DETECTIVE_BROWSER_SOURCE}
${BLUEPRINT_STUDIO_BROWSER_SOURCE}
${HERO_V3_BROWSER_SOURCE}

    const KNOWN_MODULES = [
      "ContextHeader",
      "PredictionPanel",
      "UncertaintyPanel",
      "RiskPanel",
      "DecisionPanel",
      "SimulationPanel",
      "EvidencePanel",
      "LineagePanel",
      "OpsIntel",
    ];

    function loadSession() {
      try {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
      } catch {
        return {};
      }
    }
    function saveSession(patch) {
      const next = { ...loadSession(), ...patch, updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch (_) {
        /* localStorage blocked (private mode) — session remains in-memory */
      }
      return next;
    }

    let settingsTab = "user";
    let productPrefs = mergeProductPrefs(loadSession());
    function commitProductPrefs(patch) {
      productPrefs = applyProductPrefs(saveSession(mergeProductPrefs({ ...productPrefs, ...patch })));
      const lang = document.getElementById("langSelect");
      if (lang) lang.value = productPrefs.locale;
      applyChromeI18n(productPrefs.locale);
      if (document.getElementById("settings") && document.getElementById("settings").classList.contains("on")) {
        paintSettings();
      }
      const homeEl = document.getElementById("home");
      if (homeEl && homeEl.classList.contains("on") && typeof loadHome === "function") {
        loadHome().catch(function (err) {
          const homeSub = document.getElementById("homeSub");
          if (homeSub) {
            homeSub.textContent =
              "Home reload failed after preference change — UNKNOWN: " +
              String((err && err.message) || err);
          }
        });
      }
      return productPrefs;
    }
    function paintSettings() {
      renderProductSettings(document.getElementById("settingsRoot"), {
        locale: productPrefs.locale,
        prefs: productPrefs,
        tab: settingsTab,
        infra: lastSystemBundle && lastSystemBundle.enterpriseHooks,
        onTab: (id) => {
          settingsTab = id;
          paintSettings();
        },
        onChange: (patch) => commitProductPrefs(patch),
      });
    }

    async function api(path, options) {
      const response = await fetch(CONTROL + path, options);
      let body = null;
      try {
        body = await response.json();
      } catch (_) {
        body = null;
      }
      if (!response.ok) {
        const error = new Error(
          (body && body.error) || ("HTTP " + response.status)
        );
        error.status = response.status;
        error.body = body;
        throw error;
      }
      return body;
    }

    function assertHomeContract(home) {
      if (!home || typeof home !== "object") {
        throw new Error("HOME_DATA_INVALID: not an object");
      }
      if (home.attention == null && home.sections == null) {
        throw new Error("HOME_DATA_INVALID: missing attention and sections");
      }
      return home;
    }

    /**
     * Experience Compiler → ExperienceSchema → existing Cockpit panels.
     * Unknown modules → safe PARTIAL placeholders (no blank screen).
     */
    function applyCompiledExperience(compiled) {
      lastCompiled = compiled;
      const out = (compiled && compiled.output) || {};
      if (compiled && compiled.actor) actorEnvelope = compiled.actor;
      const result = renderWorkspaceSpec(compiled, {
        document: document,
        KNOWN_MODULES: KNOWN_MODULES,
        clearNode: clearNode,
        appendEl: appendEl,
      });

      function paintCompose(targetId) {
        const host = document.getElementById(targetId);
        if (!host) return;
        clearNode(host);
        const modules = Array.isArray(out.modules) ? out.modules.slice() : [];
        modules.sort((a, b) => (a.order || 0) - (b.order || 0));
        modules.forEach((m) => {
          const chip = document.createElement("span");
          const bound = KNOWN_MODULES.includes(m.id);
          chip.className = "exp-chip " + (bound ? "on" : "partial");
          chip.textContent = m.order + ". " + m.id + (bound ? "" : " · PARTIAL");
          host.appendChild(chip);
        });
      }
      paintCompose("expComposeHome");
      paintCompose("expComposeSlice");

      const meta =
        (out.workspaceProfileId || "unknown") +
        " · density " +
        (out.density || "?") +
        " · disclosure " +
        (out.disclosureDefault || "?") +
        " · next: " +
        (out.nextStep || "—");
      const cw = document.getElementById("compiledWorkspace");
      if (cw) cw.textContent = meta;
      const em = document.getElementById("expComposeMeta");
      if (em) {
        em.textContent =
          "Profile " +
          (out.workspaceProfileId || "—") +
          " · role " +
          ((compiled.input && compiled.input.roleId) || currentRoleId) +
          " · actor " +
          ((compiled.actor && compiled.actor.actorId) || "UNKNOWN");
      }
      const st = document.getElementById("expStatus");
      if (st) {
        const status = compiled.compilerStatus || "UNKNOWN";
        st.textContent = "EXPERIENCE · " + status;
        st.className =
          "badge " + (/DEGRADED|UNKNOWN|UNREACHABLE/i.test(status) ? "warn" : "ok");
      }
      if (compiled.experienceSpec && compiled.experienceSpec.roleHints) {
        const hint = compiled.experienceSpec.roleHints.presentation;
        const roleHintEl = document.getElementById("roleHint");
        if (roleHintEl && hint) roleHintEl.textContent = hint;
      }
      if (compiled.degraded && compiled.degradedReasons && compiled.degradedReasons.length) {
        const banner = document.getElementById("banner");
        if (banner) {
          banner.style.display = "block";
          banner.textContent =
            "Experience compiler DEGRADED — " +
            compiled.degradedReasons.slice(0, 3).join("; ");
        }
      }
      return result;
    }

    function showExperienceDegraded(err) {
      const banner = document.getElementById("banner");
      banner.style.display = "block";
      banner.className = "banner degraded";
      banner.textContent =
        "Workspace composition unavailable. Core SCI OS experience remains available in DEGRADED mode." +
        (err ? " (" + err + ")" : "");
      const st = document.getElementById("expStatus");
      if (st) {
        st.textContent = "EXPERIENCE · DEGRADED";
        st.className = "badge warn";
      }
      const cw = document.getElementById("compiledWorkspace");
      if (cw) cw.textContent = "Experience Compiler unreachable — Home stays alive.";
    }

    async function fetchCompiledExperience(roleId) {
      const q =
        "/v1/experience/compile?roleId=" +
        encodeURIComponent(roleId) +
        "&workflowState=ready&userExperienceLevel=intermediate";
      return api(q);
    }

    const PIPE_STEPS = [
      "Collecting data",
      "Building PIT features",
      "Running prediction",
      "Evaluating uncertainty",
      "Risk assessment",
      "Policy evaluation",
      "Simulation",
    ];

    let dilHorizon = "24h";
    const VIEW_LABELS = {
      home: "Home",
      work: "Work",
      slice: "Analyze",
      dil: "Intelligence",
      ecl: "Reporting",
      analysis: "Analysis",
      detective: "Detective",
      evidence: "Evidence",
      decisions: "Decisions",
      system: "System",
      settings: "Settings",
      engineering: "Engineering",
      entities: "Search",
      roles: "Roles",
      searchResults: "Search",
    };
    function paintContext(viewId, extra) {
      extra = extra || {};
      const known = lastSystemBundle != null;
      const b = lastSystemBundle || {};
      renderContextHeader({
        product: "SCI OS ×10",
        maturity: "ALPHA_NON_PRODUCTION",
        view: t(productPrefs.locale, ({
          home: "nav.home",
          work: "nav.work",
          slice: "nav.analyze",
          dil: "nav.intelligence",
          ecl: "nav.reporting",
          analysis: "nav.analysis",
          detective: "nav.detective",
          evidence: "nav.evidence",
          decisions: "nav.decisions",
          system: "nav.system",
          settings: "nav.settings",
          engineering: "nav.engineering",
          entities: "nav.entities",
          roles: "nav.roles",
          searchResults: "nav.entities",
        })[viewId] || "") || VIEW_LABELS[viewId] || viewId || "—",
        executionMode: b.executionMode || "SIMULATION_ONLY",
        feeds: extra.feeds || b.feedsLabel || "simulated_alpha",
        cpReachable: known ? b.cpReachable !== false : false,
        cpVerdict: b.verdict || (known ? "UNKNOWN" : "UNKNOWN"),
        compilerStatus: b.compilerStatus || "UNKNOWN",
        compilerPipeline: b.compilerPipeline,
        compilerVersion: b.compilerVersion,
        roleId: currentRoleId,
        cockpitVerdict:
          extra.cockpitVerdict ||
          (known ? (b.degraded ? "DEGRADED" : b.cpReachable === false ? "UNREACHABLE" : "ALPHA_LIVE") : "UNKNOWN"),
        degradedNote: extra.degradedNote,
      });
    }
    function showView(id, source) {
      if (!id || !document.getElementById(id)) return;
      document.querySelectorAll("main .view").forEach((v) => v.classList.toggle("on", v.id === id));
      document.querySelectorAll("nav.primary button").forEach((b) => {
        b.classList.toggle("on", b.dataset.v === id || (id === "searchResults" && b.dataset.v === "entities"));
      });
      const eng = document.getElementById("engNav");
      eng.hidden = id !== "engineering";
      paintContext(id);
      if (source !== "hash") {
        const next = "#" + id;
        if (location.hash !== next) history.replaceState(null, "", next);
      }
      if (id === "dil") loadDilConsole(dilHorizon);
      if (id === "ecl") loadEclConsole();
      if (id === "analysis") loadAnalysisWorkbench();
      if (id === "detective") loadDetectiveWorkbench();
      if (id === "system") loadEclDilArchitecture();
      if (id === "evidence") loadDilEvidence();
      if (id === "decisions") loadDilDecisions();
      if (id === "engineering") {
        loadTechEclDil();
        loadBlueprintStudios();
      }
      if (id === "settings") paintSettings();
      if (id === "roles") loadProfessionalWorkspace();
    }
    function applyHashView() {
      const id = (location.hash || "").replace(/^#/, "");
      if (id && document.getElementById(id)) showView(id, "hash");
    }
    window.addEventListener("hashchange", applyHashView);

    async function loadProfessionalWorkspace() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      clearNode(root);
      createLoadingState(root, "Loading professional catalog…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional").then((r) => {
          if (!r.ok) throw new Error("professional HTTP " + r.status);
          return r.json();
        });
        const data = payload.data || payload;
        lastProfessionExpansion = data.moduleExpansion || null;
        lastOsBlueprints = data.osBlueprints || null;
        lastPrecisionUpgrade = data.precisionUpgrade || null;
        lastCyberBridge = data.cyberBridge || null;
        lastActivationReview = data.activationReview || null;
        lastEnterprisePrep = data.enterprisePrep || null;
        lastAutomationPrep = data.automationPrep || null;
        lastVisibilityPrep = data.visibilityPrep || null;
        lastVisibilityActivation = data.visibilityActivation || null;
        lastVisibilityDeep = data.visibilityDeep || null;
        lastExplainabilityPrep = data.explainabilityPrep || null;
        lastExplainVisibility = data.explainVisibility || null;
        lastDigitalWorkspaceCompute = data.digitalWorkspaceCompute || null;
        lastActivationPass = data.activationPass || null;
        renderProfessionalWorkspace(root, payload, {
          inspectedCatalogId: inspectedCatalogId,
          onSelectCatalog: (id) => {
            inspectedCatalogId = id;
            const hit = (data.catalogs || []).find((c) => c.id === id);
            const next = hit && hit.analogArchetypes && hit.analogArchetypes[0];
            if (next) {
              currentRoleId = next;
              const sel = document.getElementById("roleSelect");
              if (sel) populateRoleSelect(sel, currentRoleId);
              const rh = document.getElementById("roleHint");
              if (rh) rh.textContent = rolePresentationHint(currentRoleId);
              saveSession({ roleId: currentRoleId, inspectedCatalogId: id });
            } else {
              saveSession({ inspectedCatalogId: id });
            }
            paintDomainAnalogs();
          },
          onCompile: () => loadProfessionalCompile(),
          onValidate: () => loadWorkspaceValidation(),
          onDeepValidate: () => loadDeepWorkspaceValidation(),
          onActivate: () => loadWorkspaceActivation(),
          onStabilize: () => loadWorkspaceStabilization(),
          onDigitalActivate: () => loadDigitalActivation(),
          onPrecisionUpgrade: () => loadPrecisionUpgrade(),
          onCyberBridge: () => loadCyberBridge(),
          onActivationReview: () => loadActivationReview(),
          onEnterprisePrep: () => loadEnterprisePrep(),
          onAutomationPrep: () => loadAutomationPrep(),
          onVisibilityPrep: () => loadVisibilityPrep(),
          onVisibilityActivation: () => loadVisibilityActivation(),
          onVisibilityDeep: () => loadVisibilityDeep(),
          onExplainabilityPrep: () => loadExplainabilityPrep(),
          onExplainVisibility: () => loadExplainVisibility(),
          onDigitalWorkspaceCompute: () => loadDigitalWorkspaceCompute(),
          onActivationPass: () => loadActivationPass(),
        });
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "PROFESSIONAL CATALOG UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadProfessionalCompile() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Compiling professional workspace (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/compile").then((r) => {
          if (!r.ok) throw new Error("professional compile HTTP " + r.status);
          return r.json();
        });
        clearNode(root);
        renderProfessionalCompile(root, payload);
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "COMPILE UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadWorkspaceValidation() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Validating professional workspace (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/validate").then((r) => {
          if (!r.ok) throw new Error("professional validate HTTP " + r.status);
          return r.json();
        });
        clearNode(root);
        renderWorkspaceValidation(root, payload);
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "VALIDATE UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadDeepWorkspaceValidation() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Deep-validating professional workspace (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/validate/deep").then((r) => {
          if (!r.ok) throw new Error("professional deep validate HTTP " + r.status);
          return r.json();
        });
        clearNode(root);
        renderWorkspaceValidation(root, payload);
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "DEEP VALIDATE UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadWorkspaceActivation() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Activating professional workspace (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/activate").then((r) => {
          if (!r.ok) throw new Error("professional activate HTTP " + r.status);
          return r.json();
        });
        clearNode(root);
        renderWorkspaceActivation(root, payload);
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "ACTIVATE UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadWorkspaceStabilization() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Stabilizing professional workspace (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/stabilize").then((r) => {
          if (!r.ok) throw new Error("professional stabilize HTTP " + r.status);
          return r.json();
        });
        clearNode(root);
        renderWorkspaceStabilization(root, payload);
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "STABILIZE UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadDigitalActivation() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Digital activation inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/digital-activation").then((r) => {
          if (!r.ok) throw new Error("professional digital-activation HTTP " + r.status);
          return r.json();
        });
        clearNode(root);
        renderDigitalActivation(root, payload);
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "DIGITAL ACTIVATION UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadPrecisionUpgrade() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Precision upgrade inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/precision-upgrade").then((r) => {
          if (!r.ok) throw new Error("professional precision-upgrade HTTP " + r.status);
          return r.json();
        });
        lastPrecisionUpgrade = (payload && payload.data) || payload;
        clearNode(root);
        renderPrecisionUpgrade(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "PRECISION UPGRADE UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadCyberBridge() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Cyber research + investment bridge inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/cyber-bridge").then((r) => {
          if (!r.ok) throw new Error("professional cyber-bridge HTTP " + r.status);
          return r.json();
        });
        lastCyberBridge = (payload && payload.data) || payload;
        clearNode(root);
        renderCyberResearchBridge(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "CYBER BRIDGE UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadActivationReview() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Activation review inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/activation-review").then((r) => {
          if (!r.ok) throw new Error("professional activation-review HTTP " + r.status);
          return r.json();
        });
        lastActivationReview = (payload && payload.data) || payload;
        clearNode(root);
        renderActivationReview(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "ACTIVATION REVIEW UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadEnterprisePrep() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Enterprise prep inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/enterprise-prep").then((r) => {
          if (!r.ok) throw new Error("professional enterprise-prep HTTP " + r.status);
          return r.json();
        });
        lastEnterprisePrep = (payload && payload.data) || payload;
        clearNode(root);
        renderEnterprisePrep(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "ENTERPRISE PREP UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadAutomationPrep() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Automation prep inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/automation-prep").then((r) => {
          if (!r.ok) throw new Error("professional automation-prep HTTP " + r.status);
          return r.json();
        });
        lastAutomationPrep = (payload && payload.data) || payload;
        clearNode(root);
        renderAutomationPrep(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "AUTOMATION PREP UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadVisibilityPrep() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Visibility prep inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/visibility-prep").then((r) => {
          if (!r.ok) throw new Error("professional visibility-prep HTTP " + r.status);
          return r.json();
        });
        lastVisibilityPrep = (payload && payload.data) || payload;
        clearNode(root);
        renderVisibilityPrep(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "VISIBILITY PREP UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadVisibilityActivation() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Visibility episodes inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/visibility-activation").then((r) => {
          if (!r.ok) throw new Error("professional visibility-activation HTTP " + r.status);
          return r.json();
        });
        lastVisibilityActivation = (payload && payload.data) || payload;
        clearNode(root);
        renderVisibilityActivation(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "VISIBILITY EPISODES UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadVisibilityDeep() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Visibility deep inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/visibility-deep").then((r) => {
          if (!r.ok) throw new Error("professional visibility-deep HTTP " + r.status);
          return r.json();
        });
        lastVisibilityDeep = (payload && payload.data) || payload;
        clearNode(root);
        renderVisibilityDeep(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "VISIBILITY DEEP UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadExplainabilityPrep() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Explainability prep inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/explainability-prep").then((r) => {
          if (!r.ok) throw new Error("professional explainability-prep HTTP " + r.status);
          return r.json();
        });
        lastExplainabilityPrep = (payload && payload.data) || payload;
        clearNode(root);
        renderExplainabilityPrep(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "EXPLAINABILITY PREP UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadExplainVisibility() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Explain+visibility inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/explain-visibility").then((r) => {
          if (!r.ok) throw new Error("professional explain-visibility HTTP " + r.status);
          return r.json();
        });
        lastExplainVisibility = (payload && payload.data) || payload;
        clearNode(root);
        renderExplainVisibility(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "EXPLAIN+VISIBILITY UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadDigitalWorkspaceCompute() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Digital KG+desks inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/digital-workspace-compute").then((r) => {
          if (!r.ok) throw new Error("professional digital-workspace-compute HTTP " + r.status);
          return r.json();
        });
        lastDigitalWorkspaceCompute = (payload && payload.data) || payload;
        clearNode(root);
        renderDigitalWorkspaceCompute(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "DIGITAL KG+DESKS UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadActivationPass() {
      const root = document.getElementById("rolesRoot");
      if (!root) return;
      createLoadingState(root, "Master suite inspect (SAFE)…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/professional/activation-pass").then((r) => {
          if (!r.ok) throw new Error("professional activation-pass HTTP " + r.status);
          return r.json();
        });
        lastActivationPass = (payload && payload.data) || payload;
        clearNode(root);
        renderActivationPass(root, payload);
        paintDomainAnalogs();
      } catch (err) {
        clearNode(root);
        createEmptyState(root, "MASTER SUITE UNREACHABLE — " + (err && err.message ? err.message : "UNKNOWN"));
      }
    }

    async function loadDilConsole(horizon) {
      dilHorizon = horizon || dilHorizon || "24h";
      const root = document.getElementById("dilRoot");
      if (!root) return;
      clearNode(root);
      createLoadingState(root, "Loading decision intelligence…");
      try {
        const payload = await fetch(CONTROL + "/v1/dil/workspace?horizon=" + encodeURIComponent(dilHorizon)).then((r) => {
          if (!r.ok) throw new Error("DIL workspace HTTP " + r.status);
          return r.json();
        });
        renderDilConsole(root, payload, {
          onHorizon: (h) => loadDilConsole(h),
          onPropose: async (marketId) => {
            const pr = await fetch(CONTROL + "/v1/ai/proposals", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ marketId: marketId, horizon: dilHorizon }),
            });
            if (!pr.ok) throw new Error("proposal HTTP " + pr.status);
            await loadDilConsole(dilHorizon);
          },
          onOpenDecisions: () => showView("decisions"),
        });
        const dilData = payload.data || payload;
        renderDilAnalytics(root, {
          rows: dilData.rows,
          calibration: dilData.calibration,
          trackRecord: dilData.trackRecord,
          onOpenAnalysis: () => showView("analysis"),
          onOpenDetective: () => showView("detective"),
        });
        const di = appendEl(root, "div", "actions");
        const kgBtn = appendEl(di, "button", "ghost", "Domain Intelligence");
        kgBtn.type = "button";
        kgBtn.setAttribute("data-action-id", "dil.open_kg");
        kgBtn.onclick = () => {
          showEngPanel("kg");
          showView("engineering");
        };
      } catch (err) {
        clearNode(root);
        const msg = String(err && err.message ? err.message : err);
        if (/fetch|network|ECONNREFUSED/i.test(msg)) {
          createErrorState(root, "OFFLINE — Control Plane unreachable. Start SCI OS, then reopen Intelligence.");
        } else createErrorState(root, "ERROR — " + msg);
      }
    }

    async function loadEclConsole() {
      const root = document.getElementById("eclRoot");
      if (!root) return;
      clearNode(root);
      createLoadingState(root, "Loading ECL reporting…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/workspace").then((r) => {
          if (!r.ok) throw new Error("ECL workspace HTTP " + r.status);
          return r.json();
        });
        renderEclConsole(root, payload);
        const eclData = payload.data || payload;
        renderEclAnalytics(root, {
          snapshot: eclData.snapshot,
          onOpenAnalysis: () => showView("analysis"),
        });
      } catch (err) {
        clearNode(root);
        const msg = String(err && err.message ? err.message : err);
        if (/fetch|network|ECONNREFUSED/i.test(msg)) {
          createErrorState(root, "OFFLINE — Control Plane unreachable. Start SCI OS, then reopen Reporting.");
        } else createErrorState(root, "ERROR — " + msg);
      }
    }

    async function loadAnalysisWorkbench() {
      const root = document.getElementById("analysisRoot");
      if (!root) return;
      clearNode(root);
      createLoadingState(root, "Loading analysis workbench…");
      try {
        const [dilRes, eclRes] = await Promise.all([
          fetch(CONTROL + "/v1/dil/workspace?horizon=" + encodeURIComponent(dilHorizon || "24h")),
          fetch(CONTROL + "/v1/ecl/workspace"),
        ]);
        if (!dilRes.ok) throw new Error("DIL workspace HTTP " + dilRes.status);
        if (!eclRes.ok) throw new Error("ECL workspace HTTP " + eclRes.status);
        const dil = await dilRes.json();
        const ecl = await eclRes.json();
        renderAnalysisWorkbench(
          root,
          {
            dil: dil.data || dil,
            ecl: ecl.data || ecl,
            lastGw1: lastData || {},
          },
          {
            onOpenIntelligence: () => showView("dil"),
            onOpenReporting: () => showView("ecl"),
            onOpenDetective: () => showView("detective"),
          }
        );
      } catch (err) {
        clearNode(root);
        const msg = String(err && err.message ? err.message : err);
        if (/fetch|network|ECONNREFUSED/i.test(msg)) {
          createErrorState(root, "OFFLINE — Control Plane unreachable. Start SCI OS, then reopen Analysis.");
        } else createErrorState(root, "ERROR — " + msg);
      }
    }

    async function loadDetectiveWorkbench() {
      const root = document.getElementById("detectiveRoot");
      if (!root) return;
      clearNode(root);
      createLoadingState(root, "Loading detective timeline…");
      try {
        const [auditRes, snapRes] = await Promise.all([
          fetch(CONTROL + "/v1/ecl/audit"),
          fetch(CONTROL + "/v1/system/snapshot"),
        ]);
        if (!auditRes.ok) throw new Error("audit HTTP " + auditRes.status);
        const payload = await auditRes.json();
        const snap = snapRes.ok ? await snapRes.json() : {};
        renderDetectiveWorkbench(
          root,
          {
            events: payload.data || payload || [],
            gw1Runs: snap.runs || (snap.data && snap.data.runs) || [],
          },
          {
            onOpenEvidence: () => showView("evidence"),
            onOpenDecisions: () => showView("decisions"),
            onOpenRisk: () => {
              showView("engineering");
              showEngPanel("risk");
            },
          }
        );
      } catch (err) {
        clearNode(root);
        const msg = String(err && err.message ? err.message : err);
        if (/fetch|network|ECONNREFUSED/i.test(msg)) {
          createErrorState(root, "OFFLINE — detective audit unavailable.");
        } else createErrorState(root, "ERROR — " + msg);
      }
    }

    async function loadEclDilArchitecture() {
      const root = document.getElementById("sysArchRoot");
      if (!root) return;
      clearNode(root);
      createLoadingState(root, "Loading architecture…");
      try {
        const payload = await fetch(CONTROL + "/v1/ecl/architecture").then((r) => (r.ok ? r.json() : null));
        if (payload) renderEclDilArchitecture(root, payload);
        else {
          clearNode(root);
          createErrorState(root, "UNKNOWN — ECL/DIL architecture endpoint not available");
        }
      } catch (err) {
        clearNode(root);
        createErrorState(root, "OFFLINE — architecture overview unavailable");
      }
    }

    async function loadDilEvidence() {
      const root = document.getElementById("dilEvidenceRoot");
      if (!root) return;
      clearNode(root);
      createLoadingState(root, "Loading audit evidence…");
      try {
        const [auditRes, snapRes, feedRes] = await Promise.all([
          fetch(CONTROL + "/v1/ecl/audit"),
          fetch(CONTROL + "/v1/system/snapshot"),
          fetch(CONTROL + "/v1/ecl/feeds"),
        ]);
        if (!auditRes.ok) throw new Error("audit HTTP " + auditRes.status);
        const payload = await auditRes.json();
        const snap = snapRes.ok ? await snapRes.json() : {};
        const feeds = feedRes.ok ? await feedRes.json() : {};
        const feedRegistry = (feeds.data && feeds.data.registry) || feeds.registry;
        clearNode(root);
        renderDilEvidenceTail(root, payload, {
          onOpenDecisions: () => showView("decisions"),
          onOpenDetective: () => showView("detective"),
          gw1Runs: snap.runs || snap.data?.runs || [],
          feedRegistry: feedRegistry,
        });
      } catch (err) {
        clearNode(root);
        const msg = String(err && err.message ? err.message : err);
        if (/fetch|network|ECONNREFUSED/i.test(msg)) {
          createErrorState(root, "OFFLINE — DIL audit unavailable.");
        } else createErrorState(root, "ERROR — " + msg);
      }
    }

    async function loadDilDecisions() {
      const root = document.getElementById("dilDecisionsRoot");
      if (!root) return;
      clearNode(root);
      createLoadingState(root, "Loading proposals…");
      try {
        const [propRes, calRes, feedRes] = await Promise.all([
          fetch(CONTROL + "/v1/ai/proposals"),
          fetch(CONTROL + "/v1/dil/calibration"),
          fetch(CONTROL + "/v1/ecl/feeds"),
        ]);
        if (!propRes.ok) throw new Error("proposals HTTP " + propRes.status);
        const payload = await propRes.json();
        const feeds = feedRes.ok ? await feedRes.json() : {};
        const feedRegistry = (feeds.data && feeds.data.registry) || feeds.registry;
        clearNode(root);
        if (calRes.ok) {
          const cal = await calRes.json();
          renderCalibrationPanel(root, cal.data || cal);
        } else {
          appendEl(root, "p", "empty", "UNKNOWN — calibration HTTP " + calRes.status + " (live remains UNKNOWN).");
        }
        renderDilDecisionList(root, payload, {
          onReview: async (proposalId, decision) => {
            const rr = await fetch(
              CONTROL + "/v1/ai/proposals/" + encodeURIComponent(proposalId) + "/review",
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ decision: decision, note: "cockpit human review" }),
              }
            );
            if (!rr.ok) throw new Error("review HTTP " + rr.status);
            const body = await rr.json();
            if (body.autoTrade !== false || (body.data && body.data.executed !== false)) {
              throw new Error("review must not execute or auto-trade");
            }
            await loadDilDecisions();
          },
          onOpenEvidence: () => showView("evidence"),
          onOpenIntelligence: () => showView("dil"),
          onOpenDetective: () => showView("detective"),
          feedRegistry: feedRegistry,
        });
      } catch (err) {
        clearNode(root);
        const msg = String(err && err.message ? err.message : err);
        if (/fetch|network|ECONNREFUSED/i.test(msg)) {
          createErrorState(root, "OFFLINE — proposals unavailable.");
        } else createErrorState(root, "ERROR — " + msg);
      }
    }

    async function loadTechEclDil() {
      const risk = document.getElementById("riskStudioPro");
      const exec = document.getElementById("execMonPro");
      try {
        const [gRes, snapRes, feedRes] = await Promise.all([
          fetch(CONTROL + "/v1/ecl/guardrail"),
          fetch(CONTROL + "/v1/ecl/snapshot"),
          fetch(CONTROL + "/v1/ecl/feeds"),
        ]);
        const g = gRes.ok ? await gRes.json() : null;
        const snap = snapRes.ok ? await snapRes.json() : null;
        const feeds = feedRes.ok ? await feedRes.json() : {};
        const feedRegistry = (feeds.data && feeds.data.registry) || feeds.registry;
        if (g) {
          const gData = g.data || g;
          renderTechRiskGov(risk, Object.assign({}, g, { data: Object.assign({}, gData, { feedRegistry: feedRegistry }) }));
          renderRiskAnalytics(risk, {
            limits: gData.limits,
            dailyLoss: gData.dailyLoss,
            concentration: gData.concentration,
            onOpenDetective: () => showView("detective"),
          });
        }
        else if (risk) {
          clearNode(risk);
          createErrorState(risk, "UNKNOWN — ECL guardrail HTTP " + gRes.status);
        }
        if (snap) renderTechExecMonitor(exec, snap);
        else if (exec) {
          clearNode(exec);
          createErrorState(exec, "UNKNOWN — ECL snapshot HTTP " + snapRes.status);
        }
      } catch (err) {
        const msg = String(err && err.message ? err.message : err);
        const offline = /fetch|network|ECONNREFUSED/i.test(msg);
        if (risk) {
          clearNode(risk);
          createErrorState(risk, offline ? "OFFLINE — ECL guardrail unavailable" : "ERROR — " + msg);
        }
        if (exec) {
          clearNode(exec);
          createErrorState(exec, offline ? "OFFLINE — ECL snapshot unavailable" : "ERROR — " + msg);
        }
      }
    }

    async function loadBlueprintStudios() {
      const agentRoot = document.getElementById("agentStudioRoot");
      const kgRoot = document.getElementById("kgStudioRoot");
      const wfRoot = document.getElementById("workflowStudioRoot");
      const distRoot = document.getElementById("distOsRoot");
      const linKg = document.getElementById("kgLineageRoot");
      try {
        const res = await fetch(CONTROL + "/v1/ecl/blueprints");
        if (!res.ok) throw new Error("blueprints HTTP " + res.status);
        const payload = await res.json();
        const data = payload.data || payload;
        const gw1Nodes = kgNodesFromGw1(lastData);
        const gw1Edges = kgEdgesFromNodes(gw1Nodes);
        const bundle = {
          data: Object.assign({}, data, {
            gw1Nodes: gw1Nodes,
            gw1Edges: gw1Edges,
            system: {
              boot: (data.liveAnalog && data.liveAnalog.boot) || "start-sci-os.cjs",
              shell: (data.liveAnalog && data.liveAnalog.shell) || "apps/cockpit-ui :4000",
              controlPlane: ":3000",
              profile: (lastSystemBundle && lastSystemBundle.ready && lastSystemBundle.ready.profile) || "local-foundation",
            },
          }),
        };
        if (agentRoot) renderAgentStudio(agentRoot, bundle);
        if (kgRoot) renderKgExplorer(kgRoot, bundle);
        if (wfRoot) renderWorkflowStudio(wfRoot, bundle);
        if (distRoot) renderDistributedOsView(distRoot, bundle);
        if (linKg) renderKgExplorer(linKg, bundle);
      } catch (err) {
        const msg = String(err && err.message ? err.message : err);
        const offline = /fetch|network|ECONNREFUSED/i.test(msg);
        [agentRoot, kgRoot, wfRoot, distRoot, linKg].forEach((el) => {
          if (!el) return;
          clearNode(el);
          createErrorState(el, offline ? "OFFLINE — blueprint inventory unavailable" : "ERROR — " + msg);
        });
      }
    }

    document.querySelectorAll("nav.primary button").forEach((b) => {
      b.onclick = () => showView(b.dataset.v);
    });
    document.querySelectorAll("nav.eng button").forEach((b) => {
      b.onclick = () => {
        showEngPanel(b.dataset.eng);
        showView("engineering");
      };
    });
    showEngPanel("dash");

    function show(id, v) {
      const el = document.getElementById(id);
      if (el) el.textContent = v == null ? "No data for this field." : JSON.stringify(v, null, 2);
    }
    function setMode(mode) {
      document.getElementById("modePro").classList.toggle("on", mode === "pro");
      document.getElementById("modeTech").classList.toggle("on", mode === "tech");
      document.getElementById("proView").classList.toggle("on", mode === "pro");
      document.getElementById("techView").classList.toggle("on", mode === "tech");
    }
    document.getElementById("modePro").onclick = () => setMode("pro");
    document.getElementById("modeTech").onclick = () => setMode("tech");

    function setPipe(state) {
      const el = document.getElementById("pipeProgress");
      clearNode(el);
      PIPE_STEPS.forEach((name, i) => {
        const s = document.createElement("span");
        s.className = "stage " + (state[i] || "wait");
        const mark = state[i] === "done" ? " ✓" : state[i] === "run" ? " ●" : " waiting";
        s.textContent = name + mark;
        el.appendChild(s);
      });
    }
    function pipeRunning() {
      let i = 0;
      setPipe(PIPE_STEPS.map((_, idx) => (idx === 0 ? "run" : "wait")));
      const t = setInterval(() => {
        i += 1;
        if (i >= PIPE_STEPS.length) { clearInterval(t); return; }
        setPipe(PIPE_STEPS.map((_, idx) => (idx < i ? "done" : idx === i ? "run" : "wait")));
      }, 180);
      return t;
    }
    function pipeDone() {
      setPipe(PIPE_STEPS.map(() => "done"));
    }
    function pipeClear() {
      clearNode(document.getElementById("pipeProgress"));
    }

    function renderTrustCapsule(data) {
      const el = document.getElementById("trustCapsule");
      const dl = document.getElementById("trustCapsuleDl");
      el.hidden = false;
      const pred = data.predictionEnvelope || {};
      const risk = data.riskDecision || {};
      const gov = data.governanceDecision || {};
      const lin = data.lineage || {};
      const model = pred.model || {};
      const rows = [
        ["Source freshness", data.timestamp || "as-of analysis"],
        ["Evidence coverage", lin.nodes ? lin.nodes.length + " lineage nodes" : (lin.tipHash ? "lineage tip present" : "UNKNOWN")],
        ["Model / version", model.id ? model.id + "@" + (model.version || "?") : "baseline (NON-PRODUCTION)"],
        ["Uncertainty", pred.abstain != null ? (pred.abstain ? "ABSTAIN signaled" : "point estimate with envelope") : "see Technical"],
        ["Calibration", (pred.calibration && pred.calibration.status) || "NON_PRODUCTION"],
        ["Risk", risk.verdict || risk.decision || (risk.approved === false ? "REJECT" : "UNKNOWN")],
        ["Policy", gov.policyId || gov.policy || "embedded-foundation/v1"],
        ["Lineage", (lin.tipHash || lin.lineageId) ? "available" : (lin.nodes ? "nodes present" : "UNKNOWN")],
      ];
      clearNode(dl);
      rows.forEach(([k, v]) => {
        appendEl(dl, "dt", null, k);
        appendEl(dl, "dd", null, v);
      });
    }

    function renderAiContext(data) {
      const panel = document.getElementById("aiContextPanel");
      const list = document.getElementById("aiContextList");
      panel.hidden = false;
      const entity =
        (data.normalizedEvent && data.normalizedEvent.instrumentId) ||
        currentEntity ||
        "—";
      const gov = data.governanceDecision || {};
      const risk = data.riskDecision || {};
      const items = [
        "Role: " + (actorEnvelope && actorEnvelope.roleId ? actorEnvelope.roleId : currentRoleId),
        "Actor: " + (actorEnvelope && actorEnvelope.actorId ? actorEnvelope.actorId : "UNKNOWN"),
        "Workspace: " + ((lastCompiled && lastCompiled.output && lastCompiled.output.workspaceProfileId) || "Analysis / GW1"),
        "Entity: " + entity,
        "Workflow: analyze → risk → governance → simulation",
        "Risk: " + (risk.verdict || risk.decision || "UNKNOWN"),
        "Policy: " + (gov.policyId || (actorEnvelope && actorEnvelope.policyContext && actorEnvelope.policyContext.policyId) || "embedded-foundation"),
        "Evidence: " + (data.runId ? "run " + data.runId : "none"),
        "Permissions: " + ((actorEnvelope && actorEnvelope.executionMode) || "SIMULATION_ONLY") + "; no live execution",
      ];
      clearNode(list);
      items.forEach((t) => appendEl(list, "li", null, t));
    }

    function renderApproval(data) {
      const card = document.getElementById("approvalCard");
      const gov = data.governanceDecision || {};
      const risk = data.riskDecision || {};
      const verdict = gov.verdict || gov.decision || "UNKNOWN";
      card.hidden = false;
      approvalState = "proposed";
      document.getElementById("approvalTitle").textContent =
        "Proposed next step — " + verdict + " (LOCAL REVIEW — not governed approval)";
      document.getElementById("approvalReason").textContent =
        "Reason: " + (gov.explanation || gov.reason || "Governance evaluated this analysis.");
      document.getElementById("approvalImpact").textContent =
        "Impact preview: SIMULATION_ONLY fill for " +
        ((data.normalizedEvent && data.normalizedEvent.instrumentId) || "instrument") +
        ". Risk: " +
        (risk.verdict || risk.decision || "UNKNOWN") +
        ". No live money movement.";
      document.getElementById("approvalEvidence").textContent =
        "Evidence: run " + (data.runId || "—") + " · open Evidence / Lineage for provenance.";
      const allowApprove = verdict === "APPROVE" || verdict === "ALLOW" || gov.action === "ALLOW";
      document.getElementById("approvalApprove").disabled = !allowApprove;
      document.getElementById("approvalStatus").textContent =
        "LOCAL REVIEW STATE — client/session only. Not a durable DecisionAction (actor→permission→governance→audit→evidence).";
      document.getElementById("approvalStatus").style.color = "";
    }

    function paintSciRibbon(opts) {
      const host = document.getElementById("sciRibbon");
      if (!host) return;
      const stages = [
        "raw_event",
        "normalized_event",
        "pit_feature",
        "baseline_prediction",
        "calibration_uncertainty",
        "independent_risk_gate",
        "governance_decision",
        "deterministic_execution",
        "outcome",
        "immutable_lineage",
        "cockpit_view",
      ];
      const hasAnalysis = !!(opts && opts.hasAnalysis);
      const kill = !!(opts && opts.killSwitch);
      const currentIndex = hasAnalysis ? stages.length - 1 : -1;
      host.replaceChildren();
      stages.forEach((id, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sci-ribbon-step";
        b.setAttribute("role", "listitem");
        b.dataset.stage = id;
        b.disabled = true;
        b.textContent = id.replace(/_/g, " ");
        let status = "unknown";
        if (hasAnalysis) {
          if (id === "independent_risk_gate" && kill) status = "critical";
          else if (opts && opts.degraded && id === "calibration_uncertainty") status = "degraded";
          else if (i <= currentIndex) status = "current";
          else status = "unknown";
        }
        b.dataset.status = status;
        if (opts && opts.emphasis && id === opts.emphasis) b.dataset.emphasis = "1";
        host.appendChild(b);
      });
    }

    function renderProfessional(data) {
      if (lastCompiled) applyCompiledExperience(lastCompiled);
      const pred = data.predictionEnvelope || {};
      const risk = data.riskDecision || {};
      const gov = data.governanceDecision || {};
      const exec = data.executionOutcome || {};
      const lin = data.lineage || {};
      const instrument = (data.normalizedEvent && data.normalizedEvent.instrumentId) || "—";
      const roleHint = rolePresentationHint(currentRoleId);
      document.getElementById("proWhat").textContent = instrument + " · analysis complete";
      document.getElementById("proWhatHint").textContent =
        roleHint +
        " · Run " + (data.runId || "") + " · status " + (data.status || "UNKNOWN") +
        (data.timestamp ? " · as-of " + data.timestamp : "") +
        (data.persistenceState ? " · persistence " + data.persistenceState : "");
      const pe = pred.pointEstimate != null ? pred.pointEstimate : pred.mean;
      const conf = pred.calibration || pred.predictionInterval || pred.uncertainty;
      document.getElementById("proCertain").textContent = pe != null ? String(pe) : "UNKNOWN";
      document.getElementById("proCertainHint").textContent = conf
        ? "Uncertainty/calibration present in envelope (see Technical)."
        : "No separate calibration object — treat point estimate as NON-PRODUCTION.";
      const uncEl = document.getElementById("proUncertainty");
      const uncHint = document.getElementById("proUncertaintyHint");
      if (uncEl) {
        if (pred.abstain === true) {
          uncEl.textContent = "ABSTAIN";
        } else if (pred.predictionInterval) {
          uncEl.textContent = JSON.stringify(pred.predictionInterval);
        } else if (pred.uncertainty != null) {
          uncEl.textContent = String(pred.uncertainty);
        } else if (conf) {
          uncEl.textContent = "PARTIAL — see calibration envelope";
        } else {
          uncEl.textContent = "UNKNOWN";
        }
      }
      if (uncHint) {
        uncHint.textContent = (pred.calibration && pred.calibration.status)
          ? "Calibration status: " + pred.calibration.status
          : "No calibration object — UNVALIDATED ALPHA science.";
      }
      const uncTruth = document.getElementById("uncertaintyModelTruth");
      if (uncTruth) {
        uncTruth.textContent =
          "MODEL · " +
          (pred.scienceStatus || pred.maturity || "FOUNDATION") +
          " · ALPHA · UNVALIDATED";
      }
      const predTruth = document.getElementById("predModelTruth");
      if (predTruth) {
        predTruth.textContent =
          "MODEL · " +
          (pred.scienceStatus || pred.maturity || "FOUNDATION") +
          " · ALPHA · UNVALIDATED — not SCIENTIFICALLY_VALIDATED / PRODUCTION_ELIGIBLE";
      }
      document.getElementById("proRisk").textContent =
        risk.verdict || risk.decision || (risk.score != null ? "score " + risk.score : "UNKNOWN");
      document.getElementById("proRiskHint").textContent =
        risk.reason || risk.explanation || "Risk gate result from independent path.";
      const riskTruth = document.getElementById("riskModelTruth");
      if (riskTruth) {
        riskTruth.textContent =
          "MODEL · " +
          (risk.scienceStatus || risk.maturity || "FOUNDATION") +
          " · ALPHA · UNVALIDATED — not CALIBRATED production science";
      }
      const next =
        gov.verdict === "APPROVE" || gov.decision === "APPROVE"
          ? "Simulation permitted — human LOCAL REVIEW still required below"
          : gov.verdict === "REJECT" || gov.decision === "REJECT"
            ? "Do not execute — risk/governance rejected"
            : (gov.verdict || gov.decision || "UNKNOWN");
      document.getElementById("proDecision").textContent = next;
      document.getElementById("proDecisionHint").textContent =
        gov.explanation || gov.reason || "Policy " + (gov.policyId || "embedded-foundation");
      document.getElementById("proExec").textContent =
        (exec.action || exec.status || "simulated") + (exec.simulated === false ? "" : " (simulated)");
      document.getElementById("proEvidence").textContent = lin.lineageId
        ? "lineage " + lin.lineageId
        : lin.nodes
          ? (lin.nodes.length || 0) + " lineage nodes"
          : "Lineage payload present — inspect Technical view";
      const pl = document.getElementById("proLineage");
      if (pl) {
        pl.textContent = data.lineageVerified === true
          ? "VERIFIED (hash recompute + prevHash)"
          : data.lineageVerified === false
            ? "FAILED integrity check"
            : "UNKNOWN — not yet verified in this payload";
      }
      const plh = document.getElementById("proLineageHint");
      if (plh && data.persistenceState === "PERSISTENCE_DEGRADED") {
        plh.textContent = "PERSISTENCE_DEGRADED — live analysis usable; durable store failed.";
      }
      document.getElementById("resultActions").hidden = false;
      renderAiContext(data);
      renderTrustCapsule(data);
      renderApproval(data);
      renderDecisionProfessional(data);
      renderEvidenceProfessional(data);
      const engLin = document.getElementById("engLineagePre");
      if (engLin) engLin.textContent = data.lineage ? JSON.stringify(data.lineage, null, 2) : "Run Analyze first.";
      show("decisionsPre", { risk: data.riskDecision, governance: data.governanceDecision, status: data.status });
      show("riskStudio", { risk: data.riskDecision, governance: data.governanceDecision, status: data.status });
      show("execMon", data.executionOutcome);
      paintSciRibbon({
        hasAnalysis: true,
        killSwitch: risk.killSwitchActive === true,
        emphasis: lastHeroV3 && lastHeroV3.ribbon && lastHeroV3.ribbon.emphasis,
        degraded: pred.calibration && pred.calibration.status === "degraded",
      });
      const bandHost = document.getElementById("predProfessionHost");
      if (bandHost && typeof createSciPredictionBand === "function") {
        const existing = bandHost.querySelector(".sci-prediction-band");
        if (existing) existing.remove();
        if (predictionBandVisible(pred)) createSciPredictionBand(bandHost, pred);
        else createSciToken(bandHost, "unknown", "ABSTAIN");
      }
      const riskHost = document.getElementById("riskProfessionHost");
      if (riskHost && typeof createSciRiskMatrix === "function") {
        const existingRisk = riskHost.querySelector(".sci-risk-matrix");
        if (existingRisk) existingRisk.remove();
        createSciRiskMatrix(riskHost, risk);
      }
      if (typeof applyHeroV3 === "function" && lastHeroV3) {
        applyHeroV3(lastHeroV3);
        const graph = document.getElementById("heroTruthGraph");
        if (graph && typeof createSciToken === "function") {
          graph.replaceChildren();
          truthGraphSlots({
            ohlcAllowed: lastHeroV3.ohlc === true,
            lineageVerified: data.lineageVerified === true,
            evidence: data.lineage && data.lineage.nodes,
            ontology: data.lineage && data.lineage.nodes,
          }).forEach((slot) => {
            createSciToken(graph, slot.present ? slot.tone : "unknown", slot.id + (slot.present ? "" : " · UNKNOWN"));
          });
        }
      }
    }

    async function bindHeroV3(roleId) {
      try {
        const payload = await api("/v1/ecl/professional/hero?roleId=" + encodeURIComponent(roleId || currentRoleId));
        lastHeroV3 = payload.data || payload;
        if (typeof applyHeroV3 === "function") applyHeroV3(lastHeroV3);
        const what = document.getElementById("proWhat");
        const hasAnalysis = !!(what && /analysis complete/.test(what.textContent || ""));
        paintSciRibbon({
          hasAnalysis,
          emphasis: lastHeroV3 && lastHeroV3.ribbon && lastHeroV3.ribbon.emphasis,
        });
      } catch (e) {
        lastHeroV3 = null;
        if (typeof applyHeroV3 === "function") applyHeroV3(null);
      }
    }

    async function loadHome() {
      const homeSub = document.getElementById("homeSub");
      paintSciRibbon();
      try {
        const roleSel = document.getElementById("roleSelect");
        if (roleSel && roleSel.value) currentRoleId = roleSel.value;
        bindHeroV3(currentRoleId);
        const [homeResult, compilerResult] = await Promise.allSettled([
          api("/v1/home").then(assertHomeContract),
          api(
            "/v1/experience/compile?roleId=" +
              encodeURIComponent(currentRoleId) +
              "&workflowState=ready&userExperienceLevel=intermediate"
          ),
        ]);

        if (homeResult.status !== "fulfilled") {
          const reason = homeResult.reason;
          homeSub.textContent =
            "HOME_DATA_INVALID / unreachable — " +
            String(reason && reason.message ? reason.message : reason);
          showExperienceDegraded("home_failed");
          throw reason || new Error("home_failed");
        }

        const home = homeResult.value;
        document.getElementById("homeHeadline").textContent = t(productPrefs.locale, "home.headline");
        const a = home.attention || {};
        homeSub.textContent =
          (a.recentAnalyses || 0) + " recent analyses · " +
          (a.notifications || 0) + " notifications · " +
          (a.systemNote || "");

        const cw = document.getElementById("compiledWorkspace");
        if (compilerResult.status === "fulfilled") {
          const compiled = compilerResult.value;
          if (compiled && (compiled.compilerStatus === "RUNTIME_MOUNTED" || compiled.compilerStatus === "DEGRADED" || compiled.output)) {
            applyCompiledExperience(compiled);
            const banner = document.getElementById("banner");
            if (
              banner.classList.contains("degraded") &&
              banner.textContent.indexOf("Workspace composition") === 0
            ) {
              banner.style.display = "none";
              banner.className = "banner";
            }
          } else {
            showExperienceDegraded(
              "compilerStatus=" + ((compiled && compiled.compilerStatus) || "UNKNOWN")
            );
          }
        } else {
          if (cw) {
            cw.textContent =
              "Experience composition unavailable — core Home active";
          }
          showExperienceDegraded(
            String(
              compilerResult.reason && compilerResult.reason.message
                ? compilerResult.reason.message
                : compilerResult.reason
            )
          );
        }

        const s = home.sections || {};
        const cardBodies = {
          work: (s.myWork || []).map((w) => w.title || w.workspaceId).join(", ") || t(productPrefs.locale, "work.headline"),
          analyses: (s.analyses || []).slice(0, 5).map((x) => (x.instrumentId || "?") + " · " + (x.status || "")).join("\\n") || t(productPrefs.locale, "fill.evidenceJson"),
          intelligence: t(productPrefs.locale, "dil.sub"),
          reporting: t(productPrefs.locale, "ecl.sub"),
          analysis: t(productPrefs.locale, "analysis.sub"),
          detective: t(productPrefs.locale, "detective.sub"),
          decisions: t(productPrefs.locale, "decisions.sub"),
          evidence: t(productPrefs.locale, "evidence.sub"),
          risks: (s.risks || []).length ? (s.risks.length + " rejected paths") : t(productPrefs.locale, "home.card.risks"),
          system: lastSystemBundle
            ? (lastSystemBundle.degraded ? "DEGRADED" : lastSystemBundle.cpReachable === false ? "UNREACHABLE" : "ALPHA_LIVE") +
              " · " +
              (lastSystemBundle.executionMode || "SIMULATION_ONLY") +
              " · not enterprise READY"
            : t(productPrefs.locale, "system.sub"),
        };
        const cardViews = {
          work: "work",
          analyses: "slice",
          intelligence: "dil",
          reporting: "ecl",
          analysis: "analysis",
          detective: "detective",
          decisions: "decisions",
          evidence: "evidence",
          risks: "detective",
          system: "system",
        };
        const prefsNow = mergeProductPrefs(productPrefs);
        const cells = prefsNow.homeCardOrder
          .filter((id) => prefsNow.homeHiddenCards.indexOf(id) < 0)
          .map((id) => ({
            id: id,
            t: t(productPrefs.locale, "home.card." + id),
            body: cardBodies[id] || "",
            view: cardViews[id],
          }));
        const grid = document.getElementById("homeGrid");
        clearNode(grid);
        cells.forEach((c) => {
          const d = document.createElement("div");
          d.className = "card";
          appendEl(d, "h2", null, c.t);
          const body = appendEl(d, "div", "big", c.body);
          body.style.fontSize = "0.9rem";
          body.style.whiteSpace = "pre-wrap";
          body.style.fontWeight = "500";
          if (c.view) {
            d.style.cursor = "pointer";
            d.setAttribute("role", "button");
            d.tabIndex = 0;
            d.onclick = () => showView(c.view);
            d.onkeydown = (ev) => { if (ev.key === "Enter") showView(c.view); };
          }
          grid.appendChild(d);
        });
        const wg = document.getElementById("workGrid");
        clearNode(wg);
        (s.analyses || []).slice(0, 8).forEach((x) => {
          const d = document.createElement("div");
          d.className = "card";
          appendEl(d, "h2", null, x.instrumentId || "run");
          appendEl(d, "div", null, x.status || "");
          appendEl(d, "p", "why", x.runId || "");
          wg.appendChild(d);
        });
        if (!(s.analyses || []).length) {
          const empty = document.createElement("div");
          empty.className = "card empty";
          empty.appendChild(document.createTextNode("NO ANALYSIS YET"));
          empty.appendChild(document.createElement("br"));
          empty.appendChild(
            document.createTextNode(
              "Run Analyze (GW1) or open Intelligence for prediction-market proposals. Human decides; no auto-trade."
            )
          );
          wg.appendChild(empty);
        }
      } catch (e) {
        if (homeSub && homeSub.textContent === "Loading home…") {
          homeSub.textContent =
            "SCI OS UI initialization failed: " +
            String(e && e.message ? e.message : e);
        }
        showExperienceDegraded("home_unreachable");
        paintContext("home", {
          cockpitVerdict: "DEGRADED",
          degradedNote: "Experience Compiler unreachable — core Home remains available.",
        });
        throw e;
      }
    }

    async function openEntity(idOrSymbol) {
      const res = await fetch(CONTROL + "/v1/entities/" + encodeURIComponent(idOrSymbol));
      if (!res.ok) {
        document.getElementById("entTitle").textContent = "Entity not found";
        document.getElementById("entEmpty").hidden = false;
        return;
      }
      const data = await res.json();
      currentEntity = data.entity;
      document.getElementById("entEmpty").hidden = true;
      document.getElementById("entTitle").textContent = data.entity.title;
      document.getElementById("entSub").textContent =
        data.entity.id + " · " + data.entity.status + " · as-of " + data.entity.asOf;
      document.getElementById("entAnalyze").hidden = false;
      const tabs = document.getElementById("entTabs");
      clearNode(tabs);
      (data.tabs || []).forEach((t, i) => {
        const s = document.createElement("span");
        s.textContent = t;
        if (i === 0) s.className = "on";
        tabs.appendChild(s);
      });
      const g = document.getElementById("entGrid");
      clearNode(g);
      [
        { h: "Overview", b: data.entity.title + " (" + (data.entity.symbol || "") + ")" },
        { h: "Predictions", b: (data.recentRuns || []).length + " linked runs" },
        { h: "Risk", b: "Open Analyze for live risk gate" },
        { h: "Evidence", b: (data.entity.evidenceRefs || []).length + " evidence refs" },
        { h: "History", b: (data.recentRuns || []).map((r) => r.runId).join(", ") || "None yet" },
      ].forEach((c) => {
        const d = document.createElement("div");
        d.className = "card";
        appendEl(d, "h2", null, c.h);
        appendEl(d, "div", null, c.b);
        g.appendChild(d);
      });
      document.getElementById("instrumentId").value = data.entity.symbol || "AAPL";
      showView("entities");
      fetch(CONTROL + "/v1/os/recent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "entity", id: data.entity.id, title: data.entity.title }),
      }).catch(() => {});
    }

    document.getElementById("entAnalyze").onclick = () => {
      showView("slice");
      document.getElementById("form").requestSubmit();
    };

    async function doSearch(q) {
      const res = await fetch(CONTROL + "/v1/search?q=" + encodeURIComponent(q));
      const data = await res.json();
      showView("searchResults");
      document.getElementById("searchSub").textContent = "Results for “" + q + "”";
      const list = document.getElementById("searchList");
      clearNode(list);
      const groups = data.results || {};
      Object.keys(groups).forEach((k) => {
        (groups[k] || []).forEach((item) => {
          const row = document.createElement("div");
          row.className = "hit";
          const wrap = document.createElement("div");
          appendEl(wrap, "div", "meta", item.type || k);
          appendEl(wrap, "strong", null, item.title || item.id);
          row.appendChild(wrap);
          const btn = document.createElement("button");
          btn.className = "ghost";
          btn.textContent = "Open";
          btn.onclick = () => {
            if ((item.type || k) === "Entity" || k === "entities") openEntity(item.id || item.title);
            else showView("slice");
          };
          row.appendChild(btn);
          list.appendChild(row);
        });
      });
      if (!list.children.length) {
        const empty = document.createElement("div");
        empty.className = "card empty";
        empty.textContent = "No results. Try AAPL.";
        list.appendChild(empty);
      }
    }

    let searchTimer = null;
    document.getElementById("globalSearch").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch(e.target.value.trim());
      }
    });
    document.getElementById("globalSearch").addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      const q = e.target.value.trim();
      if (q.length < 2) return;
      searchTimer = setTimeout(() => doSearch(q), 350);
    });

    const CMD_ITEMS = [
      { id: "home", label: "Go Home", meta: "nav", run: () => showView("home") },
      { id: "search", label: "Search AAPL", meta: "search", run: () => { document.getElementById("globalSearch").value = "AAPL"; doSearch("AAPL"); } },
      { id: "analyze", label: "Analyze AAPL (GW1)", meta: "workflow", run: () => { showView("slice"); document.getElementById("instrumentId").value = "AAPL"; } },
      { id: "dil", label: "Intelligence", meta: "nav", run: () => showView("dil") },
      { id: "ecl", label: "Reporting", meta: "nav", run: () => showView("ecl") },
      { id: "analysis", label: "Analysis workbench", meta: "nav", run: () => showView("analysis") },
      { id: "detective", label: "Detective timeline", meta: "nav", run: () => showView("detective") },
      { id: "decisions", label: "Decisions", meta: "nav", run: () => showView("decisions") },
      { id: "work", label: "My Work", meta: "nav", run: () => showView("work") },
      { id: "roles", label: "Professional workspace", meta: "nav", run: () => showView("roles") },
      { id: "evidence", label: "Open Evidence", meta: "nav", run: () => showView("evidence") },
      { id: "calibration", label: "Calibration / track record", meta: "nav", run: () => showView("dil") },
      { id: "settings", label: "Settings / language", meta: "nav", run: () => showView("settings") },
      { id: "system", label: "System status", meta: "nav", run: () => showView("system") },
      { id: "jobs", label: "Job Center", meta: "ops", run: () => openJobs() },
      { id: "notes", label: "Notifications", meta: "ops", run: () => openNotes() },
      { id: "tech", label: "Technical View", meta: "eng", run: () => showView("engineering") },
      { id: "agent", label: "Agent Studio / Dev Assistant", meta: "eng", run: () => { showEngPanel("agent"); showView("engineering"); } },
      { id: "kg", label: "Knowledge Graph Explorer", meta: "eng", run: () => { showEngPanel("kg"); showView("engineering"); } },
      { id: "workflow", label: "Workflow Studio", meta: "eng", run: () => { showEngPanel("workflow"); showView("engineering"); } },
      { id: "dist", label: "Distributed OS View", meta: "eng", run: () => { showEngPanel("dist"); showView("engineering"); } },
    ];
    function closeCmdk() {
      document.getElementById("cmdk").classList.remove("on");
    }
    function openCmdk() {
      const box = document.getElementById("cmdk");
      box.classList.add("on");
      const list = document.getElementById("cmdkList");
      clearNode(list);
      CMD_ITEMS.forEach((it) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cmdk-item";
        b.setAttribute("data-action-id", "cmd_" + it.id);
        appendEl(b, "span", null, it.label);
        appendEl(b, "span", "meta", it.meta);
        b.onclick = () => { closeCmdk(); it.run(); };
        list.appendChild(b);
      });
      document.getElementById("cmdkInput").value = "";
      document.getElementById("cmdkInput").focus();
    }
    async function openJobs() {
      showView("jobs");
      const root = document.getElementById("jobCenterRoot");
      if (root) {
        clearNode(root);
        createLoadingState(root, "Loading jobs…");
      }
      try {
        const [jobsRes, engineRes, healthRes] = await Promise.allSettled([
          fetch(CONTROL + "/v1/os/jobs").then((r) => r.json()),
          fetch(CONTROL + "/v1/os/job-engine/status").then((r) => r.json()),
          fetch(CONTROL + "/v1/jobs/health").then((r) => (r.ok ? r.json() : null)),
        ]);
        const jobs = jobsRes.status === "fulfilled" ? jobsRes.value : { jobs: [] };
        const engine = engineRes.status === "fulfilled" ? engineRes.value : null;
        const health = healthRes.status === "fulfilled" ? healthRes.value : null;
        const merged = (jobs.canonical || jobs.jobs || []).map((c, i) => {
          const raw = (jobs.jobs || [])[i];
          if (raw && c && c.jobId === raw.jobId) {
            return { ...raw, lifecycleState: c.state, cf11State: c.cf11State, correlationId: c.correlationId };
          }
          return c || raw;
        });
        renderJobCenter({ jobs: merged.length ? merged : jobs.jobs || [], engine, health });
      } catch (err) {
        if (root) {
          clearNode(root);
          createErrorState(root, String(err && err.message ? err.message : err));
        }
      }
    }
    const jobRefreshBtn = document.getElementById("jobRefreshBtn");
    if (jobRefreshBtn) jobRefreshBtn.onclick = () => openJobs();
    async function openNotes() {
      showView("home");
      try {
        const n = await fetch(CONTROL + "/v1/os/notifications").then((r) => r.json());
        document.getElementById("homeSub").textContent =
          "Notifications: " + ((n.notifications && n.notifications.length) || 0);
      } catch {
        /* */
      }
    }
    const btnCmd = document.getElementById("btnCmd");
    const btnJobs = document.getElementById("btnJobs");
    const btnNotes = document.getElementById("btnNotes");
    if (btnCmd) btnCmd.onclick = openCmdk;
    if (btnJobs) btnJobs.onclick = openJobs;
    if (btnNotes) btnNotes.onclick = openNotes;
    const btnSettings = document.getElementById("btnSettings");
    if (btnSettings) btnSettings.onclick = () => showView("settings");
    const workWorkflowBtn = document.getElementById("workWorkflowBtn");
    if (workWorkflowBtn) {
      workWorkflowBtn.onclick = () => {
        showEngPanel("workflow");
        showView("engineering");
      };
    }
    const workAgentBtn = document.getElementById("workAgentBtn");
    if (workAgentBtn) {
      workAgentBtn.onclick = () => {
        showEngPanel("agent");
        showView("engineering");
      };
    }
    const langSelect = document.getElementById("langSelect");
    if (langSelect) {
      langSelect.value = productPrefs.locale;
      langSelect.onchange = () => commitProductPrefs({ locale: langSelect.value });
    }
    const cmdkEl = document.getElementById("cmdk");
    if (cmdkEl) {
      cmdkEl.addEventListener("click", (e) => {
        if (e.target.id === "cmdk") closeCmdk();
      });
    }
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openCmdk();
      }
      if (e.key === "Escape") closeCmdk();
    });
    const cmdkInput = document.getElementById("cmdkInput");
    if (cmdkInput) {
      cmdkInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const q = e.target.value.trim().toLowerCase();
          const hit = CMD_ITEMS.find((it) => it.label.toLowerCase().includes(q) || it.id === q) || CMD_ITEMS[0];
          closeCmdk();
          hit.run();
        }
      });
    }

    document.getElementById("resultActions").addEventListener("click", (e) => {
      const act = e.target && e.target.dataset && e.target.dataset.act;
      if (!act) return;
      if (act === "tech") setMode("tech");
      if (act === "evidence" || act === "lineage") { setMode("tech"); showView("evidence"); }
      if (act === "explain") {
        document.getElementById("status").textContent =
          lastData ? ("Explain: " + (lastData.governanceDecision?.explanation || lastData.riskDecision?.reason || "see Technical")) : "";
      }
      if (act === "scenario") {
        document.getElementById("status").textContent = "Run Scenario: adjust horizon/size and Analyze again (same pipeline).";
      }
      if (act === "compare") {
        showView("analysis");
        document.getElementById("status").textContent = "Compare: Analysis scenario tab (ALPHA — not Monte Carlo).";
      }
    });

    async function refresh() {
      const verdict = document.getElementById("verdict");
      try {
        const settled = await Promise.allSettled([
          api("/readyz"),
          api("/v1/system/snapshot"),
          api("/v1/flow"),
          api("/api/system/health"),
          api("/api/system/startup-readiness"),
          fetch(CONTROL + "/v1/system/persistence-matrix").then((r) => (r.ok ? r.json() : { optionalError: "HTTP " + r.status })),
          fetch(CONTROL + "/v1/persistence/health").then((r) => (r.ok ? r.json() : { optionalError: "HTTP " + r.status })),
          fetch(CONTROL + "/v1/models/validation").then((r) => (r.ok ? r.json() : { optionalError: "HTTP " + r.status })),
          fetch(CONTROL + "/v1/os/jobs").then((r) => (r.ok ? r.json() : { jobs: [] })),
          fetch(CONTROL + "/v1/os/job-engine/status").then((r) => (r.ok ? r.json() : null)),
          fetch(CONTROL + "/v1/compiler/health").then((r) => (r.ok ? r.json() : { optionalError: "HTTP " + r.status })),
          fetch(CONTROL + "/v1/ecl/infra").then((r) => (r.ok ? r.json() : { optionalError: "HTTP " + r.status })),
        ]);
        const [readyR, snapR, flowR, healthR, readinessR, persistR, persistenceHealthR, validationR, jobsR, engineR, compilerHealthR, infraR] = settled;
        if (readyR.status !== "fulfilled") {
          throw readyR.reason || new Error("readyz_failed");
        }
        const ready = readyR.value;
        const snap = snapR.status === "fulfilled" ? snapR.value : { runs: null, optionalError: String(snapR.reason) };
        const flow = flowR.status === "fulfilled" ? flowR.value : {};
        const health = healthR.status === "fulfilled" ? healthR.value : { optionalError: String(healthR.reason) };
        const readiness =
          readinessR.status === "fulfilled"
            ? readinessR.value
            : { optionalError: String(readinessR.reason) };
        const persistence = persistR.status === "fulfilled" ? persistR.value : { optionalError: String(persistR.reason) };
        const persistenceHealth =
          persistenceHealthR.status === "fulfilled"
            ? persistenceHealthR.value
            : { optionalError: String(persistenceHealthR.reason) };
        const validation = validationR.status === "fulfilled" ? validationR.value : { optionalError: String(validationR.reason) };
        const jobs = jobsR.status === "fulfilled" ? jobsR.value : { jobs: [] };
        const jobEngine = engineR.status === "fulfilled" ? engineR.value : null;
        const compilerHealth =
          compilerHealthR.status === "fulfilled" ? compilerHealthR.value : { optionalError: String(compilerHealthR.reason) };
        const enterpriseHooks =
          infraR && infraR.status === "fulfilled" ? infraR.value : { optionalError: String(infraR && infraR.reason) };

        document.getElementById("flow").textContent =
          "SCI OS · " + (flow.arrow ? "pipeline live" : "foundation");
        const ok = !!ready.ready;
        const degraded =
          ready.degraded === true ||
          ready.verdict === "DEGRADED" ||
          (ready.optionalInfra && ready.optionalInfra !== "OK") ||
          snapR.status !== "fulfilled" ||
          healthR.status !== "fulfilled" ||
          readinessR.status !== "fulfilled";

        if (ok && degraded) {
          verdict.textContent = "DEGRADED";
          verdict.className = "badge warn";
        } else if (ok) {
          verdict.textContent = "CORE LIVE (ALPHA)";
          verdict.className = "badge ok";
        } else {
          verdict.textContent = "UNREACHABLE";
          verdict.className = "badge err";
        }

        const optionalFail = settled
          .slice(1)
          .filter((r) => r.status === "rejected")
          .map((r) => String(r.reason && r.reason.message ? r.reason.message : r.reason));
        document.getElementById("banner").style.display = ok ? "none" : "block";
        document.getElementById("banner").textContent = ok
          ? ""
          : "Backend not ready. Recovery Shell if startup failed. No silent data repair.";
        if (ok && optionalFail.length) {
          /* keep Home alive; optional diagnostics only */
        }
        const compilerStatus =
          (lastCompiled && lastCompiled.compilerStatus) ||
          (document.getElementById("expStatus") && document.getElementById("expStatus").textContent.replace(/^EXPERIENCE · /, "")) ||
          "UNKNOWN";
        lastSystemBundle = {
          ready,
          snap,
          flow,
          health,
          readiness,
          persistence,
          persistenceHealth,
          validation,
          jobs,
          jobEngine,
          compilerHealth,
          enterpriseHooks,
          compilerPipeline: compilerHealth.pipelineModule || null,
          compilerVersion: compilerHealth.compilerVersion || (lastCompiled && lastCompiled.compilerVersion) || null,
          verdict: verdict.textContent,
          degraded,
          cpReachable: true,
          executionMode: ready.executionMode || "SIMULATION_ONLY",
          compilerStatus,
        };
        renderSystemDashboard(lastSystemBundle);
        renderSystemHealthCharts(document.getElementById("sysHealthRoot"), lastSystemBundle);
        paintContext("home", {
          cockpitVerdict: ok ? (degraded ? "DEGRADED" : "ALPHA_LIVE") : "UNREACHABLE",
          degradedNote: degraded
            ? "Optional diagnostics degraded — Experience Compiler or auxiliary endpoints may be unreachable."
            : optionalFail.length
              ? "Partial API failures: " + optionalFail.join("; ")
              : "",
        });
        show("healthPre", { health, readiness, snapshot: snap, optionalFail, persistence, validation });
        show("engDash", { ready, runs: snap.runs, flow });
        loadEclDilArchitecture();
        return { ok, degraded, verdict: verdict.textContent };
      } catch (e) {
        verdict.textContent = "UNREACHABLE";
        verdict.className = "badge err";
        document.getElementById("banner").style.display = "block";
        document.getElementById("banner").textContent =
          "Control plane unreachable at " + CONTROL + " — Recovery Shell available if configured";
        lastSystemBundle = { cpReachable: false, degraded: true, verdict: "UNREACHABLE", executionMode: "SIMULATION_ONLY", compilerStatus: "UNREACHABLE" };
        paintContext("home", {
          cockpitVerdict: "UNREACHABLE",
          degradedNote: "Control plane unreachable — professional panels show last known or empty state only.",
        });
        const sysHealth = document.getElementById("sysHealthRoot");
        if (sysHealth) {
          clearNode(sysHealth);
          createErrorState(sysHealth, "Control plane unreachable at " + CONTROL);
        }
        throw e;
      }
    }

    async function bootstrapUi() {
      const verdict = document.getElementById("verdict");
      const homeSub = document.getElementById("homeSub");
      applyProductPrefs(productPrefs);
      applyChromeI18n(productPrefs.locale);
      try {
        verdict.textContent = "CONNECTING";
        verdict.className = "badge warn";
        const [systemResult, homeResult] = await Promise.allSettled([
          refresh(),
          loadHome(),
        ]);
        if (homeResult.status === "rejected" && systemResult.status === "rejected") {
          verdict.textContent = "UNREACHABLE";
          verdict.className = "badge err";
          if (homeSub && /Loading home/i.test(homeSub.textContent)) {
            homeSub.textContent =
              "SCI OS UI initialization failed: control plane unreachable";
          }
          return;
        }
        if (homeResult.status === "rejected") {
          if (verdict.textContent === "UNKNOWN" || verdict.textContent === "CONNECTING") {
            verdict.textContent = "DEGRADED";
            verdict.className = "badge warn";
          }
          if (homeSub && /Loading home/i.test(homeSub.textContent)) {
            homeSub.textContent =
              "SCI OS UI initialization failed: " +
              String(
                homeResult.reason && homeResult.reason.message
                  ? homeResult.reason.message
                  : homeResult.reason
              );
          }
          return;
        }
        if (systemResult.status === "rejected") {
          verdict.textContent = "DEGRADED";
          verdict.className = "badge warn";
        }
      } catch (error) {
        verdict.textContent = "UNREACHABLE";
        verdict.className = "badge err";
        if (homeSub) {
          homeSub.textContent =
            "SCI OS UI initialization failed: " +
            String(error && error.message ? error.message : error);
        }
      }
    }

    (function initRole() {
      const s = loadSession();
      if (s.roleId) currentRoleId = s.roleId;
      if (s.inspectedCatalogId) inspectedCatalogId = s.inspectedCatalogId;
      const sel = document.getElementById("roleSelect");
      const rh = document.getElementById("roleHint");
      if (sel) {
        populateRoleSelect(sel, currentRoleId);
        if (rh) rh.textContent = rolePresentationHint(currentRoleId);
        sel.onchange = async () => {
          currentRoleId = sel.value;
          if (rh) rh.textContent = rolePresentationHint(currentRoleId);
          saveSession({ roleId: currentRoleId });
          paintDomainAnalogs();
          bindHeroV3(currentRoleId);
          try {
            const compiled = await fetchCompiledExperience(currentRoleId);
            applyCompiledExperience(compiled);
            fetch(CONTROL + "/v1/os/session", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ sessionId: "default", roleId: currentRoleId }),
            }).catch(() => {});
          } catch (e) {
            showExperienceDegraded(String(e && e.message ? e.message : e));
          }
        };
      }
      fetch(CONTROL + "/v1/ecl/professional")
        .then((r) => (r.ok ? r.json() : null))
        .then((payload) => {
          if (!payload) return;
          const data = payload.data || payload;
          lastProfessionExpansion = data.moduleExpansion || lastProfessionExpansion;
          lastOsBlueprints = data.osBlueprints || lastOsBlueprints;
          lastPrecisionUpgrade = data.precisionUpgrade || lastPrecisionUpgrade;
          lastCyberBridge = data.cyberBridge || lastCyberBridge;
          lastActivationReview = data.activationReview || lastActivationReview;
          lastEnterprisePrep = data.enterprisePrep || lastEnterprisePrep;
          paintDomainAnalogs();
        })
        .catch(() => paintDomainAnalogs());
      paintDomainAnalogs();
    })();
    bootstrapUi().then(function () {
      applyHashView();
    });
    renderDecisionProfessional(null);
    renderEvidenceProfessional(null);
    setInterval(refresh, 8000);
    setInterval(loadHome, 15000);

    (function restoreSession() {
      const s = loadSession();
      if (s.instrumentId) document.getElementById("instrumentId").value = s.instrumentId;
      if (s.lastRunSummary) {
        document.getElementById("status").textContent =
          "Restored session · last run " + (s.lastRunId || "") + " · " + (s.lastRunSummary || "");
      }
      if (s.viewMode === "tech") setMode("tech");
    })();

    document.getElementById("approvalApprove").onclick = () => {
      if (!lastData || document.getElementById("approvalApprove").disabled) return;
      approvalState = "approved_simulation_local";
      document.getElementById("approvalStatus").textContent =
        "LOCAL REVIEW STATE: approved simulation path for " + (lastData.runId || "") +
        " — still SIMULATION_ONLY; not durable governed approval. " + new Date().toISOString();
      document.getElementById("approvalStatus").style.color = "var(--ok)";
      saveSession({
        approvalState,
        lastRunId: lastData.runId,
        lastApprovalAt: new Date().toISOString(),
        reviewKind: "LOCAL_REVIEW_STATE",
      });
    };
    document.getElementById("approvalReject").onclick = () => {
      approvalState = "rejected_local";
      document.getElementById("approvalStatus").textContent =
        "LOCAL REVIEW STATE: rejected — NO live or simulation continuation from this proposal. Not audit-durable.";
      document.getElementById("approvalStatus").style.color = "var(--red)";
      saveSession({ approvalState, lastRunId: lastData && lastData.runId, reviewKind: "LOCAL_REVIEW_STATE" });
    };
    document.getElementById("approvalHold").onclick = () => {
      approvalState = "hold_no_action_local";
      document.getElementById("approvalStatus").textContent =
        "LOCAL REVIEW STATE: NO_ACTION — valid outcome. Not DecisionAction API.";
      document.getElementById("approvalStatus").style.color = "var(--warn)";
      saveSession({ approvalState, lastRunId: lastData && lastData.runId, reviewKind: "LOCAL_REVIEW_STATE" });
    };

    document.getElementById("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const go = document.getElementById("go");
      const statusEl = document.getElementById("status");
      go.disabled = true;
      statusEl.textContent = "Running analysis…";
      setAnalyzePanelsState("loading", "Running analysis…");
      const tick = pipeRunning();
      try {
        const instrumentId = document.getElementById("instrumentId").value.trim();
        // Stable for in-flight retries / double-submit; cleared when request finishes.
        if (!window.__sciAnalyzeIdem) {
          window.__sciAnalyzeIdem =
            "gw1:" + instrumentId + ":" + Date.now() + ":" + Math.random().toString(36).slice(2, 10);
        }
        const idempotencyKey = window.__sciAnalyzeIdem;
        const res = await fetch(CONTROL + "/api/vertical-slice/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            instrumentId,
            horizonSec: Number(document.getElementById("horizonSec").value),
            size: Number(document.getElementById("size").value),
            idempotencyKey,
            actor: (actorEnvelope && actorEnvelope.actorId) || "cockpit-user",
            role: currentRoleId,
            roleId: currentRoleId,
            sessionId: "default",
            actorContext: actorEnvelope,
          }),
        });
        const data = await res.json();
        lastData = data;
        clearInterval(tick);
        pipeDone();
        show("normalized", data.normalizedEvent);
        show("features", data.pitFeatures);
        show("prediction", data.predictionEnvelope);
        show("risk", data.riskDecision);
        show("decision", data.governanceDecision);
        show("execution", data.executionOutcome);
        show("lineagePre", data.lineage);
        renderProfessional(data);
        const summary = res.ok
          ? "OK " + data.runId + " — " + (data.status || data.governanceDecision?.verdict)
          : "HTTP " + res.status + " — " + (data.error || "see Technical details");
        statusEl.textContent = summary;
        const recents = (loadSession().recentSearches || []).filter((x) => x !== instrumentId);
        recents.unshift(instrumentId);
        saveSession({
          instrumentId,
          lastRunId: data.runId,
          lastRunSummary: summary,
          recentSearches: recents.slice(0, 12),
          lastEntity: instrumentId,
          viewMode: document.getElementById("modePro").classList.contains("on") ? "pro" : "tech",
        });
        loadHome();
      } catch (err) {
        clearInterval(tick);
        pipeClear();
        setAnalyzePanelsState("error", String(err && err.message ? err.message : err));
        statusEl.textContent =
          "WHAT FAILED: request error. AFFECTED: analysis. DATA SAFE: yes (no write). TRY: check System readiness. DETAIL: " +
          String(err && err.message ? err.message : err);
      } finally {
        go.disabled = false;
        window.__sciAnalyzeIdem = null;
      }
    });
  </script>
</body>
</html>
`;

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }

  if (req.method === "GET" && url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        shell: true,
        service: "@scios/cockpit-ui",
        controlUrl: CONTROL_URL,
        ux: "4.0-experience",
        // Machine-checkable renderer provenance; bundling erases it from the HTML.
        professionalUx: {
          contract: PROFESSIONAL_UX_CONTRACT,
          sourceId: PROFESSIONAL_UX_SOURCE_ID,
        },
      })
    );
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, BIND, () => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: "cockpit-ui",
      level: "info",
      message: "listening",
      port: PORT,
      bind: BIND,
      controlUrl: CONTROL_URL,
      ux: "4.0-experience",
    })
  );
});
