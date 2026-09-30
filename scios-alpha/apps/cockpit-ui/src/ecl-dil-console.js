/**
 * Decision Intelligence + ECL Reporting consoles — inlined into Cockpit.
 * ALPHA_NON_PRODUCTION. Proposals only. SCI tokens, not a vendor skin.
 */

export function heatClass(score, kind) {
  const a = Math.abs(Number(score) || 0);
  if (kind === "risk") {
    if (a >= 0.75) return "heat-hi";
    if (a >= 0.45) return "heat-mid";
    return "heat-lo";
  }
  if (a >= 0.1) return "heat-hi";
  if (a >= 0.04) return "heat-mid";
  return "heat-lo";
}

export function fmtPct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(1) + "%";
}

export function fmtNum(n, d) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: d == null ? 2 : d });
}

export function toneForGuardrail(g) {
  if (!g) return "UNKNOWN";
  if (g.breaches && g.breaches.length) return "WARN";
  return "OK";
}

export function renderStatusChip(parent, tone, label) {
  const s = appendEl(parent, "span", "sci-chip " + String(tone || "UNKNOWN").toLowerCase(), label || tone || "UNKNOWN");
  s.setAttribute("data-tone", tone || "UNKNOWN");
  return s;
}

export function renderCalibrationPanel(parent, calib) {
  const c = calib || {};
  const sim = c.simulated || {};
  const card = appendEl(parent, "div", "pro-card");
  appendEl(card, "p", "level", "Simulated closed-loop · live calibration UNKNOWN");
  appendEl(card, "h3", null, "Track record");
  renderStatusChip(card, "UNKNOWN", c.liveCalibration || "UNKNOWN");
  renderStatusChip(card, sim.adequate ? "WARN" : "UNKNOWN", c.status || "INSUFFICIENT_N");
  appendEl(
    card,
    "p",
    "meta",
    "Live calibration engine prepared=true enabled=false · live status UNKNOWN"
  );
  if (!sim.n) {
    appendEl(card, "p", "empty", "NO RESOLVED SAMPLES — UNKNOWN, not PASS.");
    return card;
  }
  appendEl(
    card,
    "p",
    "hint",
    "n=" +
      sim.n +
      " · Brier " +
      (sim.brier != null ? Number(sim.brier).toFixed(3) : "—") +
      " · mean |edge| " +
      fmtPct(sim.meanAbsEdge) +
      " · edge sign-hit " +
      fmtPct(sim.edgeSignHitRate)
  );
  appendEl(
    card,
    "p",
    "hint",
    "Hypothetical PnL " +
      fmtNum(sim.hypotheticalPnl, 0) +
      " · hypo drawdown " +
      fmtPct(sim.hypoMaxDrawdown) +
      " · noNewRisk did not enter " +
      fmtPct(sim.noNewRiskAvoidRate)
  );
  appendEl(card, "p", "model-truth", c.note || "Not live. Not READY. Not a win-rate claim.");
  const bins = sim.bins || [];
  if (bins.length) {
    const emptyTails = bins.filter((b) => (b.n || 0) === 0);
    appendEl(
      card,
      "p",
      "hint",
      "Reliability bins: " +
        bins.map((b) => (b.lo != null ? Number(b.lo).toFixed(1) : "?") + "–" + (b.hi != null ? Number(b.hi).toFixed(1) : "?") + " n=" + (b.n || 0)).join(" · ")
    );
    if (emptyTails.length) {
      appendEl(
        card,
        "p",
        "model-truth",
        emptyTails.length + " empty probability bins — simulated ADEQUATE_ALPHA is not live calibration."
      );
    }
  }
  return card;
}

export function renderFeedRegistry(root, registry) {
  if (!root || !registry || !registry.feeds) return;
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Feed registry · DataFeedEngine · InstrumentAdapterLayer · FeedHealthMonitor");
  appendEl(card, "h3", null, "Registered feeds");
  const h = registry.health || {};
  appendEl(
    card,
    "p",
    "hint",
    "registered " +
      (h.registered || 0) +
      " · simulated " +
      (h.simulated || 0) +
      " · stub " +
      (h.stub || 0) +
      " · absent " +
      (h.absent || 0) +
      " · liveCertified " +
      (h.liveCertified || 0)
  );
  appendEl(
    card,
    "p",
    "model-truth",
    "enabledLive=" +
      String(registry.enabledLive === true) +
      " · persisted=" +
      String(registry.persisted === true) +
      " · unexpectedLive=" +
      String(registry.unexpectedLive === true) +
      " · autoTrade=false · SIMULATION_ONLY · CausalEngine/SSE consume analogs, not certified tapes"
  );
  const consumers = registry.consumers || {};
  Object.keys(consumers).forEach((mod) => {
    appendEl(card, "p", "meta", mod + " ← " + ((consumers[mod] || []).join(", ") || "NONE"));
  });
  (registry.feeds || []).forEach((f) => {
    appendEl(
      card,
      "p",
      f.status === "ABSENT" ? "empty" : "hint",
      f.id +
        " · " +
        (f.mode || "SIMULATION_ONLY") +
        " · " +
        f.status +
        " · live " +
        (f.live || "ABSENT") +
        " · wired " +
        ((f.wiredTo || []).join(",") || "NONE") +
        " · analog " +
        (f.analog || "NONE")
    );
  });
}

export function renderDeploymentInventory(root, deployment) {
  if (!root || !deployment || !deployment.modules) return;
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Deployment inventory · one boot · one Shell · compose-in-product");
  appendEl(card, "h3", null, "OS · Cockpit · Blueprints · Feeds");
  const h = deployment.health || {};
  appendEl(
    card,
    "p",
    "hint",
    "registered " +
      (h.registered || 0) +
      " · composed " +
      (h.composed || 0) +
      " · partial " +
      (h.partial || 0) +
      " · absent " +
      (h.absent || 0)
  );
  appendEl(
    card,
    "p",
    "model-truth",
    "enabledRuntimes=" +
      String(deployment.enabledRuntimes === true) +
      " · secondWorkflowEngine=" +
      String(deployment.secondWorkflowEngine === true) +
      " · autoTrade=false · SIMULATION_ONLY · ready=false"
  );
  (deployment.modules || []).forEach((m) => {
    appendEl(
      card,
      "p",
      m.status === "ABSENT" ? "empty" : "hint",
      m.id + " · " + m.family + " · " + m.status + " · analog " + (m.analog || "NONE")
    );
  });
}

export function renderRealisticSim(root, sim) {
  if (!root || !sim) return;
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Realistic simulation · SIMULATION_ONLY · not live · not Monte Carlo");
  appendEl(card, "h3", null, "Risk / causal / timeline analogs");
  appendEl(
    card,
    "p",
    "model-truth",
    "enabledFull=" +
      String(sim.enabledFull === true) +
      " · monteCarlo=" +
      String(sim.monteCarlo === true) +
      " · doCalculus=" +
      String(sim.doCalculus === true) +
      " · affectModel=" +
      String(sim.affectModel === true) +
      " · autoTrade=false · persisted=" +
      String(sim.persisted === true)
  );
  const rp = sim.riskPropagation || {};
  appendEl(card, "p", "hint", "risk nodes " + ((rp.nodes && rp.nodes.length) || 0) + " · edges " + ((rp.edges && rp.edges.length) || 0) + " · guardrail " + (rp.guardrail || "UNKNOWN"));
  const cg = sim.causalGraph || {};
  appendEl(card, "p", "hint", "causal nodes " + ((cg.nodes && cg.nodes.length) || 0) + " · edges " + ((cg.edges && cg.edges.length) || 0));
  appendEl(card, "p", "hint", "timeline events " + ((sim.timeline && sim.timeline.length) || 0) + " · evidence chain " + ((sim.evidenceChain && sim.evidenceChain.length) || 0));
  const rep = sim.reporting || {};
  appendEl(card, "p", "hint", "session PnL " + (rep.sessionPnl == null ? "—" : String(rep.sessionPnl)) + " · weekly " + (rep.weekly || "UNKNOWN") + " · monthly " + (rep.monthly || "UNKNOWN"));
  const lg = sim.legalGuardian || {};
  appendEl(card, "p", "model-truth", "LegalGuardian analog · requiresHuman=" + String(lg.requiresHuman === true) + " · legalCounsel=" + String(lg.legalCounsel === true) + " · " + (lg.governance || "GOVERNANCE > AGENT"));
  const comp = (sim.competition && sim.competition.ranked) || [];
  if (comp.length) {
    appendEl(card, "p", "hint", "Competition ranking (simulated |edge|): " + comp.slice(0, 4).map((c) => c.id + " " + (c.edgeScore == null ? "—" : Number(c.edgeScore).toFixed(3))).join(" · "));
  }
  const eng = sim.engines || {};
  Object.keys(eng).forEach((k) => {
    const e = eng[k] || {};
    appendEl(card, "p", e.status === "ABSENT" ? "empty" : "meta", k + " · " + (e.status || "UNKNOWN") + " · analog " + (e.analog || "NONE"));
  });
  appendEl(card, "p", "empty", sim.note || "Synthetic structure only. Not a venue tape.");
}

