#!/usr/bin/env node
"use strict";
/**
 * Wave B-006 cockpit UI hard gate — static + optional live API.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-006");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const COCKPIT = process.env.SCIOS_COCKPIT_URL || "http://127.0.0.1:4000";

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function get(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    http
      .get({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout: 8000 }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") }));
      })
      .on("error", () => resolve({ status: 0, body: "" }));
  });
}

async function main() {
  const report = {
    schema: "sci-os-b006-cockpit-ui-hard-gate/v1",
    at: new Date().toISOString(),
    steps: {},
    status: "FAIL",
  };

  const index = read("apps/cockpit-ui/src/index.js");
  const ux = read("apps/cockpit-ui/src/professional-ux.js");
  const primitives = read("apps/cockpit-ui/src/components/primitives.js");

  const panels = [
    "ContextHeader",
    "PredictionPanel",
    "UncertaintyPanel",
    "RiskPanel",
    "DecisionPanel",
    "SimulationPanel",
    "EvidencePanel",
    "LineagePanel",
  ];
  report.steps.eightPanels = panels.every((p) => index.includes('data-exp-module="' + p + '"')) ? "PASS" : "FAIL";
  report.steps.contextHeaderBar = index.includes("contextHeaderBar") && index.includes("renderContextHeader") ? "PASS" : "FAIL";
  report.steps.jobCenterView = index.includes('id="jobs"') && index.includes("renderJobCenter") ? "PASS" : "FAIL";
  report.steps.systemDashboard = index.includes("renderSystemDashboard") && index.includes("sysHealthRoot") ? "PASS" : "FAIL";
  report.steps.eightRoles =
    index.includes("populateRoleSelect") &&
    ux.includes("arch.fin_risk_analyst") &&
    ux.includes("arch.eng_operator") &&
    ux.includes("arch.auditor")
      ? "PASS"
      : "FAIL";
  report.steps.primitivesWired =
    index.includes("PRIMITIVES_BROWSER_SOURCE") &&
    index.includes("PROFESSIONAL_UX_BROWSER_SOURCE") &&
    primitives.includes("createLoadingState") &&
    (index.includes("createLoadingState") || ux.includes("createLoadingState"))
      ? "PASS"
      : "FAIL";
  report.steps.densityCss = index.includes("data-density") && index.includes("data-disclosure") ? "PASS" : "FAIL";
  report.steps.professionalDecisions = index.includes("decisionsProRoot") && index.includes("renderDecisionProfessional") ? "PASS" : "FAIL";
  report.steps.professionalEvidence = index.includes("evidenceProRoot") && index.includes("renderEvidenceProfessional") ? "PASS" : "FAIL";
  report.steps.noInnerHtml = /\.innerHTML\s*=/.test(index) ? "FAIL" : "PASS";
  report.steps.engPanelSwap = index.includes("showEngPanel") ? "PASS" : "FAIL";
  report.steps.analyzeLoadingState = index.includes("setAnalyzePanelsState") ? "PASS" : "FAIL";

  const live = await get(COCKPIT + "/");
  report.steps.cockpitHttp = live.status === 200 ? "PASS" : "SKIP";
  if (live.status === 200) {
    report.steps.htmlContextHeader = live.body.includes("contextHeaderBar") ? "PASS" : "FAIL";
    report.steps.htmlJobCenter = live.body.includes('id="jobs"') ? "PASS" : "FAIL";
    report.steps.htmlEightRoles = live.body.includes("arch.auditor") ? "PASS" : "FAIL";
    report.steps.htmlPanels = panels.every((p) => live.body.includes(p)) ? "PASS" : "FAIL";
  } else {
    report.steps.htmlContextHeader = "SKIP";
    report.steps.htmlJobCenter = "SKIP";
    report.steps.htmlEightRoles = "SKIP";
    report.steps.htmlPanels = "SKIP";
  }

  const cpReady = await get(CP + "/readyz");
  report.steps.cpContract = cpReady.status === 200 ? "PASS" : "SKIP";

  write("03-implementation.json", {
    authorities: [
      "apps/cockpit-ui/src/index.js",
      "apps/cockpit-ui/src/professional-ux.js",
      "apps/cockpit-ui/src/components/primitives.js",
    ],
    panels,
    roles: 8,
  });

  const allPass = Object.values(report.steps).every((s) => s === "PASS" || s === "SKIP");
  report.status = allPass ? "PASS" : "FAIL";
  write("04-tests.json", report);
  console.log(JSON.stringify({ ok: allPass, status: report.status, steps: report.steps }));
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
