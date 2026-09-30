/**
 * B-006 Professional UX — browser-safe presentation layer.
 * Inlined into Cockpit HTML (no bundler in Alpha install path).
 * ALPHA_NON_PRODUCTION
 */

export const ARCHETYPE_ROLES = [
  { roleId: "arch.market_analyst", label: "Market analyst" },
  { roleId: "arch.fraud_investigator", label: "Fraud investigator" },
  { roleId: "arch.soc_analyst", label: "SOC analyst" },
  { roleId: "arch.fin_risk_analyst", label: "Financial risk analyst" },
  { roleId: "arch.osint_analyst", label: "OSINT analyst" },
  { roleId: "arch.executive", label: "Enterprise executive" },
  { roleId: "arch.auditor", label: "Auditor / compliance" },
  { roleId: "arch.prediction_decision_analyst", label: "Prediction & Decision Analyst" },
  { roleId: "arch.eng_operator", label: "Engineering operator" },
];

export function populateRoleSelect(selectEl, currentRoleId) {
  if (!selectEl) return;
  while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
  ARCHETYPE_ROLES.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.roleId;
    opt.textContent = r.label;
    selectEl.appendChild(opt);
  });
  if (currentRoleId) selectEl.value = currentRoleId;
}

export function rolePresentationHint(roleId) {
  const map = {
    "arch.market_analyst": "Prediction · uncertainty · risk · lineage for instruments.",
    "arch.fraud_investigator": "Entity and transaction investigation — fraud modules may show PARTIAL.",
    "arch.soc_analyst": "Alert triage — cyber modules may show PARTIAL.",
    "arch.fin_risk_analyst": "Scenario and limit posture — dense risk panels prioritized.",
    "arch.osint_analyst": "Entity network and source-quality framing.",
    "arch.executive": "Exception queue and decision summaries — minimal disclosure default.",
    "arch.auditor": "Policy, approval, and lineage audit trail emphasis.",
    "arch.prediction_decision_analyst": "Home → Intelligence → Decisions → Evidence. Edge, risk, scenario, proposals — human decides. No auto-trade.",
    "arch.eng_operator": "Health, jobs, and diagnostics — technical detail available in Engineering.",
  };
  return map[roleId] || "Professional workspace for " + roleId;
}

export function professionalRoleLabel(roleId) {
  const hit = ARCHETYPE_ROLES.find((r) => r.roleId === roleId);
  return (hit && hit.label) || roleId || "—";
}

export function renderContextHeader(state) {
  const bar = document.getElementById("contextHeaderBar");
  if (!bar) return;
  const s = state || {};
  const roleLabel = s.roleLabel || professionalRoleLabel(s.roleId);
  const rows = [
    ["Product", s.product || "SCI OS ×10"],
    ["Maturity", s.maturity || "ALPHA_NON_PRODUCTION"],
    ["View", s.view || "—"],
    ["Mode", s.executionMode || "UNKNOWN"],
    ["Feeds", s.feeds || "simulated_alpha"],
    ["Control plane", s.cpReachable ? s.cpVerdict || "REACHABLE" : "UNREACHABLE"],
    ["Experience", s.compilerStatus || "UNKNOWN"],
    ["Pipeline", s.compilerPipeline || (s.compilerVersion ? "B-008" : "—")],
    ["Cockpit", s.cockpitVerdict || "UNKNOWN"],
  ];
  clearNode(bar);
  const title = document.createElement("p");
  title.className = "ctx-title";
  title.textContent = "Professional role";
  bar.appendChild(title);
  appendEl(bar, "p", "ctx-role", roleLabel);
  const grid = document.createElement("div");
  grid.className = "ctx-grid";
  rows.forEach(([k, v]) => {
    const cell = document.createElement("div");
    cell.className = "ctx-cell";
    const tone =
      /UNREACHABLE|NOT READY|FAILED|DEGRADED/i.test(String(v))
        ? "warn"
        : /ALPHA_LIVE|RUNTIME|REACHABLE/i.test(String(v))
          ? "ok"
          : "";
    if (tone) cell.classList.add(tone);
    appendEl(cell, "span", "ctx-k", k);
    appendEl(cell, "span", "ctx-v", String(v));
    grid.appendChild(cell);
  });
  if (s.degradedNote) {
    const note = document.createElement("p");
    note.className = "ctx-note";
    note.textContent = s.degradedNote;
    bar.appendChild(note);
  }
  bar.appendChild(grid);
}