export function renderProfessionalWorkspace(root, payload, handlers) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  if (!data.catalogs && !data.engines && !data.sandboxes) return;
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Professional workspace · SIMULATION_ONLY · 200 seeds · 9 archetypes");
  appendEl(card, "h3", null, "Role catalog + domain sandboxes");
  appendEl(
    card,
    "p",
    "model-truth",
    "fullProfessionalSystem=" +
      String(data.fullProfessionalSystem === true) +
      " · enabledFull=" +
      String(data.enabledFull === true) +
      " · liveDomainData=" +
      String(data.liveDomainData === true) +
      " · autoTrade=false · persisted=" +
      String(data.persisted === true) +
      " · ready=" +
      String(data.ready === true)
  );
  const reg = data.registry || {};
  appendEl(
    card,
    "p",
    "hint",
    "roles seeded " +
      (reg.rolesSeeded || 0) +
      " · fully specified " +
      (reg.rolesFullySpecified || 0) +
      " · RESEARCH_REQUIRED " +
      (reg.rolesResearchRequired || 0) +
      " · families " +
      (reg.families || 0)
  );
  const catalogs = data.catalogs || [];
  if (handlers && typeof handlers.onSelectCatalog === "function") {
    const bar = appendEl(card, "div", "role-bar");
    appendEl(bar, "label", null, "Catalog / sandbox");
    const sel = document.createElement("select");
    sel.id = "professionCatalogSelect";
    sel.setAttribute("aria-label", "Professional catalog");
    catalogs.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      const broken = c.status === "ABSENT" || !(c.analogArchetypes && c.analogArchetypes.length);
      opt.textContent = c.id + " · " + (c.status || "UNKNOWN") + (broken ? " · inspect only" : "");
      sel.appendChild(opt);
    });
    if (handlers.inspectedCatalogId) sel.value = handlers.inspectedCatalogId;
    sel.onchange = () => handlers.onSelectCatalog(sel.value);
    bar.appendChild(sel);
  }
  if (handlers && typeof handlers.onCompile === "function") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ghost";
    b.textContent = "Compile workspace (SAFE)";
    b.onclick = () => handlers.onCompile();
    card.appendChild(b);
  }
  if (handlers && typeof handlers.onValidate === "function") {
    const v = document.createElement("button");
    v.type = "button";
    v.className = "ghost";
    v.textContent = "Validate wave (SAFE)";
    v.onclick = () => handlers.onValidate();
    card.appendChild(v);
  }
  if (handlers && typeof handlers.onDeepValidate === "function") {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "ghost";
    d.textContent = "Deep validate (SAFE)";
    d.onclick = () => handlers.onDeepValidate();
    card.appendChild(d);
  }
  if (handlers && typeof handlers.onActivate === "function") {
    const a = document.createElement("button");
    a.type = "button";
    a.className = "ghost";
    a.textContent = "Activate workspace (SAFE)";
    a.onclick = () => handlers.onActivate();
    card.appendChild(a);
  }
  if (handlers && typeof handlers.onStabilize === "function") {
    const s = document.createElement("button");
    s.type = "button";
    s.className = "ghost";
    s.textContent = "Stabilize workspace (SAFE)";
    s.onclick = () => handlers.onStabilize();
    card.appendChild(s);
  }
  if (handlers && typeof handlers.onDigitalActivate === "function") {
    const dgt = document.createElement("button");
    dgt.type = "button";
    dgt.className = "ghost";
    dgt.textContent = "Digital activate (SAFE)";
    dgt.onclick = () => handlers.onDigitalActivate();
    card.appendChild(dgt);
  }
  if (handlers && typeof handlers.onPrecisionUpgrade === "function") {
    const p = document.createElement("button");
    p.type = "button";
    p.className = "ghost";
    p.textContent = "Precision upgrade (SAFE)";
    p.onclick = () => handlers.onPrecisionUpgrade();
    card.appendChild(p);
  }
  if (handlers && typeof handlers.onCyberBridge === "function") {
    const cb = document.createElement("button");
    cb.type = "button";
    cb.className = "ghost";
    cb.textContent = "Cyber research (SAFE)";
    cb.onclick = () => handlers.onCyberBridge();
    card.appendChild(cb);
  }
  if (handlers && typeof handlers.onActivationReview === "function") {
    const ar = document.createElement("button");
    ar.type = "button";
    ar.className = "ghost";
    ar.textContent = "Activation review (SAFE)";
    ar.onclick = () => handlers.onActivationReview();
    card.appendChild(ar);
  }
  if (handlers && typeof handlers.onEnterprisePrep === "function") {
    const ep = document.createElement("button");
    ep.type = "button";
    ep.className = "ghost";
    ep.textContent = "Enterprise prep (SAFE)";
    ep.onclick = () => handlers.onEnterprisePrep();
    card.appendChild(ep);
  }
  if (handlers && typeof handlers.onAutomationPrep === "function") {
    const au = document.createElement("button");
    au.type = "button";
    au.className = "ghost";
    au.textContent = "Automation prep (SAFE)";
    au.onclick = () => handlers.onAutomationPrep();
    card.appendChild(au);
  }
  if (handlers && typeof handlers.onVisibilityPrep === "function") {
    const vis = document.createElement("button");
    vis.type = "button";
    vis.className = "ghost";
    vis.textContent = "Visibility prep (SAFE)";
    vis.onclick = () => handlers.onVisibilityPrep();
    card.appendChild(vis);
  }
  if (handlers && typeof handlers.onVisibilityActivation === "function") {
    const va = document.createElement("button");
    va.type = "button";
    va.className = "ghost";
    va.textContent = "Visibility episodes (SAFE)";
    va.onclick = () => handlers.onVisibilityActivation();
    card.appendChild(va);
  }
  if (handlers && typeof handlers.onVisibilityDeep === "function") {
    const vd = document.createElement("button");
    vd.type = "button";
    vd.className = "ghost";
    vd.textContent = "Visibility deep (SAFE)";
    vd.onclick = () => handlers.onVisibilityDeep();
    card.appendChild(vd);
  }
  if (handlers && typeof handlers.onExplainabilityPrep === "function") {
    const ex = document.createElement("button");
    ex.type = "button";
    ex.className = "ghost";
    ex.textContent = "Explainability prep (SAFE)";
    ex.onclick = () => handlers.onExplainabilityPrep();
    card.appendChild(ex);
  }
  if (handlers && typeof handlers.onExplainVisibility === "function") {
    const evb = document.createElement("button");
    evb.type = "button";
    evb.className = "ghost";
    evb.textContent = "Explain+visibility (SAFE)";
    evb.onclick = () => handlers.onExplainVisibility();
    card.appendChild(evb);
  }
  if (handlers && typeof handlers.onDigitalWorkspaceCompute === "function") {
    const dwc = document.createElement("button");
    dwc.type = "button";
    dwc.className = "ghost";
    dwc.textContent = "Digital KG+desks (SAFE)";
    dwc.onclick = () => handlers.onDigitalWorkspaceCompute();
    card.appendChild(dwc);
  }
  if (handlers && typeof handlers.onActivationPass === "function") {
    const ap = document.createElement("button");
    ap.type = "button";
    ap.className = "ghost";
    ap.textContent = "Master suite (SAFE)";
    ap.onclick = () => handlers.onActivationPass();
    card.appendChild(ap);
  }
  catalogs.forEach((c) => {
    appendEl(
      card,
      "p",
      c.status === "ABSENT" ? "empty" : "meta",
      "RoleCatalog." +
        c.id +
        " · " +
        (c.status || "UNKNOWN") +
        " · analog " +
        (c.analog || "NONE") +
        (c.researchRequired ? " · RESEARCH_REQUIRED" : "")
    );
  });
  const boxes = data.sandboxes || [];
  boxes.forEach((s) => {
    appendEl(
      card,
      "p",
      s.status === "ABSENT" ? "empty" : "hint",
      "Sandbox." + s.id + " · " + (s.status || "UNKNOWN") + " · " + (s.mode || "SIMULATION_ONLY") + " · liveData=" + String(s.liveData === true)
    );
  });
  const eng = data.engines || {};
  Object.keys(eng).forEach((k) => {
    const e = eng[k] || {};
    appendEl(card, "p", e.status === "ABSENT" ? "empty" : "meta", k + " · " + (e.status || "UNKNOWN") + " · analog " + (e.analog || "NONE"));
  });
  appendEl(card, "p", "empty", data.note || "Inspection only. Compile stays on the 9 archetypes. Not READY.");
  renderProfessionModuleExpansion(root, data.moduleExpansion || data, handlers && handlers.inspectedCatalogId);
  renderOsBlueprintIntegration(root, data.osBlueprints || data, handlers && handlers.inspectedCatalogId);
}

export function renderProfessionModuleExpansion(root, payload, inspectedCatalogId) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const professions = data.professions || [];
  if (!professions.length) return;
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Profession module expansion · analog contracts · not live domains");
  appendEl(card, "h3", null, "Unmapped profession adapters");
  appendEl(
    card,
    "p",
    "model-truth",
    "enabled=" +
      String(data.enabled === true) +
      " · liveDomainData=" +
      String(data.liveDomainData === true) +
      " · inventedSops=" +
      String(data.inventedSops === true) +
      " · ready=" +
      String(data.ready === true) +
      " · skipped " +
      ((data.health && data.health.skippedResearchRequired) || 0) +
      "/" +
      ((data.health && data.health.registered) || professions.length)
  );
  professions.forEach((p) => {
    const active = inspectedCatalogId && (inspectedCatalogId === p.id || inspectedCatalogId === p.catalogId);
    appendEl(
      card,
      "p",
      p.result === "SKIPPED_RESEARCH_REQUIRED" ? "empty" : "meta",
      (active ? "INSPECTING · " : "") +
        p.label +
        " · " +
        (p.catalogId || p.id) +
        " · " +
        (p.result || "UNKNOWN") +
        " · " +
        (p.series && p.series.label ? p.series.label : "series") +
        " · " +
        (p.decisionTemplate && p.decisionTemplate.title ? p.decisionTemplate.title : "decision")
    );
  });
  appendEl(card, "p", "empty", data.note || "ABSENT catalogs stay RESEARCH_REQUIRED. Supply-chain is STUB analog only. Not READY.");
}

export function renderOsBlueprintIntegration(root, payload, inspectedCatalogId) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const blueprints = data.blueprints || [];
  if (!blueprints.length) return;
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "OS blueprint integration · analog · not Palantir / SAP / SIEM");
  appendEl(card, "h3", null, "Cyber · Investment · Ops");
  appendEl(
    card,
    "p",
    "model-truth",
    "enabled=" +
      String(data.enabled === true) +
      " · liveSiem=" +
      String(data.liveSiem === true) +
      " · liveErp=" +
      String(data.liveErp === true) +
      " · nationalGraph=" +
      String(data.nationalGraph === true) +
      " · secondWorkflowEngine=" +
      String(data.secondWorkflowEngine === true) +
      " · ready=" +
      String(data.ready === true)
  );
  blueprints.forEach((b) => {
    const active = inspectedCatalogId && (inspectedCatalogId === b.id || inspectedCatalogId === b.catalogId);
    appendEl(
      card,
      "p",
      b.result === "SKIPPED_RESEARCH_REQUIRED" ? "empty" : "meta",
      (active ? "INSPECTING · " : "") +
        (b.label || b.id) +
        " · " +
        (b.catalogId || "") +
        " · " +
        (b.result || "UNKNOWN") +
        " · " +
        ((b.series && b.series.label) || "series")
    );
  });
  const kg = data.kg || {};
  appendEl(
    card,
    "p",
    "hint",
    "KG overlay · nationalGraph=" +
      String(kg.nationalGraph === true) +
      " · causalQueryEngine=" +
      (kg.causalQueryEngine || "UNKNOWN") +
      " · Person→entity · Decision→decision · layers " +
      (kg.layers ? Object.keys(kg.layers).join("/") : "UNKNOWN")
  );
  const sap = data.sapAlt || {};
  appendEl(
    card,
    "p",
    sap.hr && sap.hr.result === "SKIPPED_RESEARCH_REQUIRED" ? "empty" : "hint",
    "SAP-alt analog · finance/ops labels only · HR " +
      ((sap.hr && sap.hr.result) || "UNKNOWN") +
      " · secondEngine=" +
      String(sap.secondWorkflowEngine === true)
  );
  if (sap.integration) {
    appendEl(card, "p", "hint", "Integration · " + (sap.integration.predictionRisk || "") + " · autoDecide=false");
  }
  const map = data.moduleMapping || {};
  if (map.PredictionPanel) {
    appendEl(
      card,
      "p",
      "hint",
      "Module map · analog " +
        ((map.PredictionPanel.analog || []).join(", ") || "—") +
        " · RESEARCH_REQUIRED " +
        ((map.PredictionPanel.researchRequired || []).join(", ") || "—")
    );
  }
  (data.roleAliases || []).forEach((a) => {
    appendEl(card, "p", "hint", "Alias " + a.label + " → " + a.roleId + " · inventedArchetype=" + String(a.inventedArchetype === true));
  });
  appendEl(card, "p", "empty", data.note || "9 archetypes unchanged. Not a live SOC, broker, or ERP. Not READY.");
}

