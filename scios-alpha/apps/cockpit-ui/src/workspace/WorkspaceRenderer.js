/**
 * WorkspaceRenderer — consumes compiled Experience Compiler output only.
 * ExperienceCompiler.compile(context) → WorkspaceSpec → WorkspaceRenderer
 * ALPHA_NON_PRODUCTION
 */

export const KNOWN_PANEL_TYPES = [
  "ContextHeader",
  "PredictionPanel",
  "UncertaintyPanel",
  "RiskPanel",
  "DecisionPanel",
  "SimulationPanel",
  "EvidencePanel",
  "LineagePanel",
];

/**
 * @param {object} compiled - output from /v1/experience/compile
 * @param {object} ctx - { document, KNOWN_MODULES, clearNode, appendEl }
 */
export function renderWorkspaceSpec(compiled, ctx) {
  const doc = ctx.document || document;
  const out = (compiled && compiled.output) || {};
  const modules = Array.isArray(out.modules) ? out.modules.slice() : [];
  modules.sort((a, b) => (a.order || 0) - (b.order || 0));
  const wanted = new Set(modules.map((m) => m.id));
  const known = ctx.KNOWN_MODULES || KNOWN_PANEL_TYPES;
  const grid = doc.getElementById("proGrid");
  const partialHost = doc.getElementById("partialModuleHost");
  if (partialHost && ctx.clearNode) ctx.clearNode(partialHost);

  const densityMap = { comfortable: "COMFORTABLE", compact: "STANDARD", dense: "EXPERT" };
  doc.body.setAttribute("data-density", densityMap[out.density] || "STANDARD");
  doc.body.setAttribute("data-disclosure", out.disclosureDefault || "L2");

  known.forEach((id) => {
    const el = doc.querySelector('[data-exp-module="' + id + '"]');
    if (!el) return;
    const on = wanted.has(id);
    el.setAttribute("data-exp-hidden", on ? "0" : "1");
    el.hidden = !on;
  });

  modules.forEach((m, i) => {
    const el = doc.querySelector('[data-exp-module="' + m.id + '"]');
    if (el && grid) {
      el.style.order = String(m.order || i + 1);
      grid.appendChild(el);
      return;
    }
    if (!partialHost || !ctx.appendEl) return;
    const d = doc.createElement("div");
    d.className = "pro-card partial-mod";
    d.setAttribute("data-exp-module", m.id);
    d.style.order = String(m.order || i + 1);
    ctx.appendEl(d, "p", "level", "PARTIAL · module unbound");
    ctx.appendEl(d, "h3", null, m.id);
    ctx.appendEl(d, "div", "val", "Safe PARTIAL");
    ctx.appendEl(d, "p", "hint", "No Cockpit panel binding yet — composition remains available.");
    partialHost.appendChild(d);
  });

  const disabled = new Set(
    (out.disabledActions || []).map((d) => (typeof d === "string" ? d : d.action))
  );
  doc.querySelectorAll("[data-action-id]").forEach((btn) => {
    const id = btn.getAttribute("data-action-id");
    if (!id) return;
    if (disabled.has(id) || disabled.has(id.replace(/^act\./, ""))) {
      btn.disabled = true;
      btn.title = "Disabled by Experience / risk policy";
    }
  });

  return {
    profile: out.workspaceProfileId,
    modules: modules.map((m) => m.id),
    unknownModules: modules.filter((m) => !known.includes(m.id)).map((m) => m.id),
    compilerStatus: compiled.compilerStatus || "UNKNOWN",
  };
}

export const WORKSPACE_RENDERER_BROWSER_SOURCE = [renderWorkspaceSpec]
  .map((fn) => fn.toString())
  .join("\n");
