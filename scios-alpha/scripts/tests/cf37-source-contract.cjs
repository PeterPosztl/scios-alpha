#!/usr/bin/env node
"use strict";
/**
 * CF37 source contract — Product Kernel actor identity is server-authoritative.
 *
 * Guards the HTTP surface so /v1/product/context and /v1/kernel/projection
 * cannot forward a client-supplied workspaceId into the actor envelope, and
 * so experience compile resolves session/workspace from the stored session.
 *
 * Installed proof is scripts/tests/cf37-context-continuity.cjs.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const PRODUCT = fs.readFileSync(
  path.join(ROOT, "apps/control-plane-api/src/routes/product.ts"),
  "utf8"
);
const ACTOR = fs.readFileSync(
  path.join(ROOT, "packages/product-kernel/src/actor-context.js"),
  "utf8"
);

const checks = {
  helperPresent: /function serverAuthoritativeProjectionInput\(url: URL\)/.test(PRODUCT)
    ? "PASS"
    : "FAIL",
  contextUsesHelper: /uiProjection\(serverAuthoritativeProjectionInput\(url\)\)/.test(PRODUCT)
    ? "PASS"
    : "FAIL",
  compileResolvesSession: /const session = getOrCreateSession\(input\.sessionId/.test(PRODUCT)
    ? "PASS"
    : "FAIL",
  compileDoesNotHardcodeNullWorkspace:
    /compileProductExperience[\s\S]*?workspaceId:\s*null/.test(PRODUCT) ? "FAIL" : "PASS",
  workspaceNotFromQuery:
    /workspaceId:\s*url\.searchParams\.get\(\s*"workspaceId"/.test(PRODUCT) ? "FAIL" : "PASS",
  helperReadsSessionWorkspace: /session\.activeWorkspaceId/.test(PRODUCT) ? "PASS" : "FAIL",
  helperReadsSessionId: /session\.sessionId/.test(PRODUCT) ? "PASS" : "FAIL",
  actorEnvelopeCarriesSession: /sessionId:\s*input\.sessionId/.test(ACTOR) ? "PASS" : "FAIL",
  actorEnvelopeCarriesWorkspace: /workspaceId:\s*input\.workspaceId/.test(ACTOR) ? "PASS" : "FAIL",
};

const failed = Object.entries(checks)
  .filter(([, v]) => v !== "PASS")
  .map(([k]) => k);
const ok = failed.length === 0;
const report = {
  schema: "sci-os-cf37-source-contract/v1",
  label: "ALPHA_NON_PRODUCTION",
  at: new Date().toISOString(),
  checks,
  status: ok ? "PASS" : "FAIL",
  token: ok ? "CF37_SOURCE_CONTRACT_PASS" : "CF37_SOURCE_CONTRACT_FAIL",
  failed,
};

const outDir = path.join(ROOT, "diagnostics-export", "final-completion");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "cf37-source-contract.json"), JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify({ ok, token: report.token, failed }));
process.exit(ok ? 0 : 1);
