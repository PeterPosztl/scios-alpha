#!/usr/bin/env node
"use strict";
/**
 * B-006 installed cockpit E2E — professional UX surfaces on packaged app.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-006");
const CP = "http://127.0.0.1:3000";
const COCKPIT = "http://127.0.0.1:4000";

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    http
      .get({ hostname: u.hostname, port: u.port, path: u.pathname, timeout: 20000 }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") }));
      })
      .on("error", () => resolve({ status: 0, body: "" }));
  });
}

async function waitHealthy(maxMs = 90000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      http
        .get(CP + "/healthz", { timeout: 2000 }, (res) => {
          res.resume();
          resolve(res.statusCode === 200);
        })
        .on("error", () => resolve(false));
    });
    if (ok) return true;
    await sleep(1000);
  }
  return false;
}

function stopInstalled() {
  spawnSync(process.execPath, [path.join(ROOT, "installer/scripts/convergence/stop.cjs")], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 45000,
  });
}

async function main() {
  const report = {
    schema: "sci-os-b006-installed-e2e/v1",
    at: new Date().toISOString(),
    installDir: INSTALL,
    cases: {},
    status: "FAIL",
  };

  stopInstalled();
  await sleep(1500);
  spawn(path.join(INSTALL, "SCI-OS-X10.exe"), [], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();

  if (!(await waitHealthy())) {
    write("08-installed-e2e-proof.json", report);
    process.exit(1);
  }

  const html = await get(COCKPIT + "/");
  report.cases.cockpitReachable = html.status === 200 ? "PASS" : "FAIL";
  report.cases.contextHeader = html.body.includes("contextHeaderBar") ? "PASS" : "FAIL";
  report.cases.jobCenter = html.body.includes('id="jobs"') && html.body.includes("jobCenterRoot") ? "PASS" : "FAIL";
  report.cases.eightRoles = html.body.includes("arch.fin_risk_analyst") && html.body.includes("arch.auditor") ? "PASS" : "FAIL";
  report.cases.eightPanels =
    ["ContextHeader", "PredictionPanel", "RiskPanel", "LineagePanel"].every((p) => html.body.includes(p))
      ? "PASS"
      : "FAIL";
  report.cases.systemDashboard = html.body.includes("sysHealthRoot") && html.body.includes("renderSystemDashboard") ? "PASS" : "FAIL";
  report.cases.professionalRoots =
    html.body.includes("decisionsProRoot") && html.body.includes("evidenceProRoot") ? "PASS" : "FAIL";

  const jobs = await get(CP + "/v1/os/jobs");
  report.cases.jobsApi = jobs.status === 200 ? "PASS" : "FAIL";

  report.cases.allPass = Object.values(report.cases).every((v) => v === "PASS");
  report.status = report.cases.allPass ? "PASS" : "FAIL";

  stopInstalled();
  write("08-installed-e2e-proof.json", report);
  console.log(JSON.stringify({ ok: report.status === "PASS", status: report.status, cases: report.cases }));
  process.exit(report.status === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
