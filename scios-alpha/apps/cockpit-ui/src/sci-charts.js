/**
 * SCI OS SVG charts — tokens only, no vendor chart kit.
 * Empty series = UNKNOWN, never a fake PASS.
 * ALPHA_NON_PRODUCTION
 */

export function ohlcAllowedForFamily(familyId) {
  return familyId === "market_portfolio_risk" || familyId === "market_intelligence";
}

export function finiteSeries(values) {
  const out = [];
  (values || []).forEach((v, i) => {
    const y = v && typeof v === "object" ? Number(v.y) : Number(v);
    if (!Number.isFinite(y)) return;
    const x = v && typeof v === "object" && Number.isFinite(Number(v.x)) ? Number(v.x) : i;
    out.push({ x: x, y: y, label: (v && v.label) || String(i), n: v && v.n });
  });
  return out;
}

export function calibrationPlotPoints(bins) {
  return (bins || [])
    .filter((b) => (b.n || 0) > 0 && Number.isFinite(Number(b.meanP)) && Number.isFinite(Number(b.meanY)))
    .map((b) => ({ x: Number(b.meanP), y: Number(b.meanY), n: b.n, label: String(b.lo) + "–" + String(b.hi) }));
}

export function edgeHistogram(rows, bucket) {
  const width = bucket > 0 ? bucket : 0.05;
  const counts = {};
  (rows || []).forEach((r) => {
    const e = r && r.edge ? Number(r.edge.edgeScore) : Number(r);
    if (!Number.isFinite(e)) return;
    const k = Math.round(e / width) * width;
    const key = k.toFixed(2);
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => ({ label: k, y: counts[k], x: Number(k) }));
}

function chartCard(parent, title, note) {
  const card = appendEl(parent, "div", "pro-card sci-chart-card");
  appendEl(card, "p", "level", "ALPHA chart · simulated · live UNKNOWN");
  appendEl(card, "h3", null, title || "Chart");
  if (note) appendEl(card, "p", "model-truth", note);
  return card;
}

function mountSvg(parent, w, h) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  svg.setAttribute("class", "sci-chart");
  svg.setAttribute("role", "img");
  parent.appendChild(svg);
  return svg;
}

export function renderSciLineChart(parent, title, values, note) {
  const card = chartCard(parent, title, note || "Time series — not a live feed.");
  const pts = finiteSeries(values);
  if (pts.length < 2) {
    appendEl(card, "p", "empty", "NO SERIES — UNKNOWN, not a blank success.");
    return card;
  }
  const w = 360;
  const h = 120;
  const pad = 10;
  const ys = pts.map((p) => p.y);
  const min = Math.min.apply(null, ys);
  const max = Math.max.apply(null, ys);
  const span = max - min || 1;
  const path = pts
    .map((p, i) => {
      const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
      const y = h - pad - ((p.y - min) / span) * (h - pad * 2);
      return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    })
    .join(" ");
  const svg = mountSvg(card, w, h);
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", path);
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", "var(--navy)");
  el.setAttribute("stroke-width", "1.6");
  svg.appendChild(el);
  return card;
}

export function renderSciBarChart(parent, title, values, note) {
  const card = chartCard(parent, title, note || "Distribution — ALPHA snapshot.");
  const pts = finiteSeries(values);
  if (!pts.length) {
    appendEl(card, "p", "empty", "NO BINS — UNKNOWN, not PASS.");
    return card;
  }
  const w = 360;
  const h = 120;
  const pad = 10;
  const max = Math.max.apply(
    null,
    pts.map((p) => Math.abs(p.y))
  ) || 1;
  const svg = mountSvg(card, w, h);
  const bw = Math.max(2, (w - pad * 2) / pts.length - 2);
  pts.forEach((p, i) => {
    const bh = (Math.abs(p.y) / max) * (h - pad * 2);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(pad + i * ((w - pad * 2) / pts.length)));
    rect.setAttribute("y", String(h - pad - bh));
    rect.setAttribute("width", String(bw));
    rect.setAttribute("height", String(bh));
    rect.setAttribute("fill", p.y < 0 ? "var(--red)" : "var(--ice)");
    rect.setAttribute("stroke", "var(--navy)");
    svg.appendChild(rect);
  });
  return card;
}

export function renderSciCalibrationChart(parent, bins, note) {
  const card = chartCard(parent, "Calibration curve", note || "mean predicted vs mean outcome. Live calibration UNKNOWN.");
  const pts = calibrationPlotPoints(bins);
  if (!pts.length) {
    appendEl(card, "p", "empty", "NO OCCUPIED BINS — UNKNOWN, not ADEQUATE live.");
    return card;
  }
  const w = 360;
  const h = 160;
  const pad = 16;
  const svg = mountSvg(card, w, h);
  const diag = document.createElementNS("http://www.w3.org/2000/svg", "path");
  diag.setAttribute("d", "M" + pad + " " + (h - pad) + " L" + (w - pad) + " " + pad);
  diag.setAttribute("stroke", "var(--fog)");
  diag.setAttribute("stroke-dasharray", "4 3");
  diag.setAttribute("fill", "none");
  svg.appendChild(diag);
  pts.forEach((p) => {
    const cx = pad + p.x * (w - pad * 2);
    const cy = h - pad - p.y * (h - pad * 2);
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", String(cx));
    c.setAttribute("cy", String(cy));
    c.setAttribute("r", String(Math.min(8, 3 + Math.sqrt(p.n || 1))));
    c.setAttribute("fill", "var(--navy)");
    c.setAttribute("fill-opacity", "0.75");
    svg.appendChild(c);
  });
  appendEl(card, "p", "hint", pts.length + " occupied bins · diagonal = perfect calibration (not claimed).");
  return card;
}