export function paintProfessionPanelAnalogs(expansion, inspectedCatalogId, opts) {
  opts = opts || {};
  const data = (expansion && expansion.data) || expansion || {};
  const professions = data.professions || [];
  const osPack = (opts.osBlueprints && opts.osBlueprints.data) || opts.osBlueprints || {};
  const osList = osPack.blueprints || [];
  const roleId = opts.roleId || "";
  const osHit =
    osList.find((b) => inspectedCatalogId && (b.catalogId === inspectedCatalogId || b.id === inspectedCatalogId)) ||
    osList.find((b) => (b.analogRoles || []).indexOf(roleId) >= 0) ||
    null;
  const profHit =
    professions.find((p) => p.catalogId === inspectedCatalogId || p.id === inspectedCatalogId) || null;
  const hit = osHit || profHit;
  const kind = osHit ? "OS BLUEPRINT ANALOG" : "PROFESSION ANALOG";
  const slots = [
    ["predProfessionHost", hit && hit.series, "Prediction adapter"],
    ["riskProfessionHost", hit && hit.riskMatrix, "Risk matrix adapter"],
    ["lineageProfessionHost", hit && hit.kgChain, "Lineage KG adapter"],
    ["evidenceProfessionHost", hit && hit.auditChain, "Evidence audit adapter"],
    ["dilProfessionHost", hit && hit.edgeDetector, "Intelligence edge adapter"],
    ["decisionsProfessionHost", hit && hit.decisionTemplate, "Decision template"],
  ];
  slots.forEach(([id, adapter, title]) => {
    const host = document.getElementById(id);
    if (!host) return;
    clearNode(host);
    if (!hit || !adapter) {
      appendEl(host, "p", "hint", title + " · no unmapped profession inspected.");
      return;
    }
    appendEl(host, "p", "level", kind + " · " + (hit.label || hit.id));
    const status = hit.result || "UNKNOWN";
    appendEl(host, "p", status === "SKIPPED_RESEARCH_REQUIRED" ? "empty" : "hint", title + " · " + status);
    if (adapter.label) appendEl(host, "p", "hint", adapter.label);
    if (adapter.title) appendEl(host, "p", "hint", adapter.title);
    if (adapter.rows) appendEl(host, "p", "hint", "rows " + adapter.rows.join(" · ") + " / cols " + (adapter.cols || []).join(" · "));
    if (adapter.nodes) appendEl(host, "p", "hint", "nodes " + adapter.nodes.join(" → "));
    if (adapter.steps) appendEl(host, "p", "hint", "steps " + adapter.steps.join(" → "));
    if (adapter.fields) appendEl(host, "p", "hint", "fields " + adapter.fields.join(" · ") + " · autoDecide=false");
    if (adapter.formula) appendEl(host, "p", "hint", "formula " + adapter.formula + " · edge UNKNOWN without analog payload");
    if (hit.entities) appendEl(host, "p", "hint", "entities " + hit.entities.join(" · "));
    if (hit.signals) appendEl(host, "p", "hint", "signals " + hit.signals.join(" · ") + " · live=false");
    appendEl(
      host,
      "p",
      "model-truth",
      "liveSiem=false · liveErp=false · liveDomainData=false · inventedSops=false · not a live " +
        String(hit.label || "domain") +
        " pack"
    );
  });
}

export function renderProfessionalCompile(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Workspace compilation test · SIMULATION_ONLY · not READY");
  appendEl(card, "h3", null, "Compile results");
  appendEl(
    card,
    "p",
    "model-truth",
    "ready=" +
      String(data.ready === true) +
      " · inventedSops=" +
      String(data.inventedSops === true) +
      " · archetypes " +
      (((data.health && data.health.archetypesExecuted) || 0) + "/" + ((data.uniqueArchetypes && data.uniqueArchetypes.length) || 0)) +
      " · skipped RESEARCH_REQUIRED " +
      ((data.health && data.health.skippedResearchRequired) || 0) +
      " · liveExecution=" +
      String((data.health && data.health.liveExecution) === true) +
      " · autoTrade=false · persisted=" +
      String(data.persisted === true)
  );
  (data.catalogs || []).forEach((c) => {
    appendEl(
      card,
      "p",
      c.result === "SKIPPED_RESEARCH_REQUIRED" ? "empty" : "meta",
      c.target + " · " + (c.result || "UNKNOWN") + (c.archetypes && c.archetypes.length ? " · " + c.archetypes.map((a) => a.roleId + " " + a.compilerStatus).join(", ") : "")
    );
  });
  (data.blueprints || []).forEach((b) => {
    appendEl(card, "p", b.result === "REFUSED" || b.status === "ABSENT" ? "empty" : "meta", b.id + " · " + (b.result || "UNKNOWN"));
  });
  (data.os || []).forEach((o) => {
    appendEl(card, "p", "hint", o.id + " · " + (o.result || "UNKNOWN"));
  });
  appendEl(card, "p", "empty", data.note || "SAFE compile. Unmapped domains RESEARCH_REQUIRED. Not READY.");
}

export function renderWorkspaceValidation(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Workspace validation wave · evidence over claim · not READY");
  appendEl(card, "h3", null, "Validation results");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · roles200Validated=" +
      String(data.roles200Validated === true) +
      " · evidenced " +
      (h.archetypesEvidenced || 0) +
      "/" +
      (h.rolesSeeded || 200) +
      " · FAIL " +
      (h.fail || 0) +
      " · PASS_CONSTRAINT " +
      (h.passConstraint || 0) +
      " · PARTIAL " +
      (h.partial || 0) +
      " · UNKNOWN " +
      (h.unknown || 0) +
      " · autoTrade=false · persisted=" +
      String(data.persisted === true)
  );
  function paint(list) {
    (list || []).forEach((c) => {
      appendEl(
        card,
        "p",
        c.verdict === "FAIL" || c.verdict === "UNKNOWN" || c.verdict === "SKIPPED" ? "empty" : "meta",
        c.id + " · " + (c.verdict || "UNKNOWN") + " · " + (c.evidence || "")
      );
    });
  }
  paint(data.roles);
  paint(data.sandboxes);
  paint(data.blueprints);
  paint(data.pipelines);
  paint(data.os);
  paint(data.safety);
  (data.probes || []).forEach((p) => {
    appendEl(
      card,
      "p",
      p.liveExecutionEnabled || p.liveBlocked === false ? "empty" : "hint",
      p.roleId +
        " · panels " +
        (p.panelCount || 0) +
        " · liveBlocked=" +
        String(p.liveBlocked === true) +
        " · jtbd " +
        (p.jtbdMission ? "yes" : "no") +
        " · science " +
        (p.modelScience || "UNKNOWN")
    );
  });
  appendEl(card, "p", "empty", data.note || "9 evidenced workspaces. 191 seeds UNKNOWN. Not READY.");
}

export function renderWorkspaceActivation(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Workspace activation wave · SAFE session mount · not READY");
  appendEl(card, "h3", null, "Activation results");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · roles200Activated=" +
      String(data.roles200Activated === true) +
      " · sessionActivation=" +
      String(data.sessionActivation === true) +
      " · enabledFull=" +
      String(data.enabledFull === true) +
      " · activated " +
      (h.archetypesActivated || 0) +
      "/" +
      (h.rolesSeeded || 200) +
      " · FAIL " +
      (h.fail || 0) +
      " · ACTIVATED_SIMULATION " +
      (h.activatedSimulation || 0) +
      " · ACTIVATED_ANALOG " +
      (h.activatedAnalog || 0) +
      " · REFUSED " +
      (h.refused || 0) +
      " · SKIPPED " +
      (h.skipped || 0) +
      " · autoTrade=false · persisted=" +
      String(data.persisted === true)
  );
  function paint(list) {
    (list || []).forEach((c) => {
      appendEl(
        card,
        "p",
        c.result === "FAIL" || c.result === "SKIPPED_UNKNOWN" || c.result === "SKIPPED_RESEARCH_REQUIRED" || c.result === "REFUSED"
          ? "empty"
          : "meta",
        c.id + " · " + (c.result || "UNKNOWN") + " · " + (c.evidence || "")
      );
    });
  }
  paint(data.roles);
  paint(data.sandboxes);
  paint(data.blueprints);
  paint(data.pipelines);
  paint(data.os);
  paint(data.safety);
  (data.probes || []).forEach((p) => {
    appendEl(
      card,
      "p",
      p.liveExecutionEnabled || p.liveBlocked === false || p.activation === "FAIL" ? "empty" : "hint",
      p.roleId +
        " · " +
        (p.activation || "UNKNOWN") +
        " · panels " +
        (p.panelCount || 0) +
        " · liveBlocked=" +
        String(p.liveBlocked === true)
    );
  });
  appendEl(card, "p", "empty", data.note || "9 session-mounted workspaces. 191 seeds UNKNOWN. LDA REFUSED. Not READY.");
}

export function renderWorkspaceStabilization(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Workspace stabilization wave · reconcile leftovers · not READY");
  appendEl(card, "h3", null, "Stabilized inventory");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · stabilized=" +
      String(data.stabilized === true) +
      " · roles200Stabilized=" +
      String(data.roles200Stabilized === true) +
      " · consistent " +
      (h.archetypesConsistent || 0) +
      "/" +
      (h.rolesSeeded || 200) +
      " · incomplete " +
      (h.incomplete || 0) +
      " · disabledViews " +
      (h.disabledViews || 0) +
      " · pipelines " +
      (h.consistentPipelines || 0) +
      " · autoTrade=false · persisted=" +
      String(data.persisted === true)
  );
  const rec = data.reconcile || {};
  Object.keys(rec).forEach((k) => {
    appendEl(card, "p", rec[k] === "FAIL" || rec[k] === "DISABLED" || rec[k] === "UNKNOWN" || rec[k] === "REFUSED" ? "empty" : "meta", k + " · " + rec[k]);
  });
  (data.consistentPipelines || []).forEach((id) => {
    appendEl(card, "p", "hint", "kept pipeline · " + id);
  });
  (data.disabledViews || []).forEach((v) => {
    appendEl(card, "p", "empty", "disabled view · " + v.id + " · " + (v.reason || "ABSENT"));
  });
  appendEl(card, "p", "empty", data.note || "9 consistent specs. 191 incomplete. ABSENT views disabled. LDA refused. Not READY.");
}

export function renderDigitalActivation(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Digital activation wave · inspect + refuse · not READY");
  appendEl(card, "h3", null, "Requested DIGITAL enable");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · digitalRuntime=" +
      String(data.digitalRuntime === true) +
      " · nationalGraph=" +
      String(data.nationalGraph === true) +
      " · causalQuery=" +
      String(data.causalQuery === true) +
      " · ldaPass=" +
      String(data.ldaPass === true) +
      " · seedsComplete=" +
      String(data.seedsComplete || 0) +
      "/191 · roles200Stabilized=" +
      String(data.roles200Stabilized === true) +
      " · autoTrade=false · persisted=" +
      String(data.persisted === true)
  );
  (data.kg || []).concat(data.ldaChecks || []).forEach((c) => {
    appendEl(card, "p", c.result === "REFUSED" || c.result === "FAIL" ? "empty" : "meta", c.id + " · " + c.result);
  });
  (data.domains || []).forEach((c) => {
    appendEl(card, "p", c.result === "SKIPPED_RESEARCH_REQUIRED" || c.result === "REFUSED" ? "empty" : "meta", c.id + " · " + c.result);
  });
  appendEl(
    card,
    "p",
    "empty",
    data.note ||
      "National graph, causal query, LDA PASS, 191 seed COMPLETE, and 200/200 roles are REFUSED. Analog contracts remain analog. Not READY."
  );
}

