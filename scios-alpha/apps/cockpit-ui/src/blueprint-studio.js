/**
 * Blueprint studios — map LDA / KG / Workflow DSL / Distributed OS onto live SCI analogs.
 * Prepared, enabled=false. No auto-patch. No second workflow engine. ALPHA_NON_PRODUCTION.
 */

export function kgNodesFromGw1(data) {
  if (!data || typeof data !== "object") return [];
  const inst = data.instrumentId || data.entityId || data.instrument || "";
  const nodes = [];
  if (inst) nodes.push({ kind: "entity", id: String(inst), label: String(inst) });
  if (data.prediction || data.baselinePrediction) {
    nodes.push({ kind: "event", id: "prediction", label: "prediction" });
  }
  if (data.riskDecision || data.risk) nodes.push({ kind: "risk", id: "risk", label: "independent_risk_gate" });
  if (data.governanceDecision || data.decision) {
    nodes.push({ kind: "decision", id: "decision", label: "governance_decision" });
  }
  if (data.lineage) nodes.push({ kind: "evidence", id: "lineage", label: "immutable_lineage" });
  return nodes;
}

export function kgEdgesFromNodes(nodes) {
  const kinds = (nodes || []).map((n) => n.kind);
  const edges = [];
  if (kinds.indexOf("entity") >= 0 && kinds.indexOf("event") >= 0) {
    edges.push({ type: "PRODUCES", from: "entity", to: "event" });
  }
  if (kinds.indexOf("event") >= 0 && kinds.indexOf("risk") >= 0) {
    edges.push({ type: "AFFECTS", from: "event", to: "risk" });
  }
  if (kinds.indexOf("risk") >= 0 && kinds.indexOf("decision") >= 0) {
    edges.push({ type: "REQUIRES", from: "risk", to: "decision" });
  }
  if (kinds.indexOf("decision") >= 0 && kinds.indexOf("evidence") >= 0) {
    edges.push({ type: "PROVES", from: "evidence", to: "decision" });
  }
  return edges;
}

function paintSurface(root, name, s) {
  s = s || {};
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "p", "level", "BLUEPRINT · " + name + " · prepared=" + String(s.prepared === true) + " · enabled=" + String(s.enabled === true));
  appendEl(card, "h3", null, name);
  appendEl(card, "p", "val", s.status || "UNKNOWN");
  if (s.analog) appendEl(card, "p", "hint", "Live analog: " + s.analog);
  if (s.note) appendEl(card, "p", "model-truth", s.note);
  return card;
}

export function renderAgentStudio(root, payload) {
  if (!root) return;
  clearNode(root);
  const data = (payload && payload.data) || payload || {};
  const s = (data.surfaces && data.surfaces.lda) || {};
  appendEl(root, "p", "level", "Dev Assistant · Agent Studio · ALPHA_NON_PRODUCTION");
  paintSurface(root, "LDA", s);
  appendEl(root, "p", "hint", "Cursor is the implementer outside this product. SCI OS does not auto-patch, auto-refactor, or auto-deploy.");
  appendEl(root, "p", "model-truth", "autoApply=false · autoPatch=false · GOVERNANCE > AGENT");
  const analog = appendEl(root, "div", "pro-card");
  appendEl(analog, "h3", null, "In-product analog");
  appendEl(analog, "p", "hint", "DIL proposals: agent proposes, human records accept/reject to audit only (executed=false).");
  const live = data.liveAnalog || {};
  appendEl(analog, "p", "hint", "Open proposals this session: " + String(live.proposals != null ? live.proposals : "UNKNOWN"));
  appendEl(analog, "p", "empty", "No LocalDevelopmentAgent registry, AST engine, or LSP runtime is mounted. Status ABSENT — not READY.");
}

