/**
 * Analysis workbench + detective timeline — compose into Cockpit.
 * ALPHA_NON_PRODUCTION. Charts are simulated. No auto-trade.
 */

export function filterDetectiveEvents(events, filters) {
  const f = filters || {};
  const qUser = String(f.user || "").trim().toLowerCase();
  const qInst = String(f.instrument || "").trim().toLowerCase();
  const qRisk = String(f.risk || "").trim().toLowerCase();
  const from = f.from ? Date.parse(f.from) : NaN;
  const to = f.to ? Date.parse(f.to) : NaN;
  return (events || []).filter((ev) => {
    if (qUser && String(ev.user || "").toLowerCase().indexOf(qUser) < 0) return false;
    const inst = String(ev.marketId || (ev.risk && ev.risk.instrumentId) || "");
    if (qInst && inst.toLowerCase().indexOf(qInst) < 0) return false;
    if (qRisk) {
      const blob = JSON.stringify(ev.risk || {}) + " " + String(ev.reason || "") + " " + String(ev.kind || "");
      if (blob.toLowerCase().indexOf(qRisk) < 0) return false;
    }
    const t = Date.parse(ev.time || ev.at || "");
    if (Number.isFinite(from) && !(Number.isFinite(t) && t >= from)) return false;
    if (Number.isFinite(to) && !(Number.isFinite(t) && t <= to)) return false;
    return true;
  });
}

export function trackEquitySeries(track) {
  let eq = 100000;
  const pts = [{ y: eq, label: "start" }];
  (track || [])
    .filter((t) => t.outcome === 0 || t.outcome === 1)
    .slice()
    .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")))
    .forEach((t) => {
      eq += Number(t.hypotheticalPnl) || 0;
      pts.push({ y: eq, label: t.marketId || t.at });
    });
  return pts.length > 1 ? pts : [];
}

export function renderDilAnalytics(root, data) {
  const host = appendEl(root, "div", "sci-chart-row");
  const cal = (data && data.calibration) || {};
  const sim = cal.simulated || {};
  const rows = (data && data.rows) || [];
  const track = (data && data.trackRecord) || [];
  renderSciLineChart(host, "Probability / equity time series", trackEquitySeries(track), "Hypothetical equity from simulated resolves. Not a live book.");
  renderSciCalibrationChart(host, sim.bins, cal.note);
  renderSciBarChart(host, "Edge distribution", edgeHistogram(rows), "Cross-section of |edge| on this horizon. Snapshot, not a density proof.");
  renderSciRiskCurve(
    host,
    rows.map((r) => ({ y: r.risk && r.risk.riskScore, label: r.market && r.market.marketId })),
    "Risk score by market. Advisory."
  );
  const jump = appendEl(root, "div", "actions");
  const a = appendEl(jump, "button", "ghost", "Open Analysis");
  a.type = "button";
  a.setAttribute("data-action-id", "dil.open_analysis");
  a.onclick = () => {
    if (data && typeof data.onOpenAnalysis === "function") data.onOpenAnalysis();
  };
  const d = appendEl(jump, "button", "ghost", "Open Detective");
  d.type = "button";
  d.setAttribute("data-action-id", "dil.open_detective");
  d.onclick = () => {
    if (data && typeof data.onOpenDetective === "function") data.onOpenDetective();
  };
}

export function renderEclAnalytics(root, data) {
  const host = appendEl(root, "div", "sci-chart-row");
  const snap = (data && data.snapshot) || {};
  const sess = snap.session || {};
  const trades = snap.trades || [];
  const eq = [];
  let run = Number(snap.bankroll && snap.bankroll.totalEquity) || 100000;
  eq.push({ y: run });
  trades.forEach((t) => {
    run += Number(t.pnlRealized) || Number(t.pnl) || 0;
    eq.push({ y: run, label: t.instrumentId || t.id });
  });
  renderSciLineChart(host, "Session PnL path", eq.length > 1 ? eq : [], "Simulated book path. Weekly/monthly remain UNKNOWN.");
  renderSciRiskCurve(host, [{ y: sess.maxDrawdown || 0 }, { y: sess.volatility || 0 }, { y: sess.maxDrawdown || 0 }], "Drawdown / vol markers — not a VaR certificate.");
  const jump = appendEl(root, "div", "actions");
  const a = appendEl(jump, "button", "ghost", "Open Analysis");
  a.type = "button";
  a.onclick = () => data && data.onOpenAnalysis && data.onOpenAnalysis();
}