export function renderPrecisionUpgrade(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Precision upgrade · analog overlay · not Palantir · not READY");
  appendEl(card, "h3", null, "KG spine · domain flow · module flow");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · showCausalPaths=" +
      String(data.showCausalPaths === true) +
      " · minSeriesLengthEnforced=" +
      String(data.minSeriesLengthEnforced === true) +
      " · analog " +
      (h.analogContract || 0) +
      " · refused " +
      (h.refused || 0) +
      " · skipped " +
      (h.skippedResearchRequired || 0) +
      " · autoTrade=false · persisted=" +
      String(data.persisted === true)
  );
  const layers = (data.kgSpine && data.kgSpine.layers) || [];
  layers.forEach((layer) => {
    appendEl(
      card,
      "p",
      "hint",
      (layer.label || layer.id) +
        " · " +
        ((layer.nodes || []).join(" · ") || "—") +
        " · populated=" +
        String(layer.populated === true)
    );
  });
  (data.domainFlows || []).forEach((c) => {
    appendEl(card, "p", c.result === "SKIPPED_RESEARCH_REQUIRED" || c.result === "REFUSED" || c.result === "FAIL" ? "empty" : "meta", c.id + " · " + c.result);
  });
  (data.spine || []).concat(data.precision || []).forEach((c) => {
    if (c.id === "Precision.minSeriesLength" || c.id === "KG.spine.causalPaths") {
      appendEl(card, "p", "empty", c.id + " · " + c.result);
    }
  });
  appendEl(
    card,
    "p",
    "empty",
    data.note ||
      "Causal paths, hospitality/healthcare enable, and pad-to-30 series are REFUSED. Analog contracts remain analog. Not READY."
  );
}

export function paintPrecisionOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const layers = (data.kgSpine && data.kgSpine.layers) || [];
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage && layers.length) {
    appendEl(lineage, "p", "level", "KG spine analog · layered · causalPaths=false");
    layers.forEach((layer) => {
      appendEl(
        lineage,
        "p",
        "hint",
        (layer.label || layer.id) +
          " · " +
          ((layer.nodes || []).join(" · ") || "—") +
          " · populated=false"
      );
    });
    appendEl(lineage, "p", "empty", "showCausalPaths REFUSED · causalQueryEngine ABSENT · not Palantir");
  }
  const flows = data.cockpitFlows || {};
  const map = {
    PredictionPanel: "predProfessionHost",
    RiskPanel: "riskProfessionHost",
    LineagePanel: "lineageProfessionHost",
    EvidencePanel: "evidenceProfessionHost",
    Intelligence: "dilProfessionHost",
    Decisions: "decisionsProfessionHost",
  };
  Object.keys(map).forEach((panel) => {
    const host = document.getElementById(map[panel]);
    const flow = flows[panel];
    if (!host || !flow) return;
    appendEl(
      host,
      "p",
      "hint",
      "flow " +
        (flow.process || "inspect") +
        " · analog " +
        ((flow.analog || []).join(", ") || "—") +
        (flow.researchRequired && flow.researchRequired.length ? " · RESEARCH_REQUIRED " + flow.researchRequired.join(", ") : "") +
        (flow.causalPaths === false ? " · causalPaths=false" : "") +
        (flow.autoDecide === false ? " · autoDecide=false" : "")
    );
  });
  const hosp = data.researchFlows && data.researchFlows.hospitality;
  const pred = document.getElementById("predProfessionHost");
  if (pred && hosp) {
    appendEl(pred, "p", "empty", "Hospitality research schema inspect-only · occupancy not computed · series UNKNOWN");
  }
}

export function renderCyberResearchBridge(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Cyber research + investment bridge · analog overlay · not READY");
  appendEl(card, "h3", null, "Cyber PARTIAL · RESEARCH_COMPLETE refused");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · researchComplete=" +
      String(data.researchComplete === true) +
      " · domainEnabled=" +
      String(data.domainEnabled === true) +
      " · liveSiem=" +
      String(data.liveSiem === true) +
      " · livePnlImpact=" +
      String(data.livePnlImpact === true) +
      " · analog " +
      (h.analogContract || 0) +
      " · refused " +
      (h.refused || 0) +
      " · autoTrade=false · persisted=" +
      String(data.persisted === true)
  );
  (data.research || []).concat(data.enable || []).forEach((c) => {
    if (c.id === "Cyber.researchComplete" || c.id === "Cyber.enableDomain" || c.id === "Cyber.requiredArtifacts") {
      appendEl(card, "p", "empty", c.id + " · " + c.result);
    }
  });
  const spec = data.bridgeSpec || {};
  appendEl(
    card,
    "p",
    "hint",
    "Bridge overlay · " +
      (spec.bridgeNode || "RiskEvent") +
      "→" +
      (spec.wave1Kind || "risk") +
      " · " +
      ((spec.chain || []).join(" → ") || "Case → RiskEvent → Scenario → PnL") +
      " · populated=false"
  );
  (data.bridge || []).forEach((c) => {
    appendEl(card, "p", c.result === "REFUSED" || c.result === "SKIPPED_RESEARCH_REQUIRED" ? "empty" : "meta", c.id + " · " + c.result);
  });
  const nx = data.next || {};
  appendEl(card, "p", "hint", "NOW " + (nx.now || "cyber analog") + " · NEXT " + (nx.next || "investment overlay"));
  appendEl(card, "p", "empty", data.note || "Cyber analog is PARTIAL. RESEARCH_COMPLETE and enableDomain refused. Not READY.");
}

export function paintCyberBridgeOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const spec = data.bridgeSpec || {};
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage && spec.bridgeNode) {
    appendEl(lineage, "p", "level", "Cyber↔Investment bridge analog · livePnlImpact=false");
    appendEl(
      lineage,
      "p",
      "hint",
      (spec.chain || []).join(" → ") + " · " + (spec.bridgeNode || "RiskEvent") + "→" + (spec.wave1Kind || "risk")
    );
    appendEl(lineage, "p", "empty", "scenarios populated=false · causal engine ABSENT");
  }
  const pred = document.getElementById("predProfessionHost");
  if (pred) {
    appendEl(pred, "p", "empty", "Cyber enable REFUSED · empty series UNKNOWN · not RESEARCH_COMPLETE");
  }
  const dec = document.getElementById("decisionsProfessionHost");
  if (dec) {
    appendEl(dec, "p", "hint", "bridge responses overlay · autoDecide=false · not fired from a cyber case");
  }
}

export function renderActivationReview(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Activation review · REFUSED stays REFUSED · not READY");
  appendEl(card, "h3", null, "LDA · Digital KG · Seeds · Roles");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · ldaPass=" +
      String(data.ldaPass === true) +
      " · nationalGraph=" +
      String(data.nationalGraph === true) +
      " · seedsComplete=" +
      String(data.seedsComplete || 0) +
      "/191 · roles200Stabilized=" +
      String(data.roles200Stabilized === true) +
      " · computeEnabled=" +
      String(data.computeEnabled === true) +
      " · unlocked " +
      (h.layersUnlocked || 0) +
      "/4 · autoTrade=false · persisted=" +
      String(data.persisted === true)
  );
  (data.layers || []).forEach((c) => {
    appendEl(card, "p", "empty", c.id + " · " + c.result);
  });
  (data.domains || []).forEach((c) => {
    appendEl(card, "p", c.result === "SKIPPED_RESEARCH_REQUIRED" || c.result === "REFUSED" ? "empty" : "meta", c.id + " · " + c.result);
  });
  (data.next || []).forEach((c) => {
    appendEl(card, "p", "hint", c.id + " · " + c.result);
  });
  appendEl(card, "p", "empty", data.note || "LDA, digital KG, 191 seeds, 200/200 roles, ABSENT enable, and INSPECT→COMPUTE stay REFUSED. Not READY.");
}

export function paintActivationReviewOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const pred = document.getElementById("predProfessionHost");
  if (pred) {
    appendEl(pred, "p", "empty", "COMPUTE REFUSED · INSPECT_ONLY · ldaPass=false · empty series UNKNOWN");
  }
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage) {
    appendEl(lineage, "p", "empty", "nationalGraph=false · causalQuery=false · next-wave ledger PREPARED_DISABLED");
  }
  const dec = document.getElementById("decisionsProfessionHost");
  if (dec) {
    appendEl(dec, "p", "hint", "autoDecide=false · live feeds ABSENT · SIEM/broker/ERP not flipped");
  }
}

export function renderEnterprisePrep(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Enterprise prep · analog overlay · not live SIEM/ERP · not READY");
  appendEl(card, "h3", null, "Scenarios · ledger · live feeds");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · liveIngestion=" +
      String(data.liveIngestion === true) +
      " · durableLedger=" +
      String(data.durableLedger === true) +
      " · crossDomainEngine=" +
      String(data.crossDomainEngine === true) +
      " · analog " +
      (h.analogContract || 0) +
      " · refused " +
      (h.refused || 0) +
      " · autoTrade=false · persisted=" +
      String(data.persisted === true)
  );
  (data.scenarios || []).forEach((c) => {
    appendEl(card, "p", c.result === "ANALOG_CONTRACT" ? "meta" : "empty", c.id + " · " + c.result);
  });
  (data.ledger || []).concat(data.live || []).forEach((c) => {
    if (c.id === "Ledger.enableDurable" || c.id === "Feed.enableLiveIngestion") {
      appendEl(card, "p", "empty", c.id + " · " + c.result);
    }
  });
  appendEl(card, "p", "empty", data.note || "Live SIEM/broker/ERP, durable ledger, and ABSENT-domain propagation stay REFUSED. Not READY.");
}

export function paintEnterprisePrepOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage) {
    appendEl(lineage, "p", "level", "Cross-domain scenarios analog · populated=false");
    (data.scenarioCatalog || []).forEach((s) => {
      appendEl(
        lineage,
        "p",
        s.analog ? "hint" : "empty",
        (s.id || "scenario") + " · " + (s.from || "?") + "→" + (s.to || "?") + " · live=" + String(s.live === true)
      );
    });
  }
  const pred = document.getElementById("predProfessionHost");
  if (pred) {
    appendEl(pred, "p", "empty", "liveIngestion=false · SIEM/broker/ERP ABSENT · durableLedger=false");
  }
}

export function renderAutomationPrep(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Automation prep · HITL · autoDecide=false · not READY");
  appendEl(card, "h3", null, "Auto-audit · limits · scenario generation");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · autoAudit=" +
      String(data.autoAudit === true) +
      " · autoLimits=" +
      String(data.autoLimits === true) +
      " · autoScenarios=" +
      String(data.autoScenarios === true) +
      " · autoDecide=" +
      String(data.autoDecide === true) +
      " · frozen=" +
      (h.accountsFrozen || 0) +
      " · held=" +
      (h.paymentsHeld || 0) +
      " · generated=" +
      (h.scenariosGenerated || 0) +
      " · persisted=" +
      String(data.persisted === true)
  );
  (data.audit || []).concat(data.limits || []).concat(data.scenarios || []).forEach((c) => {
    if (c.result === "REFUSED" || c.result === "SKIPPED_RESEARCH_REQUIRED") {
      appendEl(card, "p", "empty", c.id + " · " + c.result);
    }
  });
  appendEl(card, "p", "hint", "HITL · AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(card, "p", "empty", data.note || "Continuous auto-audit, automatic freeze/hold/block, and data-driven scenario generation stay REFUSED. Not READY.");
}

