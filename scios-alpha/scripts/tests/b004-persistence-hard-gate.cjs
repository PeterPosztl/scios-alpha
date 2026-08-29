#!/usr/bin/env node
"use strict";
/**
 * Wave B-004 persistence / durable matrix hard gate.
 * ALPHA_NON_PRODUCTION — local-durable expansion; PG remains PROFILE_DISABLED (FD-002).
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-004");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const DATA_ROOT = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
  "SCI OS X10",
  "data"
);
const VS_STORE = path.join(DATA_ROOT, "vertical-slice");

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
    schema: "sci-os-b004-persistence-authority-map/v1",
    at: new Date().toISOString(),
    jobsAuthority: "apps/control-plane-api/src/osSession.ts",
    verticalSliceAuthority: "packages/vertical-slice/src/local-durable.ts",
    matrixAuthority: "packages/vertical-slice/src/persistence-matrix.ts",
    matrixRoute: "GET /v1/system/persistence-matrix",
    postgresTruth: "PROFILE_DISABLED — FD-002 open",
    duplicateAuthority: false,
  };
}

async function main() {
  const report = {
    schema: "sci-os-b004-hard-gate/v1",
    at: new Date().toISOString(),
    cp: CP,
    steps: {},
    status: "FAIL",
  };

  write("01-current-persistence-authority-map.json", authorityMap());

  const matrix = await request("GET", "/v1/system/persistence-matrix");
  report.steps.persistenceMatrixRoute =
    matrix.status === 200 && matrix.json?.schema === "sci-os-persistence-state-matrix/v1"
      ? "PASS"
      : "FAIL";

  report.steps.verticalSliceDurable =
    matrix.json?.states?.verticalSliceRuns?.classification === "DURABLE" &&
    matrix.json?.states?.verticalSliceRuns?.restartSafe === true &&
    matrix.json?.states?.verticalSliceRuns?.atomicWrite === true
      ? "PASS"
      : "FAIL";

  report.steps.postgresHonestDisabled =
    matrix.json?.states?.postgres?.classification === "PROFILE_DISABLED" &&
    matrix.json?.states?.postgres?.externalDependency === "FD-002"
      ? "PASS"
      : "FAIL";

  report.steps.jobsStillDurable =
    matrix.json?.states?.jobs?.classification === "DURABLE" ? "PASS" : "FAIL";

  write("02-persistence-matrix-proof.json", {
    route: report.steps.persistenceMatrixRoute,
    matrix: matrix.json,
  });

  const slice = await request("POST", "/v1/slice/run", {
    instrumentId: "AAPL",
    size: 10,
    horizonSec: 3600,
    seed: 42,
    eventTime: "2026-07-16T12:00:00.000Z",
    source: "b004-gate",
    roleId: "arch.market_analyst",
  });

  const runId = slice.json?.runId || slice.json?.run?.runId;
  report.steps.sliceRun =
    slice.status === 200 && runId && slice.json?.persistenceState === "PERSISTED" ? "PASS" : "FAIL";

  const runFile = path.join(VS_STORE, "runs", `${String(runId || "").replace(/[^a-zA-Z0-9._-]/g, "_")}.json`);
  report.steps.diskPersist = runId && fs.existsSync(runFile) ? "PASS" : "FAIL";

  const tmpLeft =
    runId && fs.existsSync(runFile + `.${process.pid}.tmp`) ? "FAIL" : report.steps.diskPersist;
  report.steps.atomicWrite = tmpLeft;

  const nodeBin = process.env.SCIOS_NODE || process.execPath;
  const child = spawnSync(nodeBin, [path.join(ROOT, "scripts/tests/b004-restart-child.mjs"), runId], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    timeout: 15000,
  });
  let childOk = false;
  try {
    childOk = JSON.parse(String(child.stdout || "{}").trim()).ok === true;
  } catch {
    childOk = false;
  }
  report.steps.restartHydrate = childOk ? "PASS" : "FAIL";

  write("03-vertical-slice-persistence-proof.json", {
    runId,
    runFile,
    sliceStatus: slice.status,
    sliceError: slice.json?.error,
    persistenceState: slice.json?.persistenceState,
    diskPersist: report.steps.diskPersist,
    restartHydrate: report.steps.restartHydrate,
    childStdout: child.stdout,
    childStderr: child.stderr,
  });

  write("04-atomic-write-proof.json", { atomicWrite: report.steps.atomicWrite });
  write("05-postgres-deferred-truth.json", {
    postgres: matrix.json?.states?.postgres,
    honest: report.steps.postgresHonestDisabled,
  });

  const b003 = spawnSync(nodeBin, [path.join(ROOT, "scripts/tests/cf14-policy-unit.cjs")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  report.steps.b003Regression = b003.status === 0 ? "PASS" : "FAIL";

  const b002 = spawnSync(nodeBin, [path.join(ROOT, "scripts/tests/cf11-job-states.cjs")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  report.steps.b002Regression = b002.status === 0 ? "PASS" : "FAIL";

  write("20-final-report.json", report);

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