export function renderRiskAnalytics(root, g) {
  const host = appendEl(root, "div", "sci-chart-row");
  const limits = (g && g.limits) || {};
  renderSciBarChart(
    host,
    "Limit utilization (session)",
    [
      { y: Number(g && g.dailyLoss) || 0, label: "dailyLoss" },
      { y: Number(limits.maxDailyLoss) || 0, label: "maxDailyLoss" },
      { y: Number(g && g.concentration) || 0, label: "concentration" },
    ],
    "Advisory utilization. Not a broker kill-switch."
  );
  const jump = appendEl(root, "div", "actions");
  const d = appendEl(jump, "button", "ghost", "Open Detective");
  d.type = "button";
  d.onclick = () => g && g.onOpenDetective && g.onOpenDetective();
}

export function renderSystemHealthCharts(root, bundle) {
  if (!root) return;
  const b = bundle || {};
  const host = appendEl(root, "div", "sci-chart-row");
  renderSciBarChart(
    host,
    "Readiness bits (not GO)",
    [
      { y: b.cpReachable ? 1 : 0, label: "cp" },
      { y: b.degraded ? 1 : 0, label: "degraded" },
      { y: 0, label: "oidc" },
      { y: 0, label: "ready" },
    ],
    "1 = present/true. OIDC and READY stay 0. Not enterprise GO."
  );
}

export function renderAnalysisWorkbench(root, payload, handlers) {
  clearNode(root);
  handlers = handlers || {};
  const dil = (payload && payload.dil) || {};
  const ecl = (payload && payload.ecl) || {};
  const last = (payload && payload.lastGw1) || {};
  const rows = dil.rows || [];
  appendEl(root, "p", "level", "Analysis workbench · ALPHA_NON_PRODUCTION");
  const tabs = appendEl(root, "div", "settings-tabs");
  const panes = {};
  const tabDefs = [
    ["instrument", "Instrument"],
    ["scenario", "Scenario"],
    ["risk", "Risk"],
    ["impact", "Impact"],
  ];
  tabDefs.forEach(([id, label], i) => {
    const b = appendEl(tabs, "button", "ghost" + (i === 0 ? " on" : ""), label);
    b.type = "button";
    b.setAttribute("data-analysis-tab", id);
    b.onclick = () => {
      Object.keys(panes).forEach((k) => (panes[k].hidden = k !== id));
      Array.prototype.forEach.call(tabs.querySelectorAll("button"), (x) =>
        x.classList.toggle("on", x.getAttribute("data-analysis-tab") === id)
      );
    };
  });
  const inst = (panes.instrument = appendEl(root, "div", "pro-card"));
  appendEl(inst, "h3", null, "Instrument drilldown");
  if (!rows.length) appendEl(inst, "p", "empty", "NO MARKETS — open Intelligence first.");
  rows.slice(0, 8).forEach((r) => {
    const m = r.market || {};
    const line = appendEl(inst, "p", "hint", (m.title || m.marketId) + " · edge " + fmtPct((r.edge && r.edge.edgeScore) || 0) + " · risk " + fmtPct((r.risk && r.risk.riskScore) || 0));
    line.setAttribute("role", "button");
    line.tabIndex = 0;
    line.onclick = () => handlers.onOpenIntelligence && handlers.onOpenIntelligence();
  });
  const sc = (panes.scenario = appendEl(root, "div", "pro-card"));
  sc.hidden = true;
  appendEl(sc, "h3", null, "Scenario compare");
  appendEl(sc, "p", "hint", "24h vs stressed horizon from DIL rows. ALPHA, not Monte Carlo.");
  rows.slice(0, 6).forEach((r) => {
    const s = r.scenario || {};
    appendEl(sc, "p", "hint", (r.market && r.market.marketId) + " · base " + (s.baseDecision || "UNKNOWN") + " · stressed " + (s.stressedDecision || "UNKNOWN") + " · autoTrade=" + String(s.autoTrade === true));
  });
  const rk = (panes.risk = appendEl(root, "div", "pro-card"));
  rk.hidden = true;
  appendEl(rk, "h3", null, "Risk exposure");
  const exp = ((ecl.reports || []).find((x) => x.kind === "risk_exposure") || {}).payload || {};
  if (!exp.byInstrument) appendEl(rk, "p", "empty", "NO EXPOSURE SLICE — simulated book may be flat.");
  else {
    const bars = Object.keys(exp.byInstrument).map((k) => ({ label: k, y: Number(exp.byInstrument[k]) || 0 }));
    renderSciBarChart(rk, "Exposure by instrument", bars, "In-memory ledger. Not durable.");
  }
  const im = (panes.impact = appendEl(root, "div", "pro-card"));
  im.hidden = true;
  appendEl(im, "h3", null, "Decision impact");
  appendEl(im, "p", "hint", "GW1 last run + DIL proposals. Human remains decision maker.");
  appendEl(im, "p", "hint", last.runId ? "GW1 run " + last.runId + " · " + (last.status || "UNKNOWN") : "NO GW1 RUN in this session — Analyze an entity.");
  appendEl(im, "p", "model-truth", "autoTrade=false · SIMULATION_ONLY");
  const jump = appendEl(root, "div", "actions");
  const dilBtn = appendEl(jump, "button", "ghost", "Intelligence");
  dilBtn.type = "button";
  dilBtn.onclick = () => handlers.onOpenIntelligence && handlers.onOpenIntelligence();
  const eclBtn = appendEl(jump, "button", "ghost", "Reporting");
  eclBtn.type = "button";
  eclBtn.onclick = () => handlers.onOpenReporting && handlers.onOpenReporting();
  const det = appendEl(jump, "button", "ghost", "Detective");
  det.type = "button";
  det.onclick = () => handlers.onOpenDetective && handlers.onOpenDetective();
}

