#!/usr/bin/env node
"use strict";
/**
 * Wave B-005 job-engine v1 hard gate.
 * ALPHA_NON_PRODUCTION
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-005");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const DATA_JOBS = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
  "SCI OS X10",
  "data",
  "jobs"
);

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
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
        timeout: 20000,
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

async function main() {
  const report = {
    schema: "sci-os-b005-job-engine-hard-gate/v1",
    at: new Date().toISOString(),
    cp: CP,
    steps: {},
    status: "FAIL",
  };

  const status = await request("GET", "/v1/os/job-engine/status");
  report.steps.engineStatus =
    status.status === 200 && status.json?.schema === "sci-os-job-engine/v1" ? "PASS" : "FAIL";

  const key = "b005-" + Date.now();
  const created = await request("POST", "/v1/os/jobs", {
    title: "B-005 engine job",
    idempotencyKey: key,
    sessionId: "default",
    maxAttempts: 2,
  });
  report.steps.jobCreate = created.status === 201 ? "PASS" : "FAIL";
  const jobId = created.json?.job?.jobId;
  if (!jobId) {
    write("04-job-engine-tests.json", report);
    process.exit(1);
  }

  const dup = await request("POST", "/v1/os/jobs", { idempotencyKey: key, sessionId: "default" });
  report.steps.duplicateSubmission =
    dup.status === 201 && dup.json?.job?.jobId === jobId ? "PASS" : "FAIL";

  const fakeComplete = await request("POST", `/v1/os/jobs/${jobId}/complete`, {
    sessionId: "default",
    result: { fake: true },
  });
  report.steps.noFakeCompletion = fakeComplete.status === 409 ? "PASS" : "FAIL";

  const started = await request("POST", `/v1/os/jobs/${jobId}/start`, { sessionId: "default" });
  report.steps.jobStart = started.status === 200 && started.json?.job?.state === "RUNNING" ? "PASS" : "FAIL";

  const dupStart = await request("POST", `/v1/os/jobs/${jobId}/start`, { sessionId: "default" });
  report.steps.duplicateStart =
    dupStart.status === 409 && dupStart.json?.error === "ALREADY_RUNNING" ? "PASS" : "FAIL";

  const completed = await request("POST", `/v1/os/jobs/${jobId}/complete`, {
    sessionId: "default",
    result: { ok: true, proof: "b005" },
  });
  report.steps.jobComplete =
    completed.status === 200 && completed.json?.job?.state === "COMPLETED" ? "PASS" : "FAIL";

  const failKey = "b005-fail-" + Date.now();
  const failJob = await request("POST", "/v1/os/jobs", {
    idempotencyKey: failKey,
    maxAttempts: 1,
    sessionId: "default",
  });
  const failId = failJob.json?.job?.jobId;
  if (failId) {
    await request("POST", `/v1/os/jobs/${failId}/start`, { sessionId: "default" });
    await request("POST", `/v1/os/jobs/${failId}/fail`, {
      sessionId: "default",
      error: { code: "TEST_FAIL" },
    });
    const retry = await request("POST", `/v1/os/jobs/${failId}/retry`, { sessionId: "default" });
    report.steps.retryBoundary =
      retry.status === 409 && retry.json?.error === "RETRY_EXHAUSTED" ? "PASS" : "FAIL";
  } else {
    report.steps.retryBoundary = "FAIL";
  }

  const diskPath = path.join(DATA_JOBS, `${jobId}.json`);
  report.steps.persistence =
    fs.existsSync(diskPath) && JSON.parse(fs.readFileSync(diskPath, "utf8")).state === "COMPLETED"
      ? "PASS"
      : "FAIL";

  const nodeExe =
    process.env.SCIOS_BUNDLED_NODE ||
    path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "runtime", "node", "node.exe");
  const childScript = path.join(ROOT, "scripts/tests/b005-restart-child.mjs");
  let restart = "FAIL";
  if (fs.existsSync(nodeExe)) {
    const r = spawnSync(nodeExe, [childScript, jobId], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 15000,
      env: { ...process.env },
    });
    try {
      const parsed = JSON.parse(r.stdout || "{}");
      restart = parsed.ok ? "PASS" : "FAIL";
    } catch {
      restart = "FAIL";
    }
  } else {
    const got = await request("GET", `/v1/os/jobs/${jobId}`);
    restart =
      got.json?.job?.state === "COMPLETED" && got.json?.job?.evidenceRefs?.length >= 2
        ? "PASS"
        : "FAIL";
  }
  report.steps.restartHydrate = restart;

  write("03-job-engine-implementation.json", {
    authority: "apps/control-plane-api/src/osSession.ts",
    orchestrator: "apps/control-plane-api/src/jobEngine.ts",
    routes: [
      "GET /v1/os/job-engine/status",
      "POST /v1/os/jobs/:id/start|complete|fail|retry|cancel|recover",
    ],
  });

  const b002 = spawnSync("node", ["scripts/tests/cf11-b002-hard-gate.cjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env, SCIOS_CP_URL: CP },
  });
  report.steps.b002Regression = b002.status === 0 ? "PASS" : "FAIL";

  const b003 = spawnSync("node", ["scripts/tests/cf14-b003-hard-gate.cjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env, SCIOS_CP_URL: CP },
  });
  report.steps.b003Regression = b003.status === 0 ? "PASS" : "FAIL";

  const allPass = Object.values(report.steps).every((s) => s === "PASS");
  report.status = allPass ? "PASS" : "FAIL";
  write("04-job-engine-tests.json", report);

  console.log(JSON.stringify({ ok: allPass, status: report.status, steps: report.steps }));
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