export function renderKvPanel(parent, title, rows) {
  if (!parent) return;
  clearNode(parent);
  if (!rows || !rows.length) {
    createEmptyState(parent, "NO DATA — " + (title || "panel"));
    return;
  }
  appendEl(parent, "h2", null, title || "Details");
  const dl = document.createElement("dl");
  dl.className = "kv-grid";
  rows.forEach(([k, v]) => {
    appendEl(dl, "dt", null, k);
    const dd = appendEl(dl, "dd", null, v == null || v === "" ? "—" : String(v));
    if (/UNKNOWN|UNVALIDATED|NOT_VALIDATED|DEGRADED|UNREACHABLE/i.test(String(v))) {
      dd.classList.add("truth-warn");
    }
  });
  parent.appendChild(dl);
}

export function renderSystemDashboard(bundle) {
  const b = bundle || {};
  const healthRoot = document.getElementById("sysHealthRoot");
  const readyRoot = document.getElementById("sysReadinessRoot");
  const workerRoot = document.getElementById("sysWorkerRoot");
  const runsRoot = document.getElementById("sysRunsRoot");
  const pipe = document.getElementById("dashPipe");

  const ready = b.ready || {};
  const snap = b.snap || {};
  const flow = b.flow || {};
  const health = b.health || {};
  const readiness = b.readiness || {};
  const persistence = b.persistence || {};
  const persistenceHealth = b.persistenceHealth || {};
  const validation = b.validation || {};
  const jobs = b.jobs || {};
  const engine = b.jobEngine || {};
  const hooksPayload = b.enterpriseHooks || {};
  const hooksData = hooksPayload.data || hooksPayload;
  const hooksActual = hooksData.actual || {};
  const hooksEnabled = hooksData.enabled;
  const feedReg = hooksData.feedRegistry || {};
  const feedHealth = feedReg.health || {};
  const feedRegLabel =
    typeof feedHealth.registered === "number"
      ? feedHealth.registered +
        " types · simulated " +
        (feedHealth.simulated || 0) +
        " · stub " +
        (feedHealth.stub || 0) +
        " · absent " +
        (feedHealth.absent || 0) +
        " · liveCertified " +
        (typeof feedHealth.liveCertified === "number" ? feedHealth.liveCertified : "UNKNOWN")
      : "UNKNOWN";

  renderKvPanel(healthRoot, "System health", [
    ["Verdict", b.verdict || "UNKNOWN"],
    ["Foundation core", ready.ready === true ? "CORE_READY (ALPHA — not enterprise GO)" : ready.ready === false ? "NO" : "UNKNOWN"],
    ["Profile", ready.profile || "—"],
    ["Risk control", ready.riskControl || "—"],
    ["Execution mode", b.executionMode || ready.executionMode || "SIMULATION_ONLY"],
    ["Optional infra", ready.optionalInfra || "—"],
    ["Health service", health.status || health.optionalError || (health.ok === true ? "OK" : "UNKNOWN")],
    ["Startup readiness", readiness.ready === true ? "CORE_READY (Home reachable — not enterprise GO)" : readiness.optionalError || readiness.status || "UNKNOWN"],
    ["Auto-trade", "false"],
    ["Boot", hooksActual.boot || "start-sci-os.cjs"],
    ["OIDC", hooksActual.oidc || hooksData.oidc || "ABSENT"],
    ["OTLP", hooksActual.otlp || hooksData.otlp || "ABSENT"],
    ["ECL ledger", hooksActual.ledger || hooksData.ledger || "in-memory"],
    ["Live feeds", hooksActual.liveFeeds || "ABSENT"],
    ["Feed registry", feedRegLabel],
    ["Feeds live enabled", feedReg.enabledLive === true ? "true" : "false"],
    ["Feeds persisted", feedReg.persisted === true ? "true" : "false"],
    ["Feed simulation", feedReg.simulationOnly === true ? "SIMULATION_ONLY" : ready.executionMode || "SIMULATION_ONLY"],
    ["Live calibration", hooksActual.liveCalibration || "UNKNOWN"],
    ["Enterprise hooks", hooksEnabled === false ? "PREPARED · enabled=false" : hooksData.optionalError ? "UNKNOWN — " + hooksData.optionalError : "UNKNOWN"],
  ]);

  renderKvPanel(readyRoot, "Readiness", [
    ["Control plane", b.cpReachable ? "REACHABLE" : "UNREACHABLE"],
    ["Degraded", b.degraded ? "YES — partial diagnostics failed" : "NO"],
    ["Experience compiler", b.compilerStatus || "UNKNOWN"],
    ["Compiler pipeline", b.compilerPipeline || b.compilerHealth?.pipelineModule || "—"],
    ["Compiler version", b.compilerVersion || b.compilerHealth?.compilerVersion || "—"],
    ["Pipeline", flow.arrow ? "canonical flow mounted" : "foundation only"],
    ["Stages", (flow.stages || []).length ? (flow.stages || []).join(" → ") : "—"],
  ]);

  const workerDetail = ready.foundationWorkerDetail || ready.components;
  const workerRows = [["Worker", workerDetail ? "see detail" : "UNKNOWN"]];
  if (workerDetail && typeof workerDetail === "object" && !Array.isArray(workerDetail)) {
    Object.keys(workerDetail).slice(0, 8).forEach((k) => {
      workerRows.push([k, String(workerDetail[k])]);
    });
  } else if (Array.isArray(workerDetail)) {
    workerRows.push(["Components", workerDetail.join(", ") || "—"]);
  }
  workerRows.push(
    ["Job engine", engine.schema ? engine.schema + " · running " + (engine.running ?? "—") : "—"],
    ["Queued jobs", jobs.jobs ? String(jobs.jobs.length) : engine.queued != null ? String(engine.queued) : "—"]
  );
  renderKvPanel(workerRoot, "Worker & jobs", workerRows);

  const runs = Array.isArray(snap.runs) ? snap.runs : [];
  renderKvPanel(runsRoot, "Last runs", runs.length
    ? runs.slice(0, 6).flatMap((r, i) => [
        ["Run " + (i + 1), (r.runId || r.id || "—") + " · " + (r.status || r.state || "—")],
      ])
    : [["Runs", "NO RUNS YET — run Analyze to populate."]]);

  if (pipe) {
    clearNode(pipe);
    (flow.stages || []).forEach((s) => {
      const d = document.createElement("span");
      d.className = "stage done";
      d.textContent = s;
      pipe.appendChild(d);
    });
    if (!pipe.children.length) {
      const d = document.createElement("span");
      d.className = "stage wait";
      d.textContent = "Pipeline stages unavailable";
      pipe.appendChild(d);
    }
  }

  const persistRoot = document.getElementById("sysPersistenceRoot");
  if (persistRoot) {
    const states = persistence.states || persistence.json?.states || {};
    renderKvPanel(persistRoot, "Persistence matrix", [
      ["Local", persistenceHealth.local?.status || "PASS"],
      ["PostgreSQL", persistenceHealth.postgres?.status || states.postgres?.classification || "PROFILE_DISABLED"],
      ["Verdict", persistenceHealth.verdict || "—"],
      ["Fallback", persistenceHealth.fallback?.mode || "LOCAL_PRIMARY"],
      ["Jobs", states.jobs?.classification || "local-durable"],
      ["Vertical slice", states.verticalSliceRuns?.classification || "—"],
      ["Label", persistence.label || "ALPHA_NON_PRODUCTION"],
    ]);
  }

  const valRoot = document.getElementById("sysValidationRoot");
  if (valRoot && validation.records) {
    const recs = Array.isArray(validation.records) ? validation.records : [];
    renderKvPanel(
      valRoot,
      "Model validation (CF28)",
      recs.length
        ? recs.slice(0, 6).map((r) => [r.modelId || r.id || "model", r.state || "NOT_VALIDATED"])
        : [["Registry", "NOT_VALIDATED — no records"]]
    );
  } else if (valRoot && validation.optionalError) {
    clearNode(valRoot);
    createErrorState(valRoot, "Validation registry unreachable — " + validation.optionalError);
  }
}