export function paintAutomationPrepOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const ev = document.getElementById("evidenceProfessionHost");
  if (ev) {
    appendEl(ev, "p", "empty", "autoAudit=false · continuous=false · analog chain only");
  }
  const dec = document.getElementById("decisionsProfessionHost");
  if (dec) {
    appendEl(dec, "p", "empty", "autoLimits=false · freeze/hold/block REFUSED · HITL required");
  }
}

export function renderVisibilityPrep(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Visibility prep · Snow/Navy · radius=0 · one Cockpit · not READY");
  appendEl(card, "h3", null, "Honest status · not gradual activation");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · gradual=" +
      String(data.gradual === true) +
      " · analogToDigital=" +
      String(data.analogToDigitalHints === true) +
      " · digitalReadyMarkers=" +
      String(data.digitalReadyMarkers === true) +
      " · domainProgressBars=" +
      String(data.showDomainProgress === true) +
      " · enginesReady=" +
      (h.enginesReady || 0) +
      " · persisted=" +
      String(data.persisted === true)
  );
  (data.visibility || []).concat(data.engines || []).forEach((c) => {
    if (c.result === "REFUSED" || c.result === "SKIPPED_RESEARCH_REQUIRED") {
      appendEl(card, "p", "empty", c.id + " · " + c.result);
    }
  });
  (data.domains || []).forEach((d) => {
    appendEl(
      card,
      "p",
      d.result === "SKIPPED_RESEARCH_REQUIRED" || d.enable === true ? "empty" : "hint",
      "domain " +
        (d.id || "?") +
        " · " +
        (d.result || "UNKNOWN") +
        " · enable=" +
        String(d.enable === true) +
        " · digital-ready=" +
        String(d.digitalReady === true) +
        " · bar=" +
        String(d.progressBar === true)
    );
  });
  appendEl(card, "p", "hint", "HITL · AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(
    card,
    "p",
    "empty",
    data.note ||
      "Gradual activation, analog→digital hints, research→enable bars, and digital-ready KG markers stay REFUSED. Not READY."
  );
}

export function paintVisibilityPrepOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const ev = document.getElementById("evidenceProfessionHost");
  if (ev) {
    appendEl(ev, "p", "empty", "audit-hint · REFUSED · analog inspect · not activating");
  }
  const dec = document.getElementById("decisionsProfessionHost");
  if (dec) {
    appendEl(dec, "p", "empty", "limit-hint · REFUSED · HITL · autoDecide=false");
  }
  const pred = document.getElementById("predProfessionHost");
  if (pred) {
    appendEl(pred, "p", "empty", "scenario-hint · REFUSED · generated=" + ((data.health && data.health.scenariosGenerated) || 0));
  }
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage) {
    appendEl(lineage, "p", "empty", "digital-ready=false · causalPaths=false · enable bar REFUSED");
  }
}

export function renderVisibilityActivation(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Visibility episodes · visibility-prep stays REFUSED · not READY");
  appendEl(card, "h3", null, "10 episodes scored · PASS not granted");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · visibilityPrep=" +
      (data.visibilityPrepWave || "UNKNOWN") +
      " · passGranted=" +
      String(data.passGranted === true) +
      " · enginesReady=" +
      String(data.enginesDeclaredReady === true) +
      " · kgDigitalReady=" +
      String(data.kgDigitalReady === true) +
      " · gradual=" +
      String(data.gradual === true) +
      " · episodesPassed=" +
      (h.episodesPassed || 0) +
      " · persisted=" +
      String(data.persisted === true)
  );
  (data.episodes || []).forEach((c) => {
    appendEl(card, "p", c.result === "ANALOG_CONTRACT" ? "hint" : "empty", "E" + c.episode + " · " + c.id + " · " + c.result);
  });
  const progress = data.domainProgress || {};
  Object.keys(progress).forEach((id) => {
    const d = progress[id] || {};
    appendEl(
      card,
      "p",
      "empty",
      "domain " +
        id +
        " · requested=" +
        String(d.requested) +
        " · applied=" +
        String(d.applied === true) +
        " · " +
        (d.result || "UNKNOWN")
    );
  });
  appendEl(card, "p", "hint", "HITL · AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(
    card,
    "p",
    "empty",
    data.note || "Re-requesting PASS does not create evidence. visibility-prep stays REFUSED. Not READY."
  );
}

export function paintVisibilityActivationOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const ev = document.getElementById("evidenceProfessionHost");
  if (ev) {
    appendEl(ev, "p", "empty", "episodes PASS=0 · engine link live=false · analog inspect");
  }
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage) {
    appendEl(lineage, "p", "empty", "kgDigitalReady=" + String(data.kgDigitalReady === true) + " · kgCausalReady=" + String(data.kgCausalReady === true));
  }
}

export function renderVisibilityDeep(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Visibility deep · activation stays REFUSED · not READY");
  appendEl(card, "h3", null, "Deep governance episodes · PASS not granted");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · activation=" +
      (data.visibilityActivationWave || "UNKNOWN") +
      " · prep=" +
      (data.visibilityPrepWave || "UNKNOWN") +
      " · passGranted=" +
      String(data.passGranted === true) +
      " · deepApproved=" +
      String(data.deepGovernanceApproved === true) +
      " · specsValidated=" +
      String(data.engineSpecsValidated === true) +
      " · kgCausalReady=" +
      String(data.kgCausalReady === true) +
      " · gradual=" +
      String(data.gradual === true) +
      " · episodesPassed=" +
      (h.episodesPassed || 0) +
      " · persisted=" +
      String(data.persisted === true)
  );
  (data.episodes || []).forEach((c) => {
    appendEl(card, "p", "empty", "E" + c.episode + " · " + c.id + " · " + c.result);
  });
  appendEl(card, "p", "hint", "HITL · AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(
    card,
    "p",
    "empty",
    data.note || "Deep APPROVED/validated stamps do not create evidence. visibility-activation stays REFUSED. Not READY."
  );
}

export function paintVisibilityDeepOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const ev = document.getElementById("evidenceProfessionHost");
  if (ev) {
    appendEl(ev, "p", "empty", "deep stamps applied=0 · cockpit binding approved=false");
  }
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage) {
    appendEl(lineage, "p", "empty", "causal_ready=" + String(data.kgCausalReady === true) + " · passGranted=" + String(data.passGranted === true));
  }
}

export function renderExplainabilityPrep(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Explainability prep · HITL already product · not READY");
  appendEl(card, "h3", null, "Explain · review · causal preview");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · ready=" +
      String(data.ready === true) +
      " · causalPaths=" +
      String(data.showCausalPaths === true) +
      " · unifiedBus=" +
      String(data.unifiedExplainBus === true) +
      " · secondReview=" +
      String(data.secondReviewFlow === true) +
      " · explained=" +
      (h.autoActionsExplained || 0) +
      " · persisted=" +
      String(data.persisted === true)
  );
  (data.episodes || []).forEach((c) => {
    appendEl(card, "p", c.result === "ANALOG_CONTRACT" ? "hint" : "empty", "E" + c.episode + " · " + c.id + " · " + c.result);
  });
  appendEl(card, "p", "hint", "HITL · AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(
    card,
    "p",
    "empty",
    data.note || "Cannot explain an auto-action that did not fire. Causal preview REFUSED. Not READY."
  );
}

export function paintExplainabilityPrepOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const ev = document.getElementById("evidenceProfessionHost");
  if (ev) {
    appendEl(ev, "p", "empty", "root-cause REFUSED · auto-actions explained=0");
  }
  const dec = document.getElementById("decisionsProfessionHost");
  if (dec) {
    appendEl(dec, "p", "hint", "HITL already product · secondReviewFlow=" + String(data.secondReviewFlow === true));
  }
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage) {
    appendEl(lineage, "p", "empty", "showCausalPaths=" + String(data.showCausalPaths === true) + " · unifiedBus=" + String(data.unifiedExplainBus === true));
  }
}

export function renderExplainVisibility(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Named builds · inspect-only · passGranted=false · not READY");
  appendEl(card, "h3", null, "Seven commands + master · none applied");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · passGranted=" +
      String(data.passGranted === true) +
      " · gradual=" +
      String(data.gradual === true) +
      " · causalPaths=" +
      String(data.showCausalPaths === true) +
      " · unifiedBus=" +
      String(data.unifiedExplainBus === true) +
      " · applied=" +
      (h.applied || 0) +
      " · persisted=" +
      String(data.persisted === true)
  );
  const builds = data.builds || {};
  Object.keys(builds).forEach((k) => {
    const b = builds[k] || {};
    appendEl(card, "p", b.result === "ANALOG_CONTRACT" ? "hint" : "empty", k + " · " + (b.result || "UNKNOWN") + " · applied=" + String(b.applied === true));
  });
  (data.domainExplainButtons || []).forEach((d) => {
    appendEl(
      card,
      "p",
      d.live === true ? "empty" : "hint",
      (d.button || d.id) + " · live=" + String(d.live === true) + " · " + (d.result || "UNKNOWN")
    );
  });
  appendEl(card, "p", "hint", "HITL · AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(card, "p", "empty", data.note || "Master does not enable. visibility-activation stays REFUSED. Not READY.");
}

export function paintExplainVisibilityOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const ev = document.getElementById("evidenceProfessionHost");
  if (ev) {
    appendEl(ev, "p", "empty", "named builds applied=0 · passGranted=" + String(data.passGranted === true));
  }
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage) {
    appendEl(lineage, "p", "empty", "gradual=" + String(data.gradual === true) + " · Hospitality Explain SKIPPED");
  }
}

export function renderDigitalWorkspaceCompute(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "Digital KG + desks + COMPUTE · inspect-only · not READY");
  appendEl(card, "h3", null, "ANALOG_OVERLAY · INSPECT_ONLY · no second desk");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · kgStatus=" +
      (data.kgStatus || "UNKNOWN") +
      " · nationalGraph=" +
      String(data.nationalGraph === true) +
      " · computeMode=" +
      (data.computeMode || "UNKNOWN") +
      " · desksCreated=" +
      (h.desksCreated || 0) +
      " · applied=" +
      (h.applied || 0) +
      " · persisted=" +
      String(data.persisted === true)
  );
  const builds = data.builds || {};
  Object.keys(builds).forEach((k) => {
    const b = builds[k] || {};
    appendEl(card, "p", b.result === "ANALOG_CONTRACT" ? "hint" : "empty", k + " · " + (b.result || "UNKNOWN") + " · applied=" + String(b.applied === true));
  });
  const desks = (builds.domainWorkspaces && builds.domainWorkspaces.workspaces) || [];
  desks.forEach((w) => {
    appendEl(
      card,
      "p",
      w.deskCreated === true ? "empty" : "hint",
      (w.desk || w.id) + " · live=" + String(w.live === true) + " · created=" + String(w.deskCreated === true) + " · " + (w.result || "UNKNOWN")
    );
  });
  appendEl(card, "p", "hint", "HITL · AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(card, "p", "empty", data.note || "KG stays analog overlay. COMPUTE REFUSED. Not READY.");
}

export function paintDigitalWorkspaceComputeOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const ev = document.getElementById("evidenceProfessionHost");
  if (ev) {
    appendEl(ev, "p", "empty", "desksCreated=0 · COMPUTE REFUSED");
  }
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage) {
    appendEl(lineage, "p", "empty", "kgStatus=" + (data.kgStatus || "ANALOG_OVERLAY") + " · nationalGraph=" + String(data.nationalGraph === true));
  }
}

