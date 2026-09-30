#!/usr/bin/env node
"use strict";
/**
 * One-shot refactor: split the ECL/DIL smoke harness callback.
 *
 * The harness was a single ~2060-line async callback, which exceeds the
 * TypeScript control-flow analysis limit (TS2563). Once tsc bails out of flow
 * analysis it also stops contextually typing nested callbacks, producing 46
 * spurious TS7006 implicit-any errors. Splitting the body restores analysis.
 */
const fs = require("fs");
const path = require("path");

const FILE = path.resolve(
  __dirname,
  "../../apps/control-plane-api/src/eclDil.smoke.ts"
);
const src = fs.readFileSync(FILE, "utf8");
const eol = src.includes("\r\n") ? "\r\n" : "\n";
const lines = src.split(/\r?\n/);

const startMarker = '  const domainFabric = (await get("/v1/ecl/professional/domain-fabric")) as {';
const endMarker = "  server.close();";

const start = lines.findIndex((l) => l === startMarker);
const end = lines.findIndex((l) => l === endMarker);
if (start < 0 || end < 0 || end <= start) {
  console.error(JSON.stringify({ ok: false, error: "markers_not_found", start, end }));
  process.exit(1);
}

const extracted = lines.slice(start, end);
if (!extracted.some((l) => /const prop\s*[:=]/.test(l))) {
  console.error(JSON.stringify({ ok: false, error: "prop_declaration_not_in_range" }));
  process.exit(1);
}

const fn = [
  "/**",
  " * Professional-fabric refusal checks.",
  " *",
  " * Kept as a separate function so neither body exceeds the TypeScript",
  " * control-flow analysis limit (TS2563); exceeding it silently disables",
  " * contextual typing for every nested callback in the same body.",
  " */",
  "async function professionalFabricChecks(",
  "  get: SmokeGet,",
  "  fails: string[],",
  "  base: string,",
  "  markets: { data?: Array<{ marketId: string }> },",
  "  auditBeforeDigital: { data?: unknown[] }",
  ") {",
  ...extracted,
  "  return { prop };",
  "}",
  "",
];

const head = lines.slice(0, start);
const tail = lines.slice(end);

// Insert the extracted function above `server.listen(`, at module scope.
const listenIdx = head.findIndex((l) => l.startsWith("server.listen("));
if (listenIdx < 0) {
  console.error(JSON.stringify({ ok: false, error: "server_listen_not_found" }));
  process.exit(1);
}

const typeDecl = [
  "type SmokeGet = (p: string) => Promise<Record<string, unknown>>;",
  "",
];

const out = [
  ...head.slice(0, listenIdx),
  ...typeDecl,
  ...fn,
  ...head.slice(listenIdx),
  "  const { prop } = await professionalFabricChecks(",
  "    get,",
  "    fails,",
  "    base,",
  "    markets,",
  "    auditBeforeDigital",
  "  );",
  ...tail,
];

fs.writeFileSync(FILE, out.join(eol));
console.log(
  JSON.stringify({
    ok: true,
    extractedLines: extracted.length,
    callbackLinesRemaining: head.length - listenIdx + tail.length,
  })
);
