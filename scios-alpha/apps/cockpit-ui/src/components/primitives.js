/**
 * Professional UI primitives — browser-safe DOM helpers.
 * Inlined into Cockpit HTML (no bundler in Alpha install path).
 * ALPHA_NON_PRODUCTION
 */

export function createPanel(parent, opts = {}) {
  const d = document.createElement("div");
  d.className = "pro-card" + (opts.partial ? " partial-mod" : "");
  if (opts.moduleId) d.setAttribute("data-exp-module", opts.moduleId);
  if (opts.level) {
    const p = document.createElement("p");
    p.className = "level";
    p.textContent = opts.level;
    d.appendChild(p);
  }
  if (opts.title) {
    const h = document.createElement("h3");
    h.textContent = opts.title;
    d.appendChild(h);
  }
  if (opts.value != null) {
    const v = document.createElement("div");
    v.className = "val";
    v.textContent = String(opts.value);
    d.appendChild(v);
  }
  if (opts.hint) {
    const h = document.createElement("p");
    h.className = "hint";
    h.textContent = opts.hint;
    d.appendChild(h);
  }
  if (opts.state === "UNKNOWN") {
    const u = document.createElement("p");
    u.className = "model-truth";
    u.textContent = "UNKNOWN — not verified";
    d.appendChild(u);
  }
  parent.appendChild(d);
  return d;
}

export function createEmptyState(parent, message) {
  if (parent && parent.setAttribute) parent.setAttribute("aria-busy", "false");
  const d = document.createElement("div");
  d.className = "card empty";
  d.textContent = message || "NO DATA";
  parent.appendChild(d);
  return d;
}

export function createLoadingState(parent, message) {
  if (parent && parent.setAttribute) parent.setAttribute("aria-busy", "true");
  const d = document.createElement("div");
  d.className = "card";
  d.setAttribute("role", "status");
  d.textContent = message || "Loading…";
  parent.appendChild(d);
  return d;
}

export function createErrorState(parent, message) {
  if (parent && parent.setAttribute) parent.setAttribute("aria-busy", "false");
  const d = document.createElement("div");
  d.className = "card error-state";
  d.setAttribute("role", "alert");
  d.style.borderColor = "var(--red)";
  d.textContent = message || "ERROR";
  parent.appendChild(d);
  return d;
}

export function createMetricCard(parent, title, value, hint) {
  const d = createPanel(parent, { title: title, value: value, hint: hint });
  d.classList.add("sci-metric");
  return d;
}

export function createEmptyUnknown(parent, message) {
  return createEmptyState(parent, message || "UNKNOWN — no evidence");
}

export function createSciToken(parent, tone, text) {
  const el = document.createElement("span");
  el.className = "sci-token";
  el.setAttribute("data-tone", tone || "unknown");
  el.textContent = text || String(tone || "unknown").toUpperCase();
  if (parent) parent.appendChild(el);
  return el;
}

export function createSimulationBadge(parent) {
  const el = document.createElement("span");
  el.className = "sci-sim-badge";
  el.setAttribute("data-tone", "simulated");
  el.textContent = "SIMULATION_ONLY · executed=false";
  if (parent) parent.appendChild(el);
  return el;
}

export function createSciButton(parent, opts = {}) {
  const b = document.createElement("button");
  b.type = opts.type || "button";
  b.className = "sci-button" + (opts.primary ? " primary" : " ghost");
  b.textContent = opts.label || "Action";
  if (opts.disabled) b.disabled = true;
  if (opts.actionId) b.setAttribute("data-action-id", opts.actionId);
  if (parent) parent.appendChild(b);
  return b;
}

export function createSciBadge(parent, text, tone) {
  const el = document.createElement("span");
  el.className = "badge sci-badge";
  el.setAttribute("data-tone", tone || "unknown");
  el.textContent = text || "UNKNOWN";
  if (parent) parent.appendChild(el);
  return el;
}

export function createSciCard(parent, opts = {}) {
  const d = document.createElement("div");
  d.className = "pro-card sci-card";
  if (opts.span) d.setAttribute("data-span", String(opts.span));
  if (opts.tone) d.setAttribute("data-tone", opts.tone);
  if (opts.title) {
    const h = document.createElement("h3");
    h.textContent = opts.title;
    d.appendChild(h);
  }
  if (parent) parent.appendChild(d);
  return d;
}

export function createSciPanel(parent, opts = {}) {
  return createPanel(parent, opts);
}

export function createSciRibbon(parent, stages, opts = {}) {
  const host = parent || document.createElement("div");
  host.className = "sci-ribbon";
  host.setAttribute("role", "list");
  const list = stages && stages.length ? stages : [];
  const currentIndex = opts.currentIndex != null ? opts.currentIndex : -1;
  const emphasis = opts.emphasis || "";
  const kill = opts.killSwitch === true;
  host.replaceChildren();
  list.forEach((id, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sci-ribbon-step";
    b.setAttribute("role", "listitem");
    b.dataset.stage = id;
    b.disabled = true;
    b.textContent = String(id).replace(/_/g, " ");
    let status = "unknown";
    if (opts.hasAnalysis) {
      if (id === "independent_risk_gate" && kill) status = "critical";
      else if (opts.degraded && id === "calibration_uncertainty") status = "degraded";
      else if (i <= currentIndex) status = "current";
    }
    b.dataset.status = status;
    if (emphasis && id === emphasis) b.dataset.emphasis = "1";
    host.appendChild(b);
  });
  return host;
}

