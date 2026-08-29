import { createServer } from "node:http";
import { sciTokens } from "@scios/design-system";
import { SAFE_DOM_BROWSER_SOURCE } from "./safe-dom.js";
import { PRIMITIVES_BROWSER_SOURCE } from "./components/primitives.js";
import { PROFESSIONAL_UX_BROWSER_SOURCE } from "./professional-ux.js";
import { WORKSPACE_RENDERER_BROWSER_SOURCE } from "./workspace/WorkspaceRenderer.js";

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
      --sci-space-1:${T.space[1]}; --sci-space-2:${T.space[2]}; --sci-space-3:${T.space[3]}; --sci-space-4:${T.space[4]};
      --sci-radius:${T.radius}; --sci-font:${T.typography.fontFamily};
      --sci-surface:${T.color.surface}; --sci-surface-muted:${T.color.surfaceMuted}; --sci-border:var(--fog);
      --sci-focus:${T.focus};
      --sci-brand-size:${T.typography.brandSize};
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
    .shell-tools { display:flex; gap:0.35rem; align-items:center; }
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
      letter-spacing:0.04em; text-transform:uppercase; color:var(--graphite); }
    nav.primary button.on { color:var(--navy); border-bottom:2px solid var(--navy); font-weight:600; }
    nav.eng { display:flex; gap:0.15rem; padding:0.25rem 1.5rem; background:#fafbfc; border-bottom:1px solid var(--fog); flex-wrap:wrap; }
    nav.eng button.on { color:var(--navy); border-bottom:2px solid var(--graphite); }
    main { max-width:1180px; margin:0 auto; padding:1.1rem 1.5rem 3rem; }
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
    .pro-grid { display:grid; gap:0.65rem; }
    .pro-card { background:#fff; border:1px solid var(--fog); padding:0.85rem 1rem; }
    .pro-card[data-exp-hidden="1"] { display:none; }
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
  </style>
</head>
<body>
  <header>
    <div class="brand">
    <h1>SCI OS ×10</h1>
      <p id="flow">Forensic intelligence OS</p>
    </div>
    <div class="searchwrap">
      <input id="globalSearch" type="search" placeholder="Search anything… e.g. AAPL" aria-label="Global search" />
    </div>
    <div class="shell-tools">
      <button type="button" class="ghost" id="btnCmd" data-action-id="open_command_palette" title="Command palette (Ctrl+K)">Command</button>
      <button type="button" class="ghost" id="btnJobs" data-action-id="open_jobs">Jobs</button>
      <button type="button" class="ghost" id="btnNotes" data-action-id="open_notifications">Alerts</button>
      <div id="verdict" class="badge warn">UNKNOWN</div>
    </div>
  </header>
  <div id="contextHeaderBar" class="context-bar" aria-live="polite"></div>
  <div id="cmdk" class="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="cmdk-box">
      <label class="sr-only" for="cmdkInput">Command</label>
      <input id="cmdkInput" type="search" placeholder="Go to… search, analyze, evidence, system" autocomplete="off" />
      <div class="cmdk-list" id="cmdkList"></div>
    </div>
  </div>
  <nav class="primary" aria-label="Primary">
    <button class="on" data-v="home" data-action-id="nav_home">Home</button>
    <button data-v="work">Work</button>
    <button data-v="entities">Entities</button>
    <button data-v="slice">Analyze</button>
    <button data-v="decisions">Decisions</button>
    <button data-v="evidence">Evidence</button>
    <button data-v="system">System</button>
    <button data-v="engineering">Engineering</button>
  </nav>
  <nav class="eng" id="engNav" hidden aria-label="Engineering">
    <button data-eng="dash">Technical cockpit</button>
    <button data-eng="lineage">Lineage Explorer</button>
    <button data-eng="risk">Risk / Gov Studio</button>
    <button data-eng="exec">Execution Monitor</button>
    <button data-eng="health">System Health</button>
  </nav>
  <main>
    <div class="banner" id="banner"></div>

    <div class="view on" id="home">
      <h2 class="homeHeadline" id="homeHeadline">What needs your attention?</h2>
      <p class="sub" id="homeSub">Loading home…</p>
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
      <h2 class="homeHeadline">My Work</h2>
      <p class="sub">Open analyses, tasks, and saved context.</p>
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
        <div class="pro-grid" id="proGrid">
          <div class="pro-card" data-exp-module="ContextHeader" id="modContextHeader"><p class="level">L1 · What happened?</p><h3>Situation</h3><div class="val" id="proWhat">NO ANALYSIS YET</div><p class="hint empty" id="proWhatHint">Run an analysis to generate prediction, risk and decision information.</p></div>
          <div class="pro-card" data-exp-module="PredictionPanel" id="modPredictionPanel"><p class="level">L2–L3 · Meaning & next</p><h3>Expected outcome</h3><div class="val" id="proCertain">—</div><p class="hint" id="proCertainHint"></p><p class="model-truth" id="predModelTruth">MODEL · FOUNDATION · ALPHA · UNVALIDATED</p></div>
          <div class="pro-card" data-exp-module="UncertaintyPanel" id="modUncertaintyPanel"><p class="level">L3 · Uncertainty</p><h3>Confidence & calibration</h3><div class="val" id="proUncertainty">—</div><p class="hint" id="proUncertaintyHint">No calibration object — treat as NON-PRODUCTION science.</p><p class="model-truth" id="uncertaintyModelTruth">MODEL · FOUNDATION · ALPHA · UNVALIDATED</p></div>
          <div class="pro-card" data-exp-module="RiskPanel" id="modRiskPanel"><p class="level">L4 · Risks</p><h3>What is the risk?</h3><div class="val" id="proRisk">—</div><p class="hint" id="proRiskHint"></p><p class="model-truth" id="riskModelTruth">MODEL · FOUNDATION · ALPHA · UNVALIDATED</p></div>
          <div class="pro-card" data-exp-module="DecisionPanel" id="modDecisionPanel"><p class="level">L5 · Action</p><h3>Recommended next step</h3><div class="val" id="proDecision">—</div><p class="hint" id="proDecisionHint"></p></div>
          <div class="pro-card" data-exp-module="SimulationPanel" id="modSimulationPanel"><p class="level">L5 · Simulation</p><h3>Simulation outcome</h3><div class="val" id="proExec">—</div><p class="hint" id="proExecHint">SIMULATION_ONLY — no live money.</p></div>
          <div class="pro-card" data-exp-module="EvidencePanel" id="modEvidencePanel"><p class="level">L6–L7 · Why / Evidence</p><h3>Evidence</h3><div class="val" id="proEvidence">—</div><p class="hint">Open Technical / Evidence or Full Lineage for provenance.</p></div>
          <div class="pro-card" data-exp-module="LineagePanel" id="modLineagePanel"><p class="level">L7 · Lineage</p><h3>Lineage integrity</h3><div class="val" id="proLineage">—</div><p class="hint" id="proLineageHint">Hash recompute + prevHash when verified by Control Plane.</p></div>
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

    <div class="view" id="decisions">
      <h2 class="homeHeadline">Decisions</h2>
      <p class="sub">Governance and risk outcomes from recent analyses.</p>
      <div class="card" id="decisionsProRoot"></div>
      <details class="card" style="margin-top:0.75rem"><summary>Technical JSON</summary><pre id="decisionsPre">Run Analyze to populate decisions.</pre></details>
    </div>

    <div class="view" id="evidence">
      <h2 class="homeHeadline">Evidence</h2>
      <p class="sub">Lineage and provenance for the latest analysis.</p>
      <div class="card" id="evidenceProRoot"></div>
      <details class="card" style="margin-top:0.75rem"><summary>Technical JSON</summary><pre id="lineagePre">Run a slice first.</pre></details>
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
      <h2 class="homeHeadline">System</h2>
      <p class="sub">Readiness and foundation status — derived from live control plane APIs.</p>
      <div class="grid">
        <div class="card" id="sysHealthRoot"></div>
        <div class="card" id="sysReadinessRoot"></div>
        <div class="card" id="sysWorkerRoot"></div>
        <div class="card" id="sysPersistenceRoot"></div>
        <div class="card" id="sysValidationRoot"></div>
        <div class="card" id="sysRunsRoot"></div>
        <div class="card"><h2>Pipeline</h2><div class="pipe" id="dashPipe"></div></div>
      </div>
    </div>

    <div class="view" id="engineering">
      <p class="sub">Technical / Evidence view — engineering surfaces preserved.</p>
      <div id="engPanel">
        <div class="eng-section" data-eng-panel="dash"><div class="card"><h2>Technical cockpit</h2><pre id="engDash">Open sub-views above.</pre></div></div>
        <div class="eng-section" data-eng-panel="risk" hidden><div class="card"><h2>Risk / Gov</h2><pre id="riskStudio">—</pre></div></div>
        <div class="eng-section" data-eng-panel="exec" hidden><div class="card"><h2>Execution</h2><pre id="execMon">SIMULATION_ONLY — no live money.</pre></div></div>
        <div class="eng-section" data-eng-panel="lineage" hidden><div class="card"><h2>Lineage Explorer</h2><pre id="engLineagePre">Run Analyze to populate lineage JSON.</pre></div></div>
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
    let actorEnvelope = null;
    let lastSystemBundle = null;
${SAFE_DOM_BROWSER_SOURCE}
${PRIMITIVES_BROWSER_SOURCE}
${PROFESSIONAL_UX_BROWSER_SOURCE}
${WORKSPACE_RENDERER_BROWSER_SOURCE}

    const KNOWN_MODULES = [
      "ContextHeader",
      "PredictionPanel",
      "UncertaintyPanel",
      "RiskPanel",
      "DecisionPanel",
      "SimulationPanel",
      "EvidencePanel",
      "LineagePanel",
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
      } catch (_) {}
      return next;
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
        st.textContent = "EXPERIENCE · " + (compiled.compilerStatus || "UNKNOWN");
        st.className = "badge ok";
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

    function showView(id) {
      document.querySelectorAll("main .view").forEach((v) => v.classList.toggle("on", v.id === id));
      document.querySelectorAll("nav.primary button").forEach((b) => {
        b.classList.toggle("on", b.dataset.v === id || (id === "searchResults" && b.dataset.v === "entities"));
      });
      const eng = document.getElementById("engNav");
      eng.hidden = id !== "engineering";
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
    }

    async function loadHome() {
      const homeSub = document.getElementById("homeSub");
      try {
        const roleSel = document.getElementById("roleSelect");
        if (roleSel && roleSel.value) currentRoleId = roleSel.value;
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
        document.getElementById("homeHeadline").textContent =
          home.headline || "What needs your attention?";
        const a = home.attention || {};
        homeSub.textContent =
          (a.recentAnalyses || 0) + " recent analyses · " +
          (a.notifications || 0) + " notifications · " +
          (a.systemNote || "");

        const cw = document.getElementById("compiledWorkspace");
        if (compilerResult.status === "fulfilled") {
          const compiled = compilerResult.value;
          if (compiled && (compiled.compilerStatus === "RUNTIME_MOUNTED" || compiled.output)) {
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
        const cells = [
          { t: "My Work", body: (s.myWork || []).map((w) => w.title || w.workspaceId).join(", ") || "Home workspace" },
          { t: "Analyses", body: (s.analyses || []).slice(0, 5).map((x) => (x.instrumentId || "?") + " · " + (x.status || "")).join("\\n") || "NO ANALYSIS YET — open Analyze." },
          { t: "Risks", body: (s.risks || []).length ? (s.risks.length + " rejected paths") : "No rejected risks in session" },
          { t: "Cases", body: "No open cases in this ALPHA session" },
          { t: "Decisions", body: (s.pendingDecisions || []).length + " pending" },
          { t: "System Status", body: (s.systemStatus && (s.systemStatus.verdict || s.systemStatus.ready)) ? String(s.systemStatus.verdict || s.systemStatus.ready) : "Open System view for live health" },
        ];
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
              "Run Analyze to generate prediction, risk and decision information."
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
        renderContextHeader({
          executionMode: "SIMULATION_ONLY",
          cpReachable: false,
          cpVerdict: "UNREACHABLE",
          compilerStatus: "DEGRADED",
          roleId: currentRoleId,
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
      { id: "evidence", label: "Open Evidence", meta: "nav", run: () => showView("evidence") },
      { id: "system", label: "System status", meta: "nav", run: () => showView("system") },
      { id: "jobs", label: "Job Center", meta: "ops", run: () => openJobs() },
      { id: "notes", label: "Notifications", meta: "ops", run: () => openNotes() },
      { id: "tech", label: "Technical View", meta: "eng", run: () => showView("engineering") },
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
        const [jobsRes, engineRes] = await Promise.allSettled([
          fetch(CONTROL + "/v1/os/jobs").then((r) => r.json()),
          fetch(CONTROL + "/v1/os/job-engine/status").then((r) => r.json()),
        ]);
        const jobs = jobsRes.status === "fulfilled" ? jobsRes.value : { jobs: [] };
        const engine = engineRes.status === "fulfilled" ? engineRes.value : null;
        renderJobCenter({ jobs: jobs.jobs || [], engine });
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
        document.getElementById("status").textContent = "Compare: open another entity from Search (ALPHA — side-by-side pending).";
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
          fetch(CONTROL + "/v1/models/validation").then((r) => (r.ok ? r.json() : { optionalError: "HTTP " + r.status })),
          fetch(CONTROL + "/v1/os/jobs").then((r) => (r.ok ? r.json() : { jobs: [] })),
          fetch(CONTROL + "/v1/os/job-engine/status").then((r) => (r.ok ? r.json() : null)),
        ]);
        const [readyR, snapR, flowR, healthR, readinessR, persistR, validationR, jobsR, engineR] = settled;
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
        const validation = validationR.status === "fulfilled" ? validationR.value : { optionalError: String(validationR.reason) };
        const jobs = jobsR.status === "fulfilled" ? jobsR.value : { jobs: [] };
        const jobEngine = engineR.status === "fulfilled" ? engineR.value : null;

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
          verdict.textContent = "CORE READY (ALPHA)";
          verdict.className = "badge ok";
        } else {
          verdict.textContent = "NOT READY";
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
          validation,
          jobs,
          jobEngine,
          verdict: verdict.textContent,
          degraded,
          cpReachable: true,
          executionMode: ready.executionMode || "SIMULATION_ONLY",
          compilerStatus,
        };
        renderSystemDashboard(lastSystemBundle);
        renderContextHeader({
          executionMode: lastSystemBundle.executionMode,
          cpReachable: true,
          cpVerdict: verdict.textContent,
          compilerStatus,
          roleId: currentRoleId,
          cockpitVerdict: ok ? (degraded ? "DEGRADED" : "READY") : "NOT READY",
          degradedNote: degraded
            ? "Optional diagnostics degraded — Experience Compiler or auxiliary endpoints may be unreachable."
            : optionalFail.length
              ? "Partial API failures: " + optionalFail.join("; ")
              : "",
        });
        show("healthPre", { health, readiness, snapshot: snap, optionalFail, persistence, validation });
        show("engDash", { ready, runs: snap.runs, flow });
        return { ok, degraded, verdict: verdict.textContent };
      } catch (e) {
        verdict.textContent = "UNREACHABLE";
        verdict.className = "badge err";
        document.getElementById("banner").style.display = "block";
        document.getElementById("banner").textContent =
          "Control plane unreachable at " + CONTROL + " — Recovery Shell available if configured";
        renderContextHeader({
          executionMode: "SIMULATION_ONLY",
          cpReachable: false,
          cpVerdict: "UNREACHABLE",
          compilerStatus: "UNREACHABLE",
          roleId: currentRoleId,
          cockpitVerdict: "DEGRADED",
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
      const sel = document.getElementById("roleSelect");
      const rh = document.getElementById("roleHint");
      if (sel) {
        populateRoleSelect(sel, currentRoleId);
        if (rh) rh.textContent = rolePresentationHint(currentRoleId);
        sel.onchange = async () => {
          currentRoleId = sel.value;
          if (rh) rh.textContent = rolePresentationHint(currentRoleId);
          saveSession({ roleId: currentRoleId });
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
    })();
    bootstrapUi();
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