export function renderJobCenter(payload) {
  const root = document.getElementById("jobCenterRoot");
  const summary = document.getElementById("jobCenterSummary");
  if (!root) return;
  clearNode(root);
  const jobs = (payload && payload.jobs) || [];
  const engine = payload && payload.engine;
  const health = payload && payload.health;

  if (summary) {
    const healthLine =
      health && health.schema
        ? health.schema +
          " · " +
          (health.status || "—") +
          (health.lifecycle ? " · " + health.lifecycle.total + " lifecycle" : "")
        : "";
    summary.textContent =
      (engine && engine.schema ? engine.schema + " · " : "") +
      (healthLine ? healthLine + " · " : "") +
      jobs.length +
      " job(s) · max concurrent " +
      ((engine && engine.maxConcurrent) || "—");
  }

  if (!jobs.length) {
    createEmptyState(root, "NO JOBS — submit from Analyze or API. SIMULATION_ONLY.");
    return;
  }

  jobs.slice(0, 20).forEach((j) => {
    const card = document.createElement("div");
    card.className = "job-card";
    const lifecycle = j.lifecycleState || j.state || j.actualState || "UNKNOWN";
    const cf11 = j.cf11State || j.actualState || j.state || "UNKNOWN";
    const tone = /COMPLETED|RECOVERED/.test(lifecycle)
      ? "ok"
      : /FAILED|CANCELLED|RETRY_EXHAUSTED/.test(lifecycle)
        ? "err"
        : /RUNNING|STARTED/.test(lifecycle)
          ? "warn"
          : "";
    appendEl(card, "p", "level", "JOB · " + (j.jobType || j.type || "analysis"));
    const head = document.createElement("div");
    head.className = "job-head";
    appendEl(head, "h3", null, j.title || j.jobId || "Job");
    const badge = document.createElement("span");
    badge.className = "job-state " + tone;
    badge.textContent = lifecycle;
    head.appendChild(badge);
    card.appendChild(head);
    const meta = [
      ["CF11", cf11],
      ["Job ID", j.jobId],
      ["Correlation", j.correlationId || "—"],
      ["Attempts", (j.currentAttempt || 1) + " / " + (j.maxAttempts || "—")],
      ["Progress", j.progress != null ? j.progress + "%" : "—"],
      ["Updated", j.updatedAt || "—"],
    ];
    const dl = document.createElement("dl");
    dl.className = "kv-grid compact";
    meta.forEach(([k, v]) => {
      appendEl(dl, "dt", null, k);
      appendEl(dl, "dd", null, v == null ? "—" : String(v));
    });
    card.appendChild(dl);
    if (j.recoveryInfo) {
      const rec = document.createElement("p");
      rec.className = "hint";
      rec.textContent = "Recovery: " + JSON.stringify(j.recoveryInfo);
      card.appendChild(rec);
    }
    if (j.error) {
      const err = document.createElement("p");
      err.className = "hint truth-warn";
      err.textContent = "Error: " + (typeof j.error === "object" ? JSON.stringify(j.error) : String(j.error));
      card.appendChild(err);
    }
    root.appendChild(card);
  });
}

