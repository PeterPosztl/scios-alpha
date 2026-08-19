/**
 * Cockpit output-safety helpers — textContent / DOM createElement only.
 * Browser source is inlined into the Cockpit HTML script.
 * ALPHA_NON_PRODUCTION
 */

export function escapeText(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function clearNode(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function setText(node, value) {
  if (!node) return;
  node.textContent = value == null ? "" : String(value);
}

export function appendEl(parent, tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = String(text);
  parent.appendChild(n);
  return n;
}

/** Serializable copies for the Cockpit inline <script> (no bundler). */
export const SAFE_DOM_BROWSER_SOURCE = [
  escapeText,
  clearNode,
  setText,
  appendEl,
]
  .map((fn) => fn.toString())
  .join("\n");
