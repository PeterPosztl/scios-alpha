#!/usr/bin/env node
"use strict";
/**
 * One-shot codemod: rewrite literal-typed honesty guards to the explicit
 * readers in src/honesty-flags.ts.
 *
 * Driven by tsc diagnostics so only positions TypeScript actually rejects are
 * touched. Runtime semantics are unchanged: `x === true` becomes `isOn(x)`.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const PKG = path.resolve(__dirname, "../../packages/ecl-dil");

function diagnostics() {
  const r = spawnSync("npx", ["tsc", "-p", "tsconfig.json", "--noEmit"], {
    cwd: PKG,
    encoding: "utf8",
    shell: true,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const hits = [];
  const re = /^(src[^(]+)\((\d+),(\d+)\): error TS2367:/gm;
  let m;
  while ((m = re.exec(out))) {
    hits.push({ file: m[1].replace(/\\/g, "/"), line: Number(m[2]), col: Number(m[3]) });
  }
  return hits;
}

// Rewrites `<operand> === true` (or === false) starting at col into isOn(<operand>).
function rewriteAt(text, col) {
  const start = col - 1;
  const rest = text.slice(start);
  const m = /^([\s\S]*?)\s*===\s*(true|false)\b/.exec(rest);
  if (!m) return null;
  const operand = m[1].trim();
  if (!operand || operand.includes("===") || operand.includes("?")) return null;
  const reader = m[2] === "true" ? "isOn" : "isOff";
  return {
    text: text.slice(0, start) + `${reader}(${operand})` + rest.slice(m[0].length),
    operand,
    reader,
  };
}

function ensureImport(text) {
  if (/from "\.\/honesty-flags\.js"/.test(text)) return text;
  const needs = [];
  if (/\bisOn\(/.test(text)) needs.push("isOn");
  if (/\bisOff\(/.test(text)) needs.push("isOff");
  if (!needs.length) return text;
  const imp = `import { ${needs.join(", ")} } from "./honesty-flags.js";\n`;
  const lastImport = [...text.matchAll(/^import [\s\S]*?;\s*$/gm)].pop();
  if (lastImport) {
    const at = lastImport.index + lastImport[0].length;
    return text.slice(0, at) + "\n" + imp.trimEnd() + text.slice(at);
  }
  const blockEnd = text.indexOf("*/");
  const at = blockEnd === -1 ? 0 : blockEnd + 2;
  return text.slice(0, at) + "\n" + imp + text.slice(at);
}

function main() {
  const applied = [];
  for (let pass = 0; pass < 12; pass++) {
    const hits = diagnostics();
    if (!hits.length) break;
    // Highest column first so earlier rewrites do not shift later positions.
    const byFile = new Map();
    for (const h of hits) {
      if (!byFile.has(h.file)) byFile.set(h.file, []);
      byFile.get(h.file).push(h);
    }
    let changed = 0;
    for (const [file, list] of byFile) {
      const abs = path.join(PKG, file);
      let text = fs.readFileSync(abs, "utf8");
      const lines = text.split("\n");
      list.sort((a, b) => b.line - a.line || b.col - a.col);
      for (const h of list) {
        const idx = h.line - 1;
        if (!lines[idx]) continue;
        const res = rewriteAt(lines[idx], h.col);
        if (!res) continue;
        lines[idx] = res.text;
        applied.push({ file, line: h.line, operand: res.operand, reader: res.reader });
        changed++;
      }
      let next = lines.join("\n");
      next = ensureImport(next);
      if (next !== text) fs.writeFileSync(abs, next);
    }
    if (!changed) break;
  }
  console.log(JSON.stringify({ rewritten: applied.length, sample: applied.slice(0, 8) }, null, 2));
}

main();
