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

/**
 * Literal browser script. fn.toString() is renamed by the packaged esbuild
 * bundle, which dropped global appendEl/clearNode and left Home/Work empty.
 */
export const SAFE_DOM_BROWSER_SOURCE = [
  "function escapeText(value) {",
  "  return String(value == null ? \"\" : value)",
  "    .replace(/&/g, \"&amp;\")",
  "    .replace(/</g, \"&lt;\")",
  "    .replace(/>/g, \"&gt;\")",
  "    .replace(/\"/g, \"&quot;\")",
  "    .replace(/'/g, \"&#39;\");",
  "}",
  "function clearNode(node) {",
  "  if (!node) return;",
  "  while (node.firstChild) node.removeChild(node.firstChild);",
  "}",
  "function setText(node, value) {",
  "  if (!node) return;",
  "  node.textContent = value == null ? \"\" : String(value);",
  "}",
  "function appendEl(parent, tag, className, text) {",
  "  const n = document.createElement(tag);",
  "  if (className) n.className = className;",
  "  if (text != null) n.textContent = String(text);",
  "  parent.appendChild(n);",
  "  return n;",
  "}",
].join("\n");