export function createSciGraph(parent, nodes) {
  const d = createSciCard(parent, { title: "Ontology graph" });
  d.classList.add("sci-graph");
  const rows = nodes && nodes.length ? nodes : [];
  if (!rows.length) {
    createSciToken(d, "unknown", "UNKNOWN");
    return d;
  }
  const ul = document.createElement("ul");
  rows.forEach((n) => {
    const li = document.createElement("li");
    li.textContent = (n.type || n.kind || "node") + " · " + (n.id || n.fromId || "—");
    ul.appendChild(li);
  });
  d.appendChild(ul);
  return d;
}

export function createSciTimeline(parent, events) {
  const d = createSciCard(parent, { title: "Timeline" });
  d.classList.add("sci-timeline");
  const rows = events && events.length ? events : [];
  if (!rows.length) {
    createSciToken(d, "unknown", "UNKNOWN");
    return d;
  }
  rows.forEach((ev) => {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = (ev.at || ev.publishedAt || ev.t || "—") + " · " + (ev.title || ev.id || "event");
    d.appendChild(p);
  });
  return d;
}

export function createSciChart(parent, opts = {}) {
  const d = createSciCard(parent, { title: opts.title || "Chart" });
  d.classList.add("sci-chart-host");
  if (opts.ohlc && opts.ohlcAllowed !== true) {
    createSciToken(d, "unknown", "OHLC not in family");
    return d;
  }
  if (!opts.series || !opts.series.length) {
    createSciToken(d, "unknown", "NO SERIES");
    return d;
  }
  const p = document.createElement("p");
  p.className = "hint";
  p.textContent = String(opts.series.length) + " points · simulated";
  d.appendChild(p);
  return d;
}

export function createSciEvidenceBlock(parent, items) {
  const d = createSciCard(parent, { title: "Evidence" });
  d.classList.add("sci-evidence");
  const rows = items && items.length ? items : [];
  if (!rows.length) {
    createSciToken(d, "unknown", "UNKNOWN");
    const h = document.createElement("p");
    h.className = "hint";
    h.textContent = "empty ≠ PASS";
    d.appendChild(h);
    return d;
  }
  rows.forEach((it) => {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = (it.verdict || it.status || "UNKNOWN") + " · " + (it.id || it.refId || "artifact");
    d.appendChild(p);
  });
  return d;
}

export function createSciLineageNode(parent, node) {
  const n = node || {};
  const verified = n.verified == null ? "UNKNOWN" : n.verified;
  const el = document.createElement("div");
  el.className = "sci-lineage-node";
  el.setAttribute("data-verified", String(verified));
  el.textContent = (n.stage || n.nodeId || "node") + " · verified=" + String(verified);
  if (parent) parent.appendChild(el);
  return el;
}

export function createSciDecisionGate(parent, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = "sci-decision-gate";
  wrap.setAttribute("data-tone", "proposal");
  const reject =
    opts.policyReject === true ||
    opts.verdict === "REJECT" ||
    opts.verdict === "DENY" ||
    opts.verdict === "BLOCK";
  const title = document.createElement("h3");
  title.textContent = "Decision gate · HITL";
  wrap.appendChild(title);
  const set = opts.decisionSet || [];
  const p = document.createElement("p");
  p.className = "hint";
  p.textContent = set.length ? set.join(" · ") : "UNKNOWN";
  wrap.appendChild(p);
  const approve = createSciButton(wrap, {
    label: "Approve (proposal)",
    primary: true,
    disabled: reject || opts.approveDisabled === true,
    actionId: "act.hero.approve",
  });
  createSimulationBadge(wrap);
  if (parent) parent.appendChild(wrap);
  return { wrap, approve };
}

export function createSciRiskMatrix(parent, risk) {
  const d = createSciCard(parent, { title: "Threat gate" });
  d.classList.add("sci-risk-matrix");
  const kill = risk && risk.killSwitchActive === true;
  const fail = risk && (risk.approved === false || risk.verdict === "FAIL" || risk.decision === "REJECT");
  if (kill || fail) {
    d.setAttribute("data-tone", "critical");
    d.style.transitionDuration = "0ms";
    createSciToken(d, "critical", "CRITICAL");
  } else if (!risk) {
    createSciToken(d, "unknown", "UNKNOWN");
  } else {
    createSciToken(d, "proposal", String(risk.verdict || risk.decision || "HOLD"));
  }
  if (parent && d.parentNode !== parent) parent.appendChild(d);
  return d;
}

export function createSciPredictionBand(parent, pred) {
  const d = createSciCard(parent, { title: "Forecast band" });
  d.classList.add("sci-prediction-band");
  if (pred && pred.abstain === true) {
    createSciToken(d, "unknown", "ABSTAIN");
    return d;
  }
  const interval = pred && pred.predictionInterval;
  if (!interval) {
    createSciToken(d, "unknown", "NON-PRODUCTION");
    const h = document.createElement("p");
    h.className = "hint";
    h.textContent = "missing calibration → unknown";
    d.appendChild(h);
    return d;
  }
  const p = document.createElement("p");
  p.className = "val";
  p.textContent = String(interval[0]) + " … " + String(interval[1]);
  d.appendChild(p);
  return d;
}

/** Serializable for inline Cockpit script. */
export const PRIMITIVES_BROWSER_SOURCE = [
  createPanel,
  createEmptyState,
  createLoadingState,
  createErrorState,
  createMetricCard,
  createEmptyUnknown,
  createSciToken,
  createSimulationBadge,
  createSciButton,
  createSciBadge,
  createSciCard,
  createSciPanel,
  createSciRibbon,
  createSciGraph,
  createSciTimeline,
  createSciChart,
  createSciEvidenceBlock,
  createSciLineageNode,
  createSciDecisionGate,
  createSciRiskMatrix,
  createSciPredictionBand,
]
  .map((fn) => fn.toString())
  .join("\n");