export function renderDecisionProfessional(data) {
  const root = document.getElementById("decisionsProRoot");
  if (!root) return;
  if (!data) {
    clearNode(root);
    createEmptyState(root, "Run Analyze to populate decisions.");
    return;
  }
  const risk = data.riskDecision || {};
  const gov = data.governanceDecision || {};
  renderKvPanel(root, "Decision summary", [
    ["Analysis status", data.status || "UNKNOWN"],
    ["Risk verdict", risk.verdict || risk.decision || "UNKNOWN"],
    ["Risk reason", risk.reason || risk.explanation || "—"],
    ["Governance", gov.verdict || gov.decision || "UNKNOWN"],
    ["Policy", gov.policyId || gov.policy || "embedded-foundation/v1"],
    ["Explanation", gov.explanation || gov.reason || "—"],
    ["Review kind", "LOCAL_REVIEW — not governed approval"],
    ["Execution", (data.executionOutcome && (data.executionOutcome.action || data.executionOutcome.status)) || "—"],
  ]);
}

export function renderEvidenceProfessional(data) {
  const root = document.getElementById("evidenceProRoot");
  if (!root) return;
  if (!data || !data.lineage) {
    clearNode(root);
    createEmptyState(root, "Run a slice first to attach evidence and lineage.");
    return;
  }
  const lin = data.lineage || {};
  const nodes = Array.isArray(lin.nodes) ? lin.nodes : [];
  renderKvPanel(root, "Evidence & lineage", [
    ["Run ID", data.runId || "—"],
    ["Lineage ID", lin.lineageId || "—"],
    ["Tip hash", lin.tipHash || "—"],
    ["Nodes", nodes.length ? String(nodes.length) : "—"],
    ["Integrity", data.lineageVerified === true ? "VERIFIED" : data.lineageVerified === false ? "FAILED" : "UNKNOWN"],
    ["Persistence", data.persistenceState || "—"],
  ]);
  if (nodes.length) {
    const list = document.createElement("ul");
    list.className = "evidence-list";
    nodes.slice(0, 8).forEach((n) => {
      const li = document.createElement("li");
      li.textContent =
        (n.kind || n.type || "node") +
        " · " +
        (n.id || n.nodeId || "—") +
        (n.hash ? " · hash " + String(n.hash).slice(0, 12) + "…" : "");
      list.appendChild(li);
    });
    root.appendChild(list);
  }
}