export function renderActivationPass(root, payload) {
  if (!root) return;
  const data = (payload && payload.data) || payload || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "MASTER ACTIVATION SUITE · inspect-only · not READY");
  appendEl(card, "h3", null, "REFUSED stays REFUSED · applied=NONE");
  const h = data.health || {};
  appendEl(
    card,
    "p",
    "model-truth",
    "wave=" +
      (data.wave || "UNKNOWN") +
      " · applied=" +
      (data.applied || "NONE") +
      " · ready=" +
      String(data.ready === true) +
      " · persisted=" +
      String(data.persisted === true) +
      " · sealed=" +
      (h.sealed || 0) +
      " · enginesActivated=" +
      (h.enginesActivated || 0)
  );
  const steps = data.steps || {};
  Object.keys(steps).forEach((k) => {
    const s = steps[k] || {};
    appendEl(card, "p", s.result === "ANALOG_CONTRACT" ? "hint" : "empty", k + " · " + (s.result || "UNKNOWN") + " · sealed=" + String(s.sealed === true));
  });
  appendEl(card, "p", "hint", "HITL · AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(card, "p", "empty", data.note || "Master suite does not stamp READY. Not READY.");
}

export function paintActivationPassOverlay(pack) {
  const data = (pack && pack.data) || pack || {};
  const ev = document.getElementById("evidenceProfessionHost");
  if (ev) {
    appendEl(ev, "p", "empty", "master suite applied=NONE · ready=" + String(data.ready === true));
  }
  const lineage = document.getElementById("lineageProfessionHost");
  if (lineage) {
    appendEl(lineage, "p", "empty", "persisted=" + String(data.persisted === true) + " · REFUSED stays REFUSED");
  }
}

export function renderDilConsole(root, payload, handlers) {
  clearNode(root);
  if (root && root.setAttribute) root.setAttribute("aria-busy", "false");
  if (!payload) {
    createEmptyState(root, "NO DECISION INTELLIGENCE DATA");
    return;
  }
  const data = payload.data || payload;
  const honesty = data.honesty || {};
  const banner = appendEl(root, "div", "sci-callout");
  const feeds = data.feeds || {};
  appendEl(banner, "p", "level", "ALPHA_NON_PRODUCTION · feed " + (feeds.actual || "simulated_alpha") + " · live adapter " + (feeds.liveAdapter || "ABSENT") + " · no auto-trade");
  appendEl(
    banner,
    "p",
    "hint",
    honesty.note ||
      "Edge-seeking decision support. Agent proposes; you decide. Not a 90% win-rate claim."
  );
  if (feeds.liveAdapter && feeds.liveAdapter !== "ABSENT") {
    appendEl(banner, "p", "model-truth", feeds.note || "Live ticks UNVERIFIED — not venue-certified.");
  }
  const bi = feeds.bookIntegrity || {};
  if (typeof bi.orphanMarkets === "number" && bi.orphanMarkets > 0) {
    appendEl(
      banner,
      "p",
      "empty",
      "UNKNOWN — " + bi.orphanMarkets + " market(s) have no ECL instrument (bookIntegrity). Live adapter still not a trade."
    );
  }
  appendEl(
    banner,
    "p",
    "meta",
    "Ledger " + (bi.ledgerMode || "in-memory") + " · durable=" + String(bi.durable === true) + " · OIDC ABSENT · OTLP ABSENT · hooks prepared enabled=false"
  );
  renderFeedRegistry(root, feeds.registry);
  renderRealisticSim(root, data.realisticSim);
  renderCalibrationPanel(root, data.calibration);

  const g = data.guardrail || {};
  const rail = appendEl(root, "div", "guardrail-bar " + (g.breaches && g.breaches.length ? "breach" : "ok"));
  appendEl(rail, "strong", null, "Guardrail");
  renderStatusChip(rail, toneForGuardrail(g), g.breaches && g.breaches.length ? "WARN" : "OK");
  appendEl(rail, "span", "hint", g.recommendation || "within_limits");
  if (g.limits) {
    appendEl(
      rail,
      "span",
      "meta",
      "max daily loss " +
        fmtNum(g.limits.maxDailyLoss, 0) +
        " · max size " +
        fmtNum(g.limits.maxPositionSize, 0) +
        " · concentration " +
        fmtPct(g.limits.maxConcentration)
    );
  }

  const tools = appendEl(root, "div", "dil-toolbar");
  appendEl(tools, "span", "level", "Time horizon");
  ["5m", "24h", "72h"].forEach((h) => {
    const b = appendEl(tools, "button", "ghost" + (data.horizon === h ? " on" : ""), h);
    b.type = "button";
    b.setAttribute("data-action-id", "dil.horizon." + h);
    b.onclick = () => handlers && handlers.onHorizon && handlers.onHorizon(h);
  });
  const venueFilter = appendEl(tools, "select", null, null);
  venueFilter.setAttribute("aria-label", "Venue filter");
  ["all", "polymarket", "kalshi"].forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v === "all" ? "All venues" : v;
    venueFilter.appendChild(o);
  });
  const sortSel = appendEl(tools, "select", null, null);
  sortSel.setAttribute("aria-label", "Sort");
  [
    ["edge", "Sort by |edge|"],
    ["risk", "Sort by risk"],
    ["volume", "Sort by volume"],
  ].forEach(([v, t]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = t;
    sortSel.appendChild(o);
  });

  const metrics = appendEl(root, "div", "sci-metrics");
  const rows = (data.rows || []).slice();
  const whales = rows.filter((r) => r.edge && r.edge.whaleFlag);
  const mis = rows.filter((r) => r.edge && r.edge.mispricingFlag);
  [
    ["Markets", String(rows.length), "Simulated Polymarket + Kalshi snapshot"],
    ["Whale flags", String(whales.length), "Large last-trade prints"],
    ["Mispricing flags", String(mis.length), " |edge| ≥ 10 pts"],
    ["Bankroll", fmtNum(data.bankroll && data.bankroll.totalEquity, 0), "Cash + margin + MTM − reserved"],
  ].forEach((m) => {
    const c = appendEl(metrics, "div", "pro-card");
    appendEl(c, "p", "level", m[2]);
    appendEl(c, "h3", null, m[0]);
    appendEl(c, "div", "val", m[1]);
  });

  const maps = appendEl(root, "div", "dil-maps");
  const edgeMap = appendEl(maps, "div", "pro-card");
  appendEl(edgeMap, "p", "level", "Where is the edge?");
  appendEl(edgeMap, "h3", null, "Edge map");
  const edgeGrid = appendEl(edgeMap, "div", "heat-grid");
  const riskMap = appendEl(maps, "div", "pro-card");
  appendEl(riskMap, "p", "level", "What size fits the bankroll?");
  appendEl(riskMap, "h3", null, "Risk map");
  const riskGrid = appendEl(riskMap, "div", "heat-grid");

  const tableHost = appendEl(root, "div", "pro-card");
  appendEl(tableHost, "p", "level", "Market overview");
  appendEl(tableHost, "h3", null, "Prediction markets");
  const table = appendEl(tableHost, "div", "sci-table");

  const rec = appendEl(root, "div", "pro-card rec-panel");
  appendEl(rec, "p", "level", "AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(rec, "h3", null, "Recommendation");
  const recBody = appendEl(rec, "p", "hint", "Select a market, then request a proposal. The agent cannot open a position.");

  const whaleHost = appendEl(root, "div", "pro-card");
  appendEl(whaleHost, "p", "level", "Last prints");
  appendEl(whaleHost, "h3", null, "Whale tracker");
  if (!whales.length) appendEl(whaleHost, "p", "empty", "No whale flags on this snapshot.");
  whales.forEach((r) => {
    const line = appendEl(whaleHost, "p", "hint", null);
    line.textContent =
      (r.market.title || r.market.marketId) +
      " · size " +
      fmtNum((r.market.lastTrades || []).filter((t) => t.whale).reduce((s, t) => s + t.size, 0), 0);
  });

  const sigHost = appendEl(root, "div", "pro-card");
  appendEl(sigHost, "p", "level", "News / social / on-chain / macro — STUB or MANUAL");
  appendEl(sigHost, "h3", null, "Signals");
  if (!(data.signals || []).length) {
    appendEl(sigHost, "p", "empty", "NO SIGNALS — news / social / on-chain remain STUB.");
  }
  (data.signals || []).forEach((s) => {
    appendEl(sigHost, "p", "hint", "[" + s.sourceStatus + "] " + s.kind + " — " + s.text);
  });

  function paint() {
    const venue = venueFilter.value;
    const sort = sortSel.value;
    let list = rows.filter((r) => venue === "all" || (r.market && r.market.venue === venue));
    list.sort((a, b) => {
      if (sort === "risk") return (b.risk && b.risk.riskScore ? b.risk.riskScore : 0) - (a.risk && a.risk.riskScore ? a.risk.riskScore : 0);
      if (sort === "volume") return (b.market.volume || 0) - (a.market.volume || 0);
      return Math.abs((b.edge && b.edge.edgeScore) || 0) - Math.abs((a.edge && a.edge.edgeScore) || 0);
    });
    clearNode(edgeGrid);
    clearNode(riskGrid);
    clearNode(table);
    const head = appendEl(table, "div", "sci-row head");
    ["Market", "Venue", "Implied", "Model", "Edge", "Conf.", "Risk", "Size", "Flags"].forEach((h) =>
      appendEl(head, "span", null, h)
    );
    if (!list.length) {
      appendEl(edgeGrid, "p", "empty", "NO MARKETS for this venue filter.");
      appendEl(riskGrid, "p", "empty", "NO RISK CELLS for this venue filter.");
      appendEl(table, "p", "empty", "NO MARKETS — simulated book has no rows for this filter.");
      return;
    }
    list.forEach((r) => {
      const m = r.market || {};
      const e = r.edge || {};
      const p = r.probability || {};
      const rk = r.risk || {};
      const eh = appendEl(edgeGrid, "button", "heat-cell " + heatClass(e.edgeScore, "edge"));
      eh.type = "button";
      eh.textContent = (m.title || m.marketId) + " " + fmtPct(e.edgeScore);
      eh.onclick = () => selectRow(r);
      const rh = appendEl(riskGrid, "button", "heat-cell " + heatClass(rk.riskScore, "risk"));
      rh.type = "button";
      rh.textContent = (m.marketId || "") + " " + fmtPct(rk.riskScore);
      rh.onclick = () => selectRow(r);
      const row = appendEl(table, "div", "sci-row");
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.onclick = () => selectRow(r);
      row.onkeydown = (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          selectRow(r);
        }
      };
      appendEl(row, "span", null, m.title || m.marketId);
      appendEl(row, "span", "meta", m.venue);
      appendEl(row, "span", null, fmtPct(p.impliedProbability));
      appendEl(row, "span", null, fmtPct(p.modelProbability));
      appendEl(row, "span", null, fmtPct(e.edgeScore) + " " + (e.edgeClass || ""));
      appendEl(row, "span", null, (p.confidence || "UNKNOWN") + " " + fmtPct(p.confidenceScore));
      appendEl(row, "span", null, fmtPct(rk.riskScore));
      appendEl(row, "span", null, fmtNum(rk.recommendedSize, 0));
      appendEl(row, "span", "meta", ((e.whaleFlag ? "whale " : "") + (e.mispricingFlag ? "misprice" : "")).trim() || "—");
      if (r.rowStatus === "UNKNOWN") {
        appendEl(row, "span", "sci-chip unknown", "UNKNOWN");
      }
    });
  }

  function selectRow(r) {
    const m = r.market || {};
    const p = r.probability || {};
    const e = r.edge || {};
    const rk = r.risk || {};
    clearNode(rec);
    appendEl(rec, "p", "level", "AGENT → PROPOSAL → HUMAN → DECISION · " + (data.horizon || "24h"));
    appendEl(rec, "h3", null, m.title || m.marketId);
    if (r.rowStatus === "UNKNOWN") {
      renderStatusChip(rec, "UNKNOWN", "ROW UNKNOWN");
      appendEl(rec, "p", "empty", "This market row failed to compose. Proposal is disabled. Other rows remain usable.");
      return;
    }
    const sc = r.scenario || {};
    appendEl(
      rec,
      "p",
      "hint",
      "Why: model " +
        fmtPct(p.modelProbability) +
        " vs implied " +
        fmtPct(p.impliedProbability) +
        " (" +
        (e.edgeClass || "edge") +
        (e.mispricingFlag ? ", mispricing flag" : "") +
        (e.whaleFlag ? ", whale print" : "") +
        "). Confidence " +
        (p.confidence || "UNKNOWN") +
        ". " +
        (rk.noNewRisk ? "Guardrail: no new risk." : "Guardrail allows new risk subject to human confirm.")
    );
    appendEl(rec, "p", "hint", p.note || "");
    appendEl(
      rec,
      "p",
      "hint",
      "Risk " +
        fmtPct(rk.riskScore) +
        " · recommended size " +
        fmtNum(rk.recommendedSize, 0) +
        " (Kelly cap, not an order). " +
        (rk.reason || "")
    );
    appendEl(
      rec,
      "p",
      "hint",
      "Scenario " +
        (sc.horizon || data.horizon || "24h") +
        ": " +
        (sc.baseDecision || "UNKNOWN") +
        " · compare " +
        (sc.compareHorizon || "72h") +
        ": " +
        (sc.stressedDecision || "UNKNOWN") +
        (sc.noNewRisk ? " · no new risk" : "") +
        ". ALPHA, not Monte Carlo. Human decides."
    );
    const ask = appendEl(rec, "button", "go", "Request proposal");
    ask.type = "button";
    ask.setAttribute("data-action-id", "dil.propose");
    ask.onclick = async () => {
      if (!handlers || !handlers.onPropose) return;
      ask.disabled = true;
      ask.textContent = "Requesting proposal…";
      try {
        await handlers.onPropose(m.marketId);
      } catch (err) {
        ask.disabled = false;
        ask.textContent = "Request proposal";
        appendEl(rec, "p", "empty", "PROPOSAL FAILED — " + String(err && err.message ? err.message : err));
      }
    };
    const openDec = appendEl(rec, "button", "ghost", "Open Decisions");
    openDec.type = "button";
    openDec.setAttribute("data-action-id", "dil.open_decisions");
    openDec.onclick = () => {
      if (handlers && typeof handlers.onOpenDecisions === "function") handlers.onOpenDecisions();
    };
    const props = (data.proposals || []).filter((x) => x.marketId === m.marketId);
    props.forEach((pr) => {
      const u = pr.uncertainty || {};
      appendEl(
        rec,
        "p",
        "hint",
        pr.action +
          " — " +
          pr.explanation +
          " · uncertainty " +
          (u.confidence || "UNKNOWN") +
          " (" +
          (u.guessMode ? "GUESS MODE" : "UNKNOWN") +
          ")"
      );
    });
  }

  venueFilter.onchange = paint;
  sortSel.onchange = paint;
  paint();
  if (rows[0]) selectRow(rows[0]);
}