export function renderDetectiveWorkbench(root, payload, handlers) {
  clearNode(root);
  handlers = handlers || {};
  const events = (payload && payload.events) || [];
  const gw1 = (payload && payload.gw1Runs) || [];
  appendEl(root, "p", "level", "Who decided what — and why?");
  appendEl(root, "p", "hint", "ECL/DIL audit + GW1 runs. Session filters. Not enterprise SIEM.");
  const tools = appendEl(root, "div", "dil-toolbar");
  const user = document.createElement("input");
  user.placeholder = "user";
  user.setAttribute("aria-label", "Filter user");
  const inst = document.createElement("input");
  inst.placeholder = "instrument / market";
  inst.setAttribute("aria-label", "Filter instrument");
  const risk = document.createElement("input");
  risk.placeholder = "risk / reason";
  risk.setAttribute("aria-label", "Filter risk");
  const from = document.createElement("input");
  from.type = "datetime-local";
  from.setAttribute("aria-label", "From time");
  const to = document.createElement("input");
  to.type = "datetime-local";
  to.setAttribute("aria-label", "To time");
  [user, inst, risk, from, to].forEach((el) => tools.appendChild(el));
  const timeline = appendEl(root, "div", "pro-card");
  appendEl(timeline, "h3", null, "Detective timeline");
  const chain = appendEl(root, "div", "pro-card");
  appendEl(chain, "h3", null, "Evidence chain");
  if (!gw1.length) appendEl(chain, "p", "empty", "NO GW1 RUNS — Analyze to attach lineage.");
  gw1.slice(0, 8).forEach((r) => {
    appendEl(chain, "p", "hint", (r.runId || r.id || "run") + " · " + (r.status || r.state || "UNKNOWN") + " · " + (r.instrumentId || ""));
  });
  appendEl(chain, "p", "model-truth", "Chain = GW1 lineage + DIL audit. Not durable PG.");
  function paint() {
    const filtered = filterDetectiveEvents(events, {
      user: user.value,
      instrument: inst.value,
      risk: risk.value,
      from: from.value ? new Date(from.value).toISOString() : "",
      to: to.value ? new Date(to.value).toISOString() : "",
    });
    clearNode(timeline);
    appendEl(timeline, "h3", null, "Detective timeline");
    if (!filtered.length) appendEl(timeline, "p", "empty", "NO EVENTS for these filters — UNKNOWN, not a cleared case.");
    filtered.slice(0, 40).forEach((ev) => {
      appendEl(
        timeline,
        "p",
        /human_review/.test(String(ev.reason || "")) ? "model-truth" : "hint",
        (ev.time || ev.at || "") +
          " · " +
          (ev.user || "UNKNOWN") +
          " · " +
          (ev.kind || "") +
          " · " +
          (ev.decision || "") +
          " · " +
          (ev.marketId || "") +
          " — " +
          String(ev.reason || "").slice(0, 180)
      );
    });
  }
  [user, inst, risk, from, to].forEach((el) => {
    el.addEventListener("input", paint);
    el.addEventListener("change", paint);
  });
  paint();
  const jump = appendEl(root, "div", "actions");
  [
    ["Evidence", handlers.onOpenEvidence],
    ["Decisions", handlers.onOpenDecisions],
    ["Risk / Gov", handlers.onOpenRisk],
  ].forEach(([label, fn]) => {
    if (typeof fn !== "function") return;
    const b = appendEl(jump, "button", "ghost", label);
    b.type = "button";
    b.onclick = fn;
  });
}

export const ANALYTICS_DETECTIVE_BROWSER_SOURCE = [
  filterDetectiveEvents,
  trackEquitySeries,
  renderDilAnalytics,
  renderEclAnalytics,
  renderRiskAnalytics,
  renderSystemHealthCharts,
  renderAnalysisWorkbench,
  renderDetectiveWorkbench,
]
  .map((fn) => fn.toString())
  .join("\n");
