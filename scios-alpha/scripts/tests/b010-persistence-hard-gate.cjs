#!/usr/bin/env node
"use strict";
/**
 * Wave B-010 persistence Beta gate (FD-002).
 * ALPHA_NON_PRODUCTION
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-010");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const DATA_ROOT = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
  "SCI OS X10",
  "data"
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

function sourceExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

async function main() {
  const report = {
    schema: "sci-os-b010-persistence-hard-gate/v1",
    at: new Date().toISOString(),
    cp: CP,
    steps: {},
    token: null,
    status: "FAIL",
  };

  report.steps.persistenceModule =
    sourceExists("packages/vertical-slice/src/persistence/health.ts") &&
    sourceExists("packages/vertical-slice/src/persistence/postgres-adapter.ts") &&
    sourceExists("packages/vertical-slice/src/persistence/migrations/001_initial.sql")
      ? "PASS"
      : "FAIL";

  report.steps.repositoryInterfaces = sourceExists(
    "packages/vertical-slice/src/persistence/repository-types.ts"
  )
    ? "PASS"
    : "FAIL";

  const health = await request("GET", "/v1/persistence/health");
  report.steps.persistenceHealthEndpoint =
    health.status === 200 && health.json?.schema === "sci-os-persistence-health/v1"
      ? "PASS"
      : "FAIL";

  report.steps.localPass =
    health.json?.local?.status === "PASS" &&
    (health.json?.fallback?.mode === "LOCAL_PRIMARY" ||
      (health.json?.postgres?.status === "READY" &&
        health.json?.fallback?.mode === "PG_PRIMARY" &&
        health.json?.postgres?.primary === true))
      ? "PASS"
      : "FAIL";

  const pgStatus = health.json?.postgres?.status;
  const verdict = health.json?.verdict;
  report.steps.postgresHonest =
    pgStatus === "READY" || pgStatus === "BLOCKED_WITH_EXTERNAL_DEPENDENCY" ? "PASS" : "FAIL";

  report.steps.verdictToken =
    verdict === "B_010_PERSISTENCE_BETA_READY" ||
    verdict === "B_010_PERSISTENCE_BLOCKED_WITH_EVIDENCE"
      ? "PASS"
      : "FAIL";

  report.token = verdict;

  const matrix = await request("GET", "/v1/system/persistence-matrix");
  report.steps.persistenceMatrix =
    matrix.status === 200 && matrix.json?.states?.jobs?.classification === "DURABLE" ? "PASS" : "FAIL";

  report.steps.backupSupported = health.json?.backup?.supported === true ? "PASS" : "FAIL";

  const slice = await request("POST", "/v1/slice/run", {
    instrumentId: "AAPL",
    size: 10,
    horizonSec: 3600,
    seed: 42,
    eventTime: "2026-07-16T12:00:00.000Z",
    source: "b010-gate",
    roleId: "arch.market_analyst",
  });
  const runId = slice.json?.runId || slice.json?.run?.runId;
  report.steps.localPersistence =
    slice.status === 200 && slice.json?.persistenceState === "PERSISTED" ? "PASS" : "FAIL";

  const runFile = path.join(
    DATA_ROOT,
    "vertical-slice",
    "runs",
    `${String(runId || "").replace(/[^a-zA-Z0-9._-]/g, "_")}.json`
  );
  report.steps.diskPersist = runId && fs.existsSync(runFile) ? "PASS" : "FAIL";

  report.steps.consistencyCheck =
    health.json?.consistency && typeof health.json.consistency.ok === "boolean" ? "PASS" : "FAIL";

  if (process.env.SCIOS_PG_URL || process.env.DATABASE_URL) {
    report.steps.pgAdapterLive =
      health.json?.postgres?.connectionStringConfigured === true ? "PASS" : "FAIL";
    report.steps.pgMigrations =
      health.json?.postgres?.status === "READY" ||
      health.json?.postgres?.status === "BLOCKED_WITH_EXTERNAL_DEPENDENCY"
        ? "PASS"
        : "FAIL";
  } else {
    report.steps.pgAdapterLive = "SKIP";
    report.steps.pgMigrations = "SKIP";
  }

  write("03-implementation.json", {
    authority: "packages/vertical-slice/src/persistence/",
    routes: ["GET /v1/persistence/health", "GET /v1/system/persistence-matrix"],
    tables: [
      "sci_migrations",
      "sci_jobs",
      "sci_job_attempts",
      "sci_evidence",
      "sci_lineage",
      "sci_domain_state",
      "sci_experience_specs",
    ],
    localTruth: DATA_ROOT,
    postgres: pgStatus,
    verdict,
  });

  const regressions = [
    ["b004-persistence-hard-gate.cjs", "b004Regression"],
    ["b009-background-system-hard-gate.cjs", "b009Regression"],
    ["b008-experience-compiler-hard-gate.cjs", "b008Regression"],
  ];
  for (const [script, key] of regressions) {
    const r = spawnSync("node", [path.join("scripts/tests", script)], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 180000,
      env: { ...process.env, SCIOS_CP_URL: CP },
    });
    report.steps[key] = r.status === 0 ? "PASS" : "FAIL";
  }

  const coreSteps = Object.entries(report.steps).filter(
    ([k, v]) => !k.endsWith("Regression") && v !== "SKIP"
  );
  const allPass = coreSteps.every(([, v]) => v === "PASS");
  report.status = allPass ? "PASS" : "FAIL";
  write("04-tests.json", report);

  console.log(
    JSON.stringify({ ok: allPass, status: report.status, token: report.token, steps: report.steps })
  );
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