export function renderEclConsole(root, payload) {
  clearNode(root);
  if (root && root.setAttribute) root.setAttribute("aria-busy", "false");
  if (!payload) {
    createEmptyState(root, "NO ECL REPORTING DATA");
    return;
  }
  const data = payload.data || payload;
  const snap = data.snapshot || {};
  const g = snap.guardrail || {};
  appendEl(root, "p", "level", "Where do PnL and risk stand today?");
  const banner = appendEl(root, "div", "sci-callout");
  appendEl(banner, "p", "hint", "ECL Reporting Console · ALPHA_NON_PRODUCTION · simulated book · no live money");
  appendEl(
    banner,
    "p",
    "meta",
    "Ledger " + (snap.ledgerMode || "in-memory") + " · durable=" + String(snap.durable === true) + " · OIDC ABSENT · OTLP ABSENT"
  );
  renderFeedRegistry(root, (data.feeds || {}).registry);
  renderRealisticSim(root, data.realisticSim);
  renderCalibrationPanel(root, data.calibration);
  const periodBar = appendEl(root, "div", "dil-toolbar");
  appendEl(periodBar, "span", "level", "Reporting period");
  let period = "daily";
  const periodBtns = {};
  ["daily", "weekly", "monthly"].forEach((p) => {
    const b = appendEl(periodBar, "button", "ghost" + (p === "daily" ? " on" : ""), p);
    b.type = "button";
    b.setAttribute("data-action-id", "ecl.period." + p);
    periodBtns[p] = b;
    b.onclick = () => {
      period = p;
      Object.keys(periodBtns).forEach((k) => periodBtns[k].classList.toggle("on", k === p));
      paintReports();
    };
  });

  const metrics = appendEl(root, "div", "sci-metrics");
  const br = snap.bankroll || {};
  const sess = snap.session || {};
  [
    ["Equity", fmtNum(br.totalEquity, 0), "Bankroll after MTM"],
    ["Session PnL", fmtNum(sess.pnl, 2), "Realized + unrealized"],
    ["Max drawdown", fmtPct(sess.maxDrawdown), "Session peak-to-trough"],
    ["Volatility", fmtPct(sess.volatility), "Session vol score"],
  ].forEach((m) => {
    const c = appendEl(metrics, "div", "pro-card");
    appendEl(c, "p", "level", m[2]);
    appendEl(c, "h3", null, m[0]);
    appendEl(c, "div", "val", m[1]);
  });

  const rail = appendEl(root, "div", "guardrail-bar " + (g.breaches && g.breaches.length ? "breach" : "ok"));
  appendEl(rail, "strong", null, "Guardrail");
  renderStatusChip(rail, toneForGuardrail(g), g.breaches && g.breaches.length ? "WARN" : "OK");
  appendEl(rail, "span", "hint", g.recommendation || "within_limits");

  const reportHost = appendEl(root, "div", null, null);
  function paintReports() {
    clearNode(reportHost);
    if (!(data.reports || []).length) {
      appendEl(reportHost, "p", "empty", "NO REPORTS — ECL payload has no nested period slices.");
      return;
    }
    (data.reports || []).forEach((rep) => {
      const card = appendEl(reportHost, "div", "pro-card");
      appendEl(card, "p", "level", period + " · " + (rep.kind || "report") + " (ALPHA nested payload)");
      appendEl(card, "h3", null, String(rep.kind || "report").replace(/_/g, " "));
      const payload = rep.payload || {};
      if (period !== "daily") {
        const slice = payload[period];
        if (!slice || slice.status === "UNKNOWN") {
          appendEl(
            card,
            "p",
            "empty",
            "NO " +
              period.toUpperCase() +
              " SLICE — UNKNOWN. Session figures are not independent " +
              period +
              " evidence."
          );
          if (slice && slice.note) appendEl(card, "p", "model-truth", slice.note);
          return;
        }
        const pre = appendEl(card, "pre", null, JSON.stringify(slice, null, 2));
        pre.className = "dense-pre";
        return;
      }
      const dailyView = Object.assign({}, payload);
      delete dailyView.weekly;
      delete dailyView.monthly;
      const pre = appendEl(card, "pre", null, JSON.stringify(dailyView, null, 2));
      pre.className = "dense-pre";
    });
  }
  paintReports();

  const pos = appendEl(root, "div", "pro-card");
  appendEl(pos, "p", "level", "Open book");
  appendEl(pos, "h3", null, "Positions");
  if (!(snap.positions || []).length) {
    appendEl(pos, "p", "empty", "NO OPEN POSITIONS — simulated book is flat.");
  }
  (snap.positions || []).forEach((p) => {
    appendEl(
      pos,
      "p",
      "hint",
      p.instrumentId +
        " " +
        p.direction +
        " × " +
        fmtNum(p.size, 2) +
        " @ " +
        fmtNum(p.currentPrice, 3) +
        " uPnL " +
        fmtNum(p.pnlUnrealized, 2)
    );
  });

  const aud = appendEl(root, "div", "pro-card");
  appendEl(aud, "p", "level", "Decision / rule / risk log");
  appendEl(aud, "h3", null, "Audit");
  if (!(data.audit || []).length) {
    appendEl(aud, "p", "empty", "NO AUDIT YET — decisions and proposals appear here after you act.");
  }
  (data.audit || []).slice(0, 12).forEach((ev) => {
    appendEl(
      aud,
      "p",
      "hint",
      ev.time + " · " + ev.kind + " · " + (ev.decision || "") + " — " + (ev.reason || "").slice(0, 180)
    );
  });
}

export function renderEclDilArchitecture(root, payload) {
  clearNode(root);
  const data = (payload && payload.data) || payload || {};
  const ident = data.identity || {};
  appendEl(root, "h3", null, "SCI OS ×10 — unified architecture");
  appendEl(
    root,
    "p",
    "hint",
    (ident.product || "SCI OS ×10") +
      " · one product, one boot, one Shell. Inspiration maps onto SCI modules — not a vendor clone."
  );
  appendEl(root, "p", "hint", "Boot: " + (data.boot || ident.boot || "start-sci-os.cjs"));
  appendEl(root, "p", "hint", "Control Plane " + (data.controlPlane || ":3000") + " · Shell " + (data.shell || "apps/cockpit-ui :4000"));
  appendEl(root, "p", "hint", "Layers: " + ((data.layers || []).join(" · ") || "ECL · DIL · proposals"));
  const map = ident.composeMap || {};
  Object.keys(map).forEach((k) => appendEl(root, "p", "meta", k + " → " + map[k]));
  (data.docs || []).forEach((d) => appendEl(root, "p", "meta", d));
  const h = data.honesty || {};
  appendEl(
    root,
    "p",
    "model-truth",
    (ident.identity || h.identity || "ENTERPRISE_GRADE_ALPHA") +
      " · " +
      (h.label || "ALPHA_NON_PRODUCTION") +
      " · autoTrade=false · ready=false · holeless=false"
  );
  const infra = data.infra || {};
  appendEl(
    root,
    "p",
    "hint",
    "Infra placeholders: OIDC " +
      (infra.oidc || "ABSENT") +
      " · OTLP " +
      (infra.otlp || "ABSENT") +
      " · ledger " +
      (infra.ledger || "in-memory") +
      " · live feeds " +
      (infra.liveFeeds || "ABSENT") +
      " · prepared=" +
      String(infra.prepared === true) +
      " · enabled=" +
      String(infra.enabled === true)
  );
  const hooks = infra.hooks || {};
  Object.keys(hooks).forEach((k) => {
    const hk = hooks[k] || {};
    appendEl(
      root,
      "p",
      "meta",
      k +
        " → " +
        (hk.status || "ABSENT") +
        " · prepared=" +
        String(hk.prepared === true) +
        " · enabled=" +
        String(hk.enabled === true)
    );
  });
  appendEl(root, "p", "model-truth", infra.note || "P2 placeholders prepared, enabled=false. Not ALPHA GO.");
  renderFeedRegistry(root, (data.feeds && data.feeds.registry) || infra.feedRegistry);
  const bp = data.blueprints || {};
  const surfaces = bp.surfaces || {};
  if (Object.keys(surfaces).length) {
    appendEl(root, "p", "level", "Blueprint inventory (prepared, enabled=false)");
    Object.keys(surfaces).forEach((k) => {
      const s = surfaces[k] || {};
      appendEl(
        root,
        "p",
        "meta",
        k +
          " → " +
          (s.status || "UNKNOWN") +
          " · analog: " +
          (s.analog || "UNKNOWN")
      );
    });
    appendEl(root, "p", "model-truth", "autoApply=" + String(bp.autoApply === true) + " · secondWorkflowEngine=" + String(bp.secondWorkflowEngine === true) + " · ready=" + String(bp.ready === true));
  }
  renderDeploymentInventory(root, data.deployment);
  renderRealisticSim(root, data.realisticSim);
  renderProfessionalWorkspace(root, data.professional);
}

