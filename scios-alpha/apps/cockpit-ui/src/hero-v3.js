/**
 * HeroV3 binder — LayoutAlgebra ⊕ FamilyUxV3 ⊕ { roleId, name }.
 * View-model comes from Control Plane compose. Not 200 apps.
 * ALPHA_NON_PRODUCTION
 */

export const HERO_PANEL_COPY_MAP = {
  forecast: { host: "modPredictionPanel", key: "forecast" },
  horizon: { host: "modUncertaintyPanel", key: "horizon" },
  threat_gate: { host: "modRiskPanel", key: "threatGate" },
  governance: { host: "modDecisionPanel", key: "governance" },
  simulator: { host: "modSimulationPanel", key: "simulator" },
  proof_timeline: { host: "modEvidencePanel", key: "proofTimeline" },
  chain_of_truth: { host: "modLineagePanel", key: "chainOfTruth" },
  ops_intel: { host: "modOpsIntel", key: "opsIntel" },
};

export function predictionBandVisible(pred) {
  return !(pred && pred.abstain === true);
}

export function reportingDisplayValue(value) {
  if (value == null || value === "" || value === 0 || value === "0.00") return "UNKNOWN";
  return String(value);
}

export function truthGraphSlots(state) {
  const s = state || {};
  return [
    { id: "WorldTick", present: Boolean(s.worldTick || (s.ticks && s.ticks.length)), tone: "simulated" },
    { id: "NewsEvent", present: Boolean(s.news && s.news.length), tone: s.news && s.news.length ? "unverified" : "unknown" },
    { id: "OhlcBar", present: Boolean(s.ohlc && s.ohlcAllowed), tone: s.ohlcAllowed ? "simulated" : "unknown" },
    { id: "Ontology", present: Boolean(s.ontology && s.ontology.length), tone: "unknown" },
    { id: "Lineage", present: s.lineageVerified === true, tone: s.lineageVerified === true ? "ok" : "unknown" },
    { id: "Evidence", present: Boolean(s.evidence && s.evidence.length), tone: "unknown" },
  ];
}

export function applyHeroV3(hero) {
  const head = document.getElementById("heroV3Head");
  if (head) head.style.transitionDuration = "var(--sci-motion-macro)";
  const overline = document.getElementById("heroOverline");
  const title = document.getElementById("heroTitle");
  const queue = document.getElementById("heroQueue");
  const tokens = document.getElementById("heroTokens");
  if (!hero) {
    if (overline) overline.textContent = "Family · UNKNOWN";
    if (title) title.textContent = "Analyze";
    if (queue) queue.textContent = "";
    if (tokens) {
      tokens.replaceChildren();
      if (typeof createSciToken === "function") createSciToken(tokens, "unknown", "UNKNOWN");
    }
    return;
  }
  if (overline) overline.textContent = (hero.familyOverline || hero.family?.id || "family") + " · ALPHA_NON_PRODUCTION";
  if (title) title.textContent = hero.name || hero.roleId;
  if (queue) queue.textContent = hero.queue ? "queue · " + hero.queue : "";
  if (tokens) {
    tokens.replaceChildren();
    if (typeof createSciToken === "function") {
      createSciToken(tokens, "unknown", "SEED_RESEARCH_REQUIRED");
      if (hero.specialist) createSciToken(tokens, "unknown", "inherit only");
      if (hero.stub) createSciToken(tokens, "unknown", "STUB");
      if (hero.skip) createSciToken(tokens, "degraded", "SKIP");
      if (hero.ohlc) createSciToken(tokens, "simulated", "OHLC");
      createSciToken(tokens, "proposal", "HITL");
      createSciToken(tokens, "simulated", "simulated");
    }
  }
  const copy = hero.missionCopy || {};
  Object.keys(HERO_PANEL_COPY_MAP).forEach((id) => {
    const spec = HERO_PANEL_COPY_MAP[id];
    const el = document.getElementById(spec.host);
    if (!el) return;
    const hint = el.querySelector(".hint") || el.querySelector(".model-truth");
    const text = copy[spec.key];
    if (hint && text) hint.setAttribute("data-hero-copy", text);
    if (id === "ops_intel") {
      const val = document.getElementById("proOpsIntel");
      if (val) val.textContent = text || "UNKNOWN";
      const h = document.getElementById("proOpsIntelHint");
      if (h) h.textContent = hero.family?.evidenceRules || "UNKNOWN";
    }
  });
  const charts = document.getElementById("heroCharts");
  if (charts && typeof createSciChart === "function") {
    charts.replaceChildren();
    (hero.charts || []).slice(0, 2).forEach((name) => {
      createSciChart(charts, {
        title: name,
        ohlc: hero.ohlc === true,
        ohlcAllowed: hero.ohlc === true,
        series: [],
      });
    });
    if (!(hero.charts || []).length) createSciToken(charts, "unknown", "NO CHARTS");
  }
  const gate = document.getElementById("heroDecisionGate");
  if (gate && typeof createSciDecisionGate === "function") {
    gate.replaceChildren();
    createSciDecisionGate(gate, hero.decisionGate || {});
  }
  const graph = document.getElementById("heroTruthGraph");
  if (graph && typeof createSciToken === "function") {
    graph.replaceChildren();
    truthGraphSlots({ ohlcAllowed: hero.ohlc === true }).forEach((slot) => {
      createSciToken(graph, slot.present ? slot.tone : "unknown", slot.id + (slot.present ? "" : " · UNKNOWN"));
    });
  }
}

export const HERO_V3_BROWSER_SOURCE =
  "const HERO_PANEL_COPY_MAP = " +
  JSON.stringify(HERO_PANEL_COPY_MAP) +
  ";\n" +
  [predictionBandVisible, reportingDisplayValue, truthGraphSlots, applyHeroV3].map((fn) => fn.toString()).join("\n");