export function renderKgExplorer(root, payload) {
  if (!root) return;
  clearNode(root);
  const data = (payload && payload.data) || payload || {};
  const s = (data.surfaces && data.surfaces.knowledgeGraph) || {};
  appendEl(root, "p", "level", "Knowledge Graph Explorer · WAVE-1 analog");
  paintSurface(root, "Knowledge Graph", s);
  const kinds = s.nodeKinds || ["entity", "event", "decision", "risk", "evidence", "policy"];
  appendEl(root, "p", "hint", "Node kinds (contract): " + kinds.join(" · "));
  appendEl(root, "p", "hint", "Wave-1 relations: " + ((s.relationTypes || []).slice(0, 8).join(", ") || "UNKNOWN"));
  appendEl(root, "p", "hint", "Role seeds: " + String(s.roleSeedCount || 200) + " · RESEARCH_REQUIRED composition, not expert ontologies.");
  const nodes = data.gw1Nodes || [];
  const edges = data.gw1Edges || [];
  const g = appendEl(root, "div", "pro-card");
  appendEl(g, "h3", null, "Session graph from last GW1 (not a national KG)");
  if (!nodes.length) {
    appendEl(g, "p", "empty", "NO GW1 GRAPH — Analyze an entity. Empty is UNKNOWN, not a populated knowledge base.");
  } else {
    nodes.forEach((n) => appendEl(g, "p", "hint", n.kind + " · " + n.id + " · " + (n.label || "")));
    edges.forEach((e) => appendEl(g, "p", "meta", e.type + " · " + e.from + " → " + e.to));
  }
  appendEl(root, "p", "model-truth", "causalQueryEngine=ABSENT · nationalGraph=false · live UNKNOWN");
}

export function renderWorkflowStudio(root, payload) {
  if (!root) return;
  clearNode(root);
  const data = (payload && payload.data) || payload || {};
  const s = (data.surfaces && data.surfaces.workflowDsl) || {};
  appendEl(root, "p", "level", "Workflow Studio · GW1 is the only live workflow");
  paintSurface(root, "Workflow DSL", s);
  paintSurface(root, "OSModule.Workflow", (data.surfaces && data.surfaces.osModuleWorkflow) || {});
  paintSurface(root, "OSModule.EventBus", (data.surfaces && data.surfaces.osModuleEventBus) || {});
  const stages = s.gw1Stages || [];
  const pipe = appendEl(root, "div", "pipe");
  stages.forEach((st) => {
    const span = document.createElement("span");
    span.className = "stage done";
    span.textContent = st;
    pipe.appendChild(span);
  });
  appendEl(root, "p", "hint", "CF11 jobs remain the durable local task analog. User-authored DSL compiler is ABSENT.");
  appendEl(root, "p", "model-truth", "secondEngine=false · no packages/workflow-engine HTTP app · no new listen()");
}

export function renderDistributedOsView(root, payload) {
  if (!root) return;
  clearNode(root);
  const data = (payload && payload.data) || payload || {};
  const s = (data.surfaces && data.surfaces.distributedOs) || {};
  const sys = data.system || {};
  appendEl(root, "p", "level", "Distributed OS View · single-node ALPHA");
  paintSurface(root, "Distributed architecture", s);
  paintSurface(root, "OSModule.Consensus", (data.surfaces && data.surfaces.osModuleConsensus) || {});
  const card = appendEl(root, "div", "pro-card");
  appendEl(card, "h3", null, "This node");
  appendEl(card, "p", "hint", "Boot " + (sys.boot || "start-sci-os.cjs"));
  appendEl(card, "p", "hint", "Control Plane " + (sys.controlPlane || ":3000") + " · Shell " + (sys.shell || "apps/cockpit-ui :4000"));
  appendEl(card, "p", "hint", "Profile " + (sys.profile || "local-foundation"));
  appendEl(card, "p", "hint", "Kafka " + (s.kafka || "ABSENT") + " · Redis Streams " + (s.redisStreams || "ABSENT") + " · multiRegion=" + String(s.multiRegion === true));
  appendEl(card, "p", "hint", "Event store analog: " + (s.eventStore || "UNKNOWN"));
  appendEl(card, "p", "empty", "Cluster membership UNKNOWN — this is not a multi-node fabric. OPTIONAL_INFRA_DEGRADED is allowed.");
  appendEl(root, "p", "model-truth", "oneBoot_oneShell · autoTrade=false · ready=false");
}

export const BLUEPRINT_STUDIO_BROWSER_SOURCE = [
  kgNodesFromGw1,
  kgEdgesFromNodes,
  paintSurface,
  renderAgentStudio,
  renderKgExplorer,
  renderWorkflowStudio,
  renderDistributedOsView,
]
  .map((fn) => fn.toString())
  .join("\n");
