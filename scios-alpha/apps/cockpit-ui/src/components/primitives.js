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
  const d = document.createElement("div");
  d.className = "card empty";
  d.textContent = message || "NO DATA";
  parent.appendChild(d);
  return d;
}

export function createLoadingState(parent, message) {
  const d = document.createElement("div");
  d.className = "card";
  d.textContent = message || "Loading…";
  parent.appendChild(d);
  return d;
}

export function createErrorState(parent, message) {
  const d = document.createElement("div");
  d.className = "card";
  d.style.borderColor = "var(--red)";
  d.textContent = message || "ERROR";
  parent.appendChild(d);
  return d;
}

/** Serializable for inline Cockpit script. */
export const PRIMITIVES_BROWSER_SOURCE = [createPanel, createEmptyState, createLoadingState, createErrorState]
  .map((fn) => fn.toString())
  .join("\n");
