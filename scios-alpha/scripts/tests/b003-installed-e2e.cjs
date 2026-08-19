#!/usr/bin/env node
"use strict";
/**
 * B-003 installed policy E2E — SCI-OS-X10.exe only.
 * ALPHA_NON_PRODUCTION
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-003");
const CP = "http://127.0.0.1:3000";

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function request(method, urlPath, body) {
  return new Promise((resolve) => {
    const u = new URL(urlPath, CP);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: payload
          ? { "content-type": "application/json", "content-length": payload.length }
          : {},
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode || 0, json });
        });
      }
    );
    req.on("error", () => resolve({ status: 0, json: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, json: null });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitHealthy(maxMs = 90000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const cp = await new Promise((resolve) => {
      http.get(CP + "/healthz", { timeout: 2000 }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }).on("error", () => resolve(false));
    });
    if (cp) return true;
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
    schema: "sci-os-b003-installed-policy-e2e/v1",
    at: new Date().toISOString(),
    installDir: INSTALL,
    launcher: path.join(INSTALL, "SCI-OS-X10.exe"),
    cases: {},
    status: "FAIL",
  };

  stopInstalled();
  await sleep(1500);
  spawn(path.join(INSTALL, "SCI-OS-X10.exe"), [], {
    cwd: INSTALL,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();

  if (!(await waitHealthy())) {
    write("24-installed-policy-e2e-proof.json", report);
    process.exit(1);
  }

  const localReview = await request("POST", "/v1/governance/action", {
    actionId: "act.local_review.approve",
    roleId: "arch.market_analyst",
    objectId: "AAPL",
    workflowState: "local_review",
  });
  report.cases.localReviewAllowed =
    localReview.status === 200 &&
    localReview.json?.reviewKind === "LOCAL_REVIEW_STATE" &&
    localReview.json?.policy?.decision === "CONDITIONAL"
      ? "PASS"
      : "FAIL";

  const permDeny = await request("POST", "/v1/governance/action", {
    actionId: "analyze",
    roleId: "arch.restricted",
    permission: { allowed: false },
  });
  report.cases.permissionDenied =
    permDeny.status === 403 && permDeny.json?.executed === false ? "PASS" : "FAIL";

  const simAllow = await request("POST", "/v1/governance/evaluate", {
    actionId: "analyze",
    roleId: "arch.market_analyst",
    executionMode: "SIMULATION_ONLY",
    objectId: "AAPL",
  });
  const execDeny = await request("POST", "/v1/governance/evaluate", {
    actionId: "live_execution",
    roleId: "arch.market_analyst",
    executionMode: "SIMULATION_ONLY",
    objectId: "AAPL",
  });
  report.cases.simulationOnly =
    simAllow.json?.policy?.decision === "ALLOW" && execDeny.json?.policy?.decision === "DENY"
      ? "PASS"
      : "FAIL";

  const unknown = await request("POST", "/v1/governance/evaluate", {
    actionId: "live_execution",
    roleId: "arch.market_analyst",
    risk: { unknown: true },
    executionMode: "SIMULATION_ONLY",
  });
  report.cases.unknownFailClosed = unknown.json?.policy?.decision !== "ALLOW" ? "PASS" : "FAIL";

  const can = await request(
    "GET",
    "/v1/governance/can?roleId=arch.market_analyst&action=live_execution&objectId=AAPL"
  );
  report.cases.canTruth =
    can.json?.decision === "DENY" && can.json?.decisionId ? "PASS" : "FAIL";

  const allPass = Object.values(report.cases).every((s) => s === "PASS");
  report.status = allPass ? "PASS" : "FAIL";
  write("24-installed-policy-e2e-proof.json", report);

  stopInstalled();
  console.log(JSON.stringify({ ok: allPass, cases: report.cases }));
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