export function renderSciRiskCurve(parent, values, note) {
  return renderSciLineChart(parent, "Risk curve", values, note || "Risk score by market — advisory, not a kill-switch.");
}

/** lo · point · hi from envelope. Empty ⇒ no series (never a hardcoded demo curve). */
export function predictionFoundationSeries(pred) {
  const p = pred || {};
  const pe = Number(p.pointEstimate != null ? p.pointEstimate : p.mean);
  const interval = p.predictionInterval;
  const lo = interval && Number.isFinite(Number(interval[0])) ? Number(interval[0]) : NaN;
  const hi = interval && Number.isFinite(Number(interval[1])) ? Number(interval[1]) : NaN;
  const pts = [];
  if (Number.isFinite(lo)) pts.push({ x: 0, y: lo, label: "lo" });
  if (Number.isFinite(pe)) pts.push({ x: 1, y: pe, label: "point" });
  if (Number.isFinite(hi)) pts.push({ x: 2, y: hi, label: "hi" });
  return pts.length >= 2 ? pts : [];
}

/** Evidence-backed cells only. Empty risk ⇒ [] (UNKNOWN), never a 36-cell decoration. */
export function riskFoundationCells(risk) {
  const r = risk || {};
  const has =
    r.verdict != null ||
    r.decision != null ||
    r.approved != null ||
    r.score != null ||
    r.killSwitchActive != null ||
    r.uncertaintyHaircut != null ||
    (r.limits && (r.limits.maxPosition != null || r.limits.maxExposure != null));
  if (!has) return [];
  const cells = [];
  const push = (label, raw, heat) => {
    const missing = raw == null || raw === "";
    cells.push({
      label: label,
      value: missing ? "UNKNOWN" : String(raw),
      heat: missing ? "unknown" : heat,
    });
  };
  const verdict = r.verdict || r.decision;
  const vHeat = /REJECT|DENY|FAIL/i.test(String(verdict)) || r.approved === false
    ? "hi"
    : /HOLD|ESCALATE/i.test(String(verdict))
      ? "mid"
      : /APPROVE|ALLOW/i.test(String(verdict)) || r.approved === true
        ? "lo"
        : "unknown";
  if (verdict) push("Verdict", verdict, vHeat);
  if (r.approved != null) push("Approved", r.approved, r.approved ? "lo" : "hi");
  if (r.killSwitchActive != null) push("Kill switch", r.killSwitchActive, r.killSwitchActive ? "hi" : "lo");
  if (r.score != null) {
    const n = Number(r.score);
    push("Score", r.score, n >= 0.7 ? "hi" : n >= 0.4 ? "mid" : "lo");
  }
  if (r.uncertaintyHaircut != null) {
    const n = Number(r.uncertaintyHaircut);
    push("Haircut", r.uncertaintyHaircut, n >= 0.5 ? "hi" : "mid");
  }
  if (r.limits && r.limits.maxPosition != null) push("Max pos", r.limits.maxPosition, "lo");
  if (r.limits && r.limits.maxExposure != null) push("Max exp", r.limits.maxExposure, "lo");
  return cells;
}

export function lineageFoundationNodes(lin) {
  const raw = lin && Array.isArray(lin.nodes) ? lin.nodes : [];
  return raw
    .map((n, i) => ({
      id: (n && (n.id || n.nodeId)) || String(i),
      label: (n && (n.type || n.kind || n.stage || n.label)) || "node",
    }))
    .filter((n) => n.id);
}

function addFogGrid(svg, w, h, pad) {
  for (let i = 1; i < 4; i++) {
    const y = pad + (i / 4) * (h - pad * 2);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(pad));
    line.setAttribute("x2", String(w - pad));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "var(--fog)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
  }
}

/** Ice-edge path inside an existing host. Navy stroke, Ice glow. Not a neon vendor clone. */
export function renderSciIceEdgeChart(parent, values, note) {
  if (!parent) return parent;
  clearNode(parent);
  if (note) appendEl(parent, "p", "model-truth", note);
  const pts = finiteSeries(values);
  if (pts.length < 2) {
    appendEl(parent, "p", "empty", "NO SERIES — UNKNOWN, not a demo curve.");
    return parent;
  }
  const w = 360;
  const h = 120;
  const pad = 10;
  const ys = pts.map((p) => p.y);
  const min = Math.min.apply(null, ys);
  const max = Math.max.apply(null, ys);
  const span = max - min || 1;
  const d = pts
    .map((p, i) => {
      const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
      const y = h - pad - ((p.y - min) / span) * (h - pad * 2);
      return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    })
    .join(" ");
  const svg = mountSvg(parent, w, h);
  svg.setAttribute("class", "sci-chart sci-chart-ice");
  svg.setAttribute("aria-label", "Prediction interval path");
  addFogGrid(svg, w, h, pad);
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", d);
  el.setAttribute("class", "sci-chart-line");
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", "var(--navy)");
  el.setAttribute("stroke-width", "1.6");
  svg.appendChild(el);
  return parent;
}

