#!/usr/bin/env node
"use strict";

/**
 * WHI-011 live golden-path probe against the current installed runtime.
 * Does not launch or kill. ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "windows-host-v1", "host-digital-twin");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function httpReq(method, url, body, timeoutMs) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const payload = body != null ? Buffer.from(JSON.stringify(body), "utf8") : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        timeout: timeoutMs || 20000,
        headers: payload
          ? { "content-type": "application/json", "content-length": payload.length }
          : {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode || 0, body: parsed, raw });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: String(e.message || e) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const twinPath = path.join(INSTALL, "diagnostics-export", "host", "digital-twin.json");
  const liveTwin = fs.existsSync(twinPath) ? readJson(twinPath) : null;
  const synthetic02 = fs.existsSync(path.join(OUT, "02-normal-running-proof.json"))
    ? readJson(path.join(OUT, "02-normal-running-proof.json"))
    : null;

  write("02-normal-running-proof.json", {
    schema: "sci-os-whi-011-running-proof/v1",
    status:
      liveTwin &&
      liveTwin.desired &&
      liveTwin.desired.lifecycle === "RUNNING" &&
      liveTwin.actual &&
      liveTwin.actual.runtimeStatus === "RUNNING" &&
      Array.isArray(liveTwin.drift) &&
      liveTwin.drift.length === 0
        ? "PASS"
        : "FAIL",
    mode: "INSTALLED",
    snapshot: liveTwin,
    syntheticFixtureAlso: synthetic02 && synthetic02.status === "PASS",
  });

  const steps = [];
  function push(name, ok, extra) {
    steps.push({ name, ok, ...extra });
  }

  const cpH = await httpReq("GET", "http://127.0.0.1:3000/healthz");
  push("CONTROL_PLANE_HEALTH", cpH.status === 200, { status: cpH.status, service: cpH.body && cpH.body.service });
  const uiH = await httpReq("GET", "http://127.0.0.1:4000/healthz");
  push("COCKPIT_HEALTH", uiH.status === 200, { status: uiH.status, service: uiH.body && uiH.body.service });
  const home = await httpReq("GET", "http://127.0.0.1:3000/v1/home");
  push("HOME", home.status === 200, { status: home.status });
  const search = await httpReq("GET", "http://127.0.0.1:3000/v1/search?q=AAPL");
  const hits = Array.isArray(search.body && search.body.results)
    ? search.body.results
    : (((search.body && search.body.results) || {}).entities ||
        (search.body && search.body.hits) ||
        (search.body && search.body.items) ||
        []);
  push("SEARCH_AAPL", search.status === 200 && hits.length > 0, { status: search.status, hitCount: hits.length });
  const entity = await httpReq("GET", "http://127.0.0.1:3000/v1/entities/AAPL");
  push("ENTITY", entity.status === 200 && !!(entity.body && entity.body.entity), {
    status: entity.status,
    entityId: entity.body && entity.body.entity && entity.body.entity.id,
  });
  const exp = await httpReq(
    "GET",
    "http://127.0.0.1:3000/v1/experience/compile?roleId=arch.market_analyst&workflowState=ready"
  );
  push("EXPERIENCE", exp.status === 200 && exp.body && exp.body.compilerStatus === "RUNTIME_MOUNTED", {
    status: exp.status,
    compilerStatus: exp.body && exp.body.compilerStatus,
  });
  const analyze = await httpReq("POST", "http://127.0.0.1:3000/api/vertical-slice/run", {
    instrumentId: "AAPL",
    horizonSec: 3600,
    size: 10,
    actor: "actor:arch.market_analyst",
    role: "arch.market_analyst",
    idempotencyKey: "whi011-p0-" + Date.now(),
  });
  const run = analyze.body || {};
  push("GW1", analyze.status === 200 && !!run.runId, { status: analyze.status, runId: run.runId, pipeline: run.status });
  const science =
    (run.predictionEnvelope && (run.predictionEnvelope.scienceStatus || run.predictionEnvelope.maturity)) ||
    run.modelTruth ||
    null;
  push("UNCERTAINTY", !!run.runId && !/PRODUCTION_VALIDATED|CERTIFIED/i.test(String(science || "")), {
    scienceStatus: science,
  });
  const risk = run.riskDecision || {};
  const gov = run.governanceDecision || {};
  push("RISK_GOVERNANCE", !!(risk.decision || gov.decision || run.status), {
    risk: risk.decision || risk.status || null,
    governance: gov.decision || gov.status || null,
  });
  if (run.runId) {
    const ev = await httpReq("GET", "http://127.0.0.1:3000/v1/runs/" + encodeURIComponent(run.runId) + "/professional");
    push("EVIDENCE", ev.status === 200, { status: ev.status });
    const lin = await httpReq("GET", "http://127.0.0.1:3000/v1/lineage/" + encodeURIComponent(run.runId));
    push("LINEAGE", lin.status === 200 && !!(lin.body && (lin.body.verified === true || lin.body.nodes || lin.body.lineage)), {
      status: lin.status,
      verified: lin.body && lin.body.verified,
    });
  } else {
    push("EVIDENCE", false, { error: "no_run" });
    push("LINEAGE", false, { error: "no_run" });
  }

  const failed = steps.filter((s) => !s.ok);
  write("12-p0-regression-proof.json", {
    schema: "sci-os-whi-011-p0-regression/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    installedBuild:
      liveTwin && liveTwin.runtime && liveTwin.runtime.buildId
        ? liveTwin.runtime.buildId
        : null,
    hostTwinLifecycle: liveTwin && liveTwin.desired && liveTwin.desired.lifecycle,
    hostDrift: liveTwin && liveTwin.drift,
    jobStatus: liveTwin && liveTwin.actual && liveTwin.actual.job && liveTwin.actual.job.status,
    steps,
    failed: failed.map((s) => s.name),
    p0: failed.length === 0 ? 0 : failed.length,
    status: failed.length === 0 ? "PASS" : "FAIL",
  });

  console.log(JSON.stringify({ p0: failed.length === 0 ? 0 : failed.length, failed: failed.map((s) => s.name), gw1: run.runId || null }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
