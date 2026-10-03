import assert from "node:assert/strict";
import { test } from "node:test";
import { SAFE_DOM_BROWSER_SOURCE, appendEl, clearNode, escapeText } from "./safe-dom.js";

test("browser safe-dom source keeps global appendEl and clearNode after bundling", () => {
  assert.match(SAFE_DOM_BROWSER_SOURCE, /function appendEl\s*\(/);
  assert.match(SAFE_DOM_BROWSER_SOURCE, /function clearNode\s*\(/);
  assert.match(SAFE_DOM_BROWSER_SOURCE, /function escapeText\s*\(/);
  assert.match(SAFE_DOM_BROWSER_SOURCE, /function setText\s*\(/);
});

test("escapeText keeps payloads inert", () => {
  assert.equal(escapeText("<script>"), "&lt;script&gt;");
  assert.ok(typeof appendEl === "function");
  assert.ok(typeof clearNode === "function");
});