export function setAnalyzePanelsState(mode, message) {
  const ids = [
    "modContextHeader",
    "modPredictionPanel",
    "modUncertaintyPanel",
    "modRiskPanel",
    "modDecisionPanel",
    "modSimulationPanel",
    "modEvidencePanel",
    "modLineagePanel",
    "modOpsIntel",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.getAttribute("data-exp-hidden") === "1") return;
    const val = el.querySelector(".val");
    const hint = el.querySelector(".hint");
    if (mode === "loading" && val) {
      val.textContent = message || "Loading…";
      if (hint) hint.textContent = "Analysis in progress — derived from live pipeline.";
    }
    if (mode === "error" && val) {
      val.textContent = "ERROR";
      if (hint) hint.textContent = message || "Analysis failed — see status below.";
    }
  });
}

export function showEngPanel(panelId) {
  document.querySelectorAll("[data-eng-panel]").forEach((el) => {
    el.hidden = el.getAttribute("data-eng-panel") !== panelId;
  });
  document.querySelectorAll("nav.eng button").forEach((b) => {
    b.classList.toggle("on", b.dataset.eng === panelId);
  });
}

/**
 * Provenance of the professional workspace renderer shipped to the browser.
 * The functions below are serialized with toString(), which loses every trace of
 * the module they came from once the cockpit is bundled. The served HTML must be
 * able to state which UX source produced it.
 */
export const PROFESSIONAL_UX_SOURCE_ID = "apps/cockpit-ui/src/professional-ux.js";
export const PROFESSIONAL_UX_CONTRACT = "sci-os-professional-ux/v1";

export const PROFESSIONAL_UX_BROWSER_SOURCE =
  "const PROFESSIONAL_UX_SOURCE_ID = " +
  JSON.stringify(PROFESSIONAL_UX_SOURCE_ID) +
  ";\nconst PROFESSIONAL_UX_CONTRACT = " +
  JSON.stringify(PROFESSIONAL_UX_CONTRACT) +
  ";\nconst ARCHETYPE_ROLES = " +
  JSON.stringify(ARCHETYPE_ROLES) +
  ";\n" +
  [
    populateRoleSelect,
    rolePresentationHint,
    professionalRoleLabel,
    renderContextHeader,
    renderKvPanel,
    renderSystemDashboard,
    renderJobCenter,
    renderDecisionProfessional,
    renderEvidenceProfessional,
    setAnalyzePanelsState,
    showEngPanel,
  ]
    .map((fn) => fn.toString())
    .join("\n");
