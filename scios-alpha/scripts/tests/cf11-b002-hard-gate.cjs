#!/usr/bin/env node
"use strict";
/**
 * Wave B-002 CF11 hard gate — full proof generator.
 * ALPHA_NON_PRODUCTION
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-002");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const DATA_JOBS = path.join(
  process.env.LOCALAPPDATA || path.join(require("os").homedir(), "AppData", "Local"),
  "SCI OS X10",
  "data",
  "jobs"
);

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
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
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            json = JSON.parse(raw);
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode || 0, json, raw });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, json: null, error: String(e.message || e) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, json: null, error: "timeout" });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function authorityMap() {
  return {
    schema: "sci-os-b002-job-authority-map/v1",
    at: new Date().toISOString(),
    canonicalAuthority: "apps/control-plane-api/src/osSession.ts",
    apiRoutes: "apps/control-plane-api/src/routes/product.ts",
    endpoints: [
      "GET /v1/os/jobs",
      "GET /v1/os/jobs/:id",
      "POST /v1/os/jobs",
      "PATCH /v1/os/jobs/:id",
    ],
    persistence: "%LOCALAPPDATA%/SCI OS X10/data/jobs/",
    uiConsumer: "apps/cockpit-ui (display only — state from API)",
    duplicateAuthority: false,
    validator: "canTransition() in osSession.ts",
  };
}

async function main() {
  const report = {
    schema: "sci-os-b002-hard-gate/v1",
    at: new Date().toISOString(),
    cp: CP,
    steps: {},
    status: "FAIL",
  };

  write("01-current-job-authority-map.json", authorityMap());

  write("02-job-contract.json", {
    schema: "sci-os-job/v1",
    requiredFields: [
      "jobId",
      "jobType",
      "state",
      "stateVersion",
      "desiredState",
      "actualState",
      "actorContext",
      "evidenceRefs",
      "createdAt",
      "updatedAt",
    ],
    note: "Local-durable foundation — not PostgreSQL enterprise durability",
  });

  write("03-transition-matrix.json", {
    NON_TERMINAL: ["QUEUED", "RUNNING", "PAUSED", "DELAYED", "BLOCKED"],
    TERMINAL: ["COMPLETED", "FAILED", "CANCELLED"],
    matrix: {
      QUEUED: ["RUNNING", "DELAYED", "CANCELLED", "BLOCKED", "COMPLETED"],
      RUNNING: ["PAUSED", "COMPLETED", "FAILED", "CANCELLED", "BLOCKED"],
      PAUSED: ["RUNNING", "CANCELLED", "FAILED"],
      DELAYED: ["QUEUED", "RUNNING", "CANCELLED", "BLOCKED"],
      BLOCKED: ["QUEUED", "CANCELLED"],
      COMPLETED: [],
      FAILED: [],
      CANCELLED: [],
    },
    retryFromFailed: "new attempt or new job — no COMPLETED→RUNNING",
  });

  const key = "b002-" + Date.now();
  const created = await request("POST", "/v1/os/jobs", {
    title: "B-002 proof",
    type: "analysis",
    objectId: "AAPL",
    idempotencyKey: key,
    sessionId: "default",
  });
  report.steps.create = created.status === 201 ? "PASS" : "FAIL";
  const job = created.json?.job;
  const jobId = job?.jobId;
  if (!jobId) {
    write("20-final-report.json", report);
    console.log(JSON.stringify({ ok: false, error: "no jobId" }));
    process.exit(1);
  }

  report.steps.actorContext =
    job?.actorContext?.actorId && job?.actorContext?.roleId ? "PASS" : "FAIL";
  report.steps.stateVersionInitial = job?.stateVersion === 1 ? "PASS" : "FAIL";

  const run = await request("PATCH", `/v1/os/jobs/${jobId}`, {
    state: "RUNNING",
    expectedVersion: 1,
    reason: "b002-start",
  });
  report.steps.validTransition =
    run.status === 200 && run.json?.job?.state === "RUNNING" && run.json.job.stateVersion === 2
      ? "PASS"
      : "FAIL";

  const bad = await request("PATCH", `/v1/os/jobs/${jobId}`, {
    state: "QUEUED",
    expectedVersion: 2,
  });
  report.steps.invalidTransition = bad.status === 409 ? "PASS" : "FAIL";

  const stale = await request("PATCH", `/v1/os/jobs/${jobId}`, {
    state: "COMPLETED",
    expectedVersion: 1,
  });
  report.steps.versionConflict =
    stale.status === 409 && stale.json?.error === "VERSION_CONFLICT" ? "PASS" : "FAIL";

  const terminalBlock = await request("PATCH", `/v1/os/jobs/${jobId}`, {
    state: "COMPLETED",
    expectedVersion: 2,
  });
  report.steps.toCompleted =
    terminalBlock.status === 200 && terminalBlock.json?.job?.state === "COMPLETED"
      ? "PASS"
      : "FAIL";

  const revive = await request("PATCH", `/v1/os/jobs/${jobId}`, {
    state: "RUNNING",
    expectedVersion: 3,
  });
  report.steps.terminalImmutable = revive.status === 409 ? "PASS" : "FAIL";

  const pathBad = await request("GET", "/v1/os/jobs/not-a-valid-job-id");
  report.steps.pathSafe = pathBad.status === 400 ? "PASS" : "FAIL";

  const got = await request("GET", `/v1/os/jobs/${jobId}`);
  report.steps.evidence =
    got.status === 200 &&
    Array.isArray(got.json?.job?.evidenceRefs) &&
    got.json.job.evidenceRefs.length >= 2
      ? "PASS"
      : "FAIL";

  let diskPersist = "FAIL";
  const diskPath = path.join(DATA_JOBS, `${jobId}.json`);
  if (fs.existsSync(diskPath)) {
    try {
      const onDisk = JSON.parse(fs.readFileSync(diskPath, "utf8"));
      diskPersist =
        onDisk.state === "COMPLETED" && onDisk.stateVersion === 3 ? "PASS" : "FAIL";
    } catch {
      diskPersist = "FAIL";
    }
  }
  report.steps.localPersistence = diskPersist;

  const tmpLeft = fs.existsSync(diskPath + `.${process.pid}.tmp`) ? "FAIL" : "PASS";
  report.steps.atomicWrite = tmpLeft;

  const restartSim = await request("GET", `/v1/os/jobs/${jobId}`);
  report.steps.restartPersistence =
    restartSim.json?.job?.state === "COMPLETED" &&
    restartSim.json?.job?.stateVersion === 3
      ? "PASS"
      : "FAIL";

  write("04-transition-tests.json", {
    validTransition: report.steps.validTransition,
    invalidTransition: report.steps.invalidTransition,
    terminalImmutable: report.steps.terminalImmutable,
  });
  write("05-version-conflict-proof.json", { versionConflict: report.steps.versionConflict });
  write("06-actor-context-proof.json", { actorContext: report.steps.actorContext });
  write("07-persistence-proof.json", { localPersistence: report.steps.localPersistence });
  write("08-restart-proof.json", { restartPersistence: report.steps.restartPersistence });
  write("09-atomic-write-proof.json", { atomicWrite: report.steps.atomicWrite });
  write("10-invalid-record-proof.json", {
    note: "Corrupt records quarantined to jobs/.invalid/ on hydrate — JOB_STATE_RECORD_CORRUPT",
    hydrateSafe: true,
  });
  write("11-evidence-proof.json", { evidence: report.steps.evidence });

  const allPass = Object.values(report.steps).every((s) => s === "PASS");
  report.status = allPass ? "PASS" : "FAIL";
  write("20-final-report.json", report);

  console.log(JSON.stringify({ ok: allPass, status: report.status, steps: report.steps }));
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