export function renderSciRiskHeat(parent, cells, note) {
  if (!parent) return parent;
  clearNode(parent);
  if (note) appendEl(parent, "p", "model-truth", note);
  const list = cells || [];
  if (!list.length) {
    appendEl(parent, "p", "empty", "NO RISK CELLS — UNKNOWN, not a decorative heatmap.");
    return parent;
  }
  const grid = appendEl(parent, "div", "sci-mini-heat");
  list.forEach((c) => {
    const heat = c.heat === "hi" || c.heat === "mid" || c.heat === "lo" ? c.heat : "unknown";
    const cell = appendEl(grid, "div", "heat-cell heat-" + heat);
    cell.setAttribute("role", "img");
    cell.setAttribute("aria-label", (c.label || "cell") + " " + (c.value || "UNKNOWN"));
    appendEl(cell, "span", "heat-k", c.label || "cell");
    appendEl(cell, "span", "heat-v", c.value == null || c.value === "" ? "UNKNOWN" : String(c.value));
  });
  return parent;
}

export function renderSciLineageGraph(parent, nodes, note) {
  if (!parent) return parent;
  clearNode(parent);
  if (note) appendEl(parent, "p", "model-truth", note);
  const list = (nodes || []).slice(0, 8);
  if (!list.length) {
    appendEl(parent, "p", "empty", "NO LINEAGE NODES — UNKNOWN, not a placeholder graph.");
    return parent;
  }
  const w = 360;
  const h = 80;
  const pad = 16;
  const svg = mountSvg(parent, w, h);
  svg.setAttribute("class", "sci-chart sci-lineage-svg");
  svg.setAttribute("aria-label", "Lineage node path");
  const n = list.length;
  const ys = list.map((_, i) => pad + 8 + (i % 2) * 28);
  const xs = list.map((_, i) => pad + (n === 1 ? (w - pad * 2) / 2 : (i / (n - 1)) * (w - pad * 2)));
  for (let i = 0; i < n - 1; i++) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", xs[i].toFixed(1));
    line.setAttribute("y1", ys[i].toFixed(1));
    line.setAttribute("x2", xs[i + 1].toFixed(1));
    line.setAttribute("y2", ys[i + 1].toFixed(1));
    line.setAttribute("stroke", "var(--fog)");
    line.setAttribute("stroke-width", "1.5");
    svg.appendChild(line);
  }
  list.forEach((node, i) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", xs[i].toFixed(1));
    c.setAttribute("cy", ys[i].toFixed(1));
    c.setAttribute("r", "5");
    c.setAttribute("fill", i === n - 1 ? "var(--ice)" : "var(--navy)");
    c.setAttribute("stroke", "var(--navy)");
    svg.appendChild(c);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", xs[i].toFixed(1));
    t.setAttribute("y", String(ys[i] + 16));
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "var(--graphite)");
    t.setAttribute("font-size", "8");
    t.textContent = String(node.label || "node").slice(0, 14);
    svg.appendChild(t);
  });
  return parent;
}

export function mountAnalyzeFoundations(data) {
  const predHost = document.getElementById("predChartHost");
  const riskHost = document.getElementById("riskHeatHost");
  const linHost = document.getElementById("lineageGraphHost");
  const pred = data && (data.predictionEnvelope || data.prediction);
  const risk = data && (data.riskDecision || data.risk);
  const lin = data && data.lineage;
  if (predHost) {
    renderSciIceEdgeChart(
      predHost,
      predictionFoundationSeries(pred),
      "Interval path (lo · point · hi) from envelope. Not a live AAPL / hospitality / healthcare series."
    );
  }
  if (riskHost) {
    renderSciRiskHeat(
      riskHost,
      riskFoundationCells(risk),
      "Envelope fields only. Unmapped domain matrices remain UNKNOWN."
    );
  }
  if (linHost) {
    renderSciLineageGraph(
      linHost,
      lineageFoundationNodes(lin),
      "Nodes from Control Plane lineage. Placeholder graphs are not drawn."
    );
  }
}

export const SCI_CHARTS_BROWSER_SOURCE = [
  ohlcAllowedForFamily,
  finiteSeries,
  calibrationPlotPoints,
  edgeHistogram,
  chartCard,
  mountSvg,
  renderSciLineChart,
  renderSciBarChart,
  renderSciCalibrationChart,
  renderSciRiskCurve,
  predictionFoundationSeries,
  riskFoundationCells,
  lineageFoundationNodes,
  addFogGrid,
  renderSciIceEdgeChart,
  renderSciRiskHeat,
  renderSciLineageGraph,
  mountAnalyzeFoundations,
]
  .map((fn) => fn.toString())
  .join("\n");