export function renderTechRiskGov(root, payload) {
  if (!root) return;
  clearNode(root);
  const data = (payload && payload.data) || payload || {};
  const g = data.guardrail || data;
  appendEl(root, "h3", null, "Risk / Gov Studio — ECL guardrail");
  appendEl(root, "p", "hint", "Independent of GW1 Analyze JSON. Advisory stop — not a broker kill-switch.");
  renderStatusChip(root, toneForGuardrail(g), g.breaches && g.breaches.length ? "WARN" : "OK");
  appendEl(root, "p", "hint", g.recommendation || "UNKNOWN");
  if (g.limits) {
    appendEl(
      root,
      "p",
      "hint",
      "max daily loss " +
        fmtNum(g.limits.maxDailyLoss, 0) +
        " · max size " +
        fmtNum(g.limits.maxPositionSize, 0) +
        " · concentration " +
        fmtPct(g.limits.maxConcentration) +
        (g.limits.kellyCap != null ? " · kelly cap " + fmtPct(g.limits.kellyCap) : "")
    );
  }
  (g.breaches || []).forEach((b) => appendEl(root, "p", "model-truth", "breach: " + b));
  appendEl(root, "p", "model-truth", "autoTrade=false · GOVERNANCE > AGENT");
  renderFeedRegistry(root, data.feedRegistry || (data.feeds && data.feeds.registry));
}

export function renderTechExecMonitor(root, payload) {
  if (!root) return;
  clearNode(root);
  appendEl(root, "h3", null, "Execution Monitor");
  appendEl(root, "p", "hint", "SIMULATION_ONLY — no live money. Agent cannot submit orders.");
  appendEl(root, "p", "val", "autoTrade = false");
  const snap = (payload && payload.data) || payload || {};
  if (snap.session) {
    appendEl(root, "p", "hint", "Session PnL " + fmtNum(snap.session.pnl, 2) + " · drawdown " + fmtPct(snap.session.maxDrawdown));
  }
  appendEl(root, "p", "hint", "Ledger " + (snap.ledgerMode || "in-memory") + " · durable=" + String(snap.durable === true));
  appendEl(root, "p", "model-truth", "ALPHA_NON_PRODUCTION");
}

export function renderDilEvidenceTail(root, payload, handlers) {
  if (!root) return;
  handlers = handlers || {};
  const data = (payload && payload.data) || payload || [];
  const host = document.createElement("div");
  host.className = "pro-card";
  appendEl(host, "p", "level", "ECL / DIL audit");
  appendEl(host, "h3", null, "Decision & risk events");
  if (typeof handlers.onOpenDecisions === "function") {
    const b = appendEl(host, "button", "ghost", "Open Decisions");
    b.type = "button";
    b.setAttribute("data-action-id", "dil.open_decisions_from_evidence");
    b.onclick = () => handlers.onOpenDecisions();
  }
  if (typeof handlers.onOpenDetective === "function") {
    const d = appendEl(host, "button", "ghost", "Open Detective");
    d.type = "button";
    d.setAttribute("data-action-id", "dil.open_detective_from_evidence");
    d.onclick = () => handlers.onOpenDetective();
  }
  renderFeedRegistry(host, handlers.feedRegistry);
  if (!data.length) appendEl(host, "p", "empty", "NO DIL AUDIT YET — request a proposal.");
  data.slice(0, 15).forEach((ev) => {
    const reason = String(ev.reason || "");
    const human = /human_review/.test(reason);
    appendEl(
      host,
      "p",
      human ? "model-truth" : "hint",
      (ev.time || "") +
        " · " +
        (ev.kind || "") +
        " · " +
        (ev.decision || "") +
        (human ? " · HUMAN REVIEW (audit only)" : "") +
        " — " +
        reason.slice(0, 160)
    );
  });
  root.appendChild(host);
  const gw1 = document.createElement("div");
  gw1.className = "pro-card";
  appendEl(gw1, "p", "level", "GW1 Analyze lineage");
  appendEl(gw1, "h3", null, "Last foundation runs");
  const runs = handlers.gw1Runs || [];
  if (!runs.length) {
    appendEl(gw1, "p", "empty", "NO GW1 RUNS — Analyze an entity to attach lineage. DIL audit above is independent.");
  } else {
    runs.slice(0, 6).forEach((r) => {
      appendEl(
        gw1,
        "p",
        "hint",
        (r.runId || r.id || "run") +
          " · " +
          (r.status || r.state || "UNKNOWN") +
          " · " +
          (r.instrumentId || r.entityId || "")
      );
    });
  }
  appendEl(gw1, "p", "model-truth", "Evidence chain = GW1 lineage + DIL audit. Neither is enterprise-durable PG.");
  root.appendChild(gw1);
}

export function renderDilDecisionList(root, payload, handlers) {
  if (!root) return;
  handlers = handlers || {};
  const data = (payload && payload.data) || payload || [];
  const host = document.createElement("div");
  host.className = "pro-card";
  appendEl(host, "p", "level", "AGENT → PROPOSAL → HUMAN → DECISION");
  appendEl(host, "h3", null, "AI proposals");
  appendEl(
    host,
    "p",
    "hint",
    "Accept/Reject records an ECL audit event only. executed=false. autoTrade=false. Not a broker order."
  );
  renderFeedRegistry(host, handlers.feedRegistry);
  const jump = document.createElement("div");
  jump.className = "actions";
  if (typeof handlers.onOpenEvidence === "function") {
    const evBtn = document.createElement("button");
    evBtn.type = "button";
    evBtn.className = "ghost";
    evBtn.textContent = "Open Evidence";
    evBtn.setAttribute("data-action-id", "dil.open_evidence");
    evBtn.onclick = () => handlers.onOpenEvidence();
    jump.appendChild(evBtn);
  }
  if (typeof handlers.onOpenIntelligence === "function") {
    const dilBtn = document.createElement("button");
    dilBtn.type = "button";
    dilBtn.className = "ghost";
    dilBtn.textContent = "Open Intelligence";
    dilBtn.setAttribute("data-action-id", "dil.open_intelligence");
    dilBtn.onclick = () => handlers.onOpenIntelligence();
    jump.appendChild(dilBtn);
  }
  if (typeof handlers.onOpenDetective === "function") {
    const detBtn = document.createElement("button");
    detBtn.type = "button";
    detBtn.className = "ghost";
    detBtn.textContent = "Open Detective";
    detBtn.setAttribute("data-action-id", "dil.open_detective_from_decisions");
    detBtn.onclick = () => handlers.onOpenDetective();
    jump.appendChild(detBtn);
  }
  if (jump.childNodes.length) host.appendChild(jump);
  if (!data.length) appendEl(host, "p", "empty", "NO PROPOSALS YET — open Intelligence and request one.");
  data.slice(0, 8).forEach((pr) => {
    const u = pr.uncertainty || {};
    const row = document.createElement("div");
    appendEl(
      row,
      "p",
      "hint",
      pr.action +
        " @ " +
        pr.marketId +
        " · conf " +
        (u.confidence || "UNKNOWN") +
        (u.guessMode ? " · GUESS MODE" : "") +
        " · autoExecute=" +
        String(pr.autoExecute)
    );
    const hr = pr.humanReview;
    if (hr && hr.decision) {
      appendEl(
        row,
        "p",
        "hint",
        "Human " +
          hr.decision +
          " · executed=" +
          String(hr.executed) +
          " · autoTrade=" +
          String(hr.autoTrade)
      );
    } else if (typeof handlers.onReview === "function") {
      const actions = document.createElement("div");
      actions.className = "actions";
      ["accept", "reject"].forEach((d) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ghost";
        b.textContent = d === "accept" ? "Record accept (audit only)" : "Record reject (audit only)";
        b.setAttribute("data-action-id", "dil.review." + d);
        b.onclick = async () => {
          b.disabled = true;
          try {
            await handlers.onReview(pr.proposalId, d);
          } catch (err) {
            appendEl(row, "p", "hint", "ERROR — " + String(err && err.message ? err.message : err));
            b.disabled = false;
          }
        };
        actions.appendChild(b);
      });
      row.appendChild(actions);
    }
    host.appendChild(row);
  });
  root.appendChild(host);
}

export const ECL_DIL_CONSOLE_BROWSER_SOURCE = [
  heatClass,
  fmtPct,
  fmtNum,
  toneForGuardrail,
  renderStatusChip,
  renderCalibrationPanel,
  renderFeedRegistry,
  renderDeploymentInventory,
  renderRealisticSim,
  renderProfessionalWorkspace,
  renderProfessionModuleExpansion,
  renderOsBlueprintIntegration,
  paintProfessionPanelAnalogs,
  renderProfessionalCompile,
  renderWorkspaceValidation,
  renderWorkspaceActivation,
  renderWorkspaceStabilization,
  renderDigitalActivation,
  renderPrecisionUpgrade,
  paintPrecisionOverlay,
  renderCyberResearchBridge,
  paintCyberBridgeOverlay,
  renderActivationReview,
  paintActivationReviewOverlay,
  renderEnterprisePrep,
  paintEnterprisePrepOverlay,
  renderAutomationPrep,
  paintAutomationPrepOverlay,
  renderVisibilityPrep,
  paintVisibilityPrepOverlay,
  renderVisibilityActivation,
  paintVisibilityActivationOverlay,
  renderVisibilityDeep,
  paintVisibilityDeepOverlay,
  renderExplainabilityPrep,
  paintExplainabilityPrepOverlay,
  renderExplainVisibility,
  paintExplainVisibilityOverlay,
  renderDigitalWorkspaceCompute,
  paintDigitalWorkspaceComputeOverlay,
  renderActivationPass,
  paintActivationPassOverlay,
  renderDilConsole,
  renderEclConsole,
  renderEclDilArchitecture,
  renderTechRiskGov,
  renderTechExecMonitor,
  renderDilEvidenceTail,
  renderDilDecisionList,
]
  .map((fn) => fn.toString())
  .join("\n");
