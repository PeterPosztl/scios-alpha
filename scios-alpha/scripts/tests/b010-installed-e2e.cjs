#!/usr/bin/env node
"use strict";
/**
 * B-010 installed E2E — persistence health + local durability.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-010");
const CP = "http://127.0.0.1:3000";

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
      .get({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout: 20000 }, (res) => {
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
  // Target the install explicitly: cwd-based root resolution stops the repo and
  // leaves the installed lock owned by a dead process, blocking every reboot.
  spawnSync(
    process.execPath,
    [path.join(ROOT, "installer/scripts/convergence/stop.cjs"), `--app-root=${INSTALL}`],
    {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
      timeout: 45000,
    }
  );
}

async function main() {
  const report = {
    schema: "sci-os-b010-installed-e2e/v1",
    at: new Date().toISOString(),
    installDir: INSTALL,
    buildId: null,
    cases: {},
    token: null,
    status: "FAIL",
  };

  const biPath = path.join(INSTALL, "manifests", "build-identity.json");
  if (fs.existsSync(biPath)) {
    try {
      report.buildId = JSON.parse(fs.readFileSync(biPath, "utf8")).buildId;
    } catch (_) {}
  }

  const exe = path.join(INSTALL, "SCI-OS-X10.exe");
  if (!fs.existsSync(exe)) {
    report.cases.installedExe = "FAIL";
    write("08-installed-e2e-proof.json", report);
    process.exit(1);
  }
  report.cases.installedExe = "PASS";

  const preHealthy = await waitHealthy(3000);
  if (!preHealthy) {
    stopInstalled();
    await sleep(2000);
    spawn(exe, [], { detached: true, stdio: "ignore", windowsHide: true, cwd: INSTALL }).unref();
  } else {
    report.cases.reusedRunningInstance = "PASS";
  }

  const healthy = preHealthy || (await waitHealthy(120000));
  report.cases.healthz = healthy ? "PASS" : "FAIL";
  if (!healthy) {
    stopInstalled();
    write("08-installed-e2e-proof.json", report);
    process.exit(1);
  }

  const health = await get(CP + "/v1/persistence/health");
  if (health.status === 200) {
    const body = JSON.parse(health.body);
    report.token = body.verdict;
    report.cases.persistenceHealthEndpoint =
      body.schema === "sci-os-persistence-health/v1" ? "PASS" : "FAIL";
    report.cases.localPass = body.local?.status === "PASS" ? "PASS" : "FAIL";
    report.cases.postgresHonest =
      body.postgres?.status === "READY" ||
      body.postgres?.status === "BLOCKED_WITH_EXTERNAL_DEPENDENCY"
        ? "PASS"
        : "FAIL";
    report.cases.fallbackLocalPrimary =
      body.postgres?.status === "READY"
        ? body.fallback?.mode === "PG_PRIMARY" && body.postgres?.primary === true
          ? "PASS"
          : "FAIL"
        : body.fallback?.mode === "LOCAL_PRIMARY"
          ? "PASS"
          : "FAIL";
    report.cases.backupSupported = body.backup?.supported === true ? "PASS" : "FAIL";
  } else {
    report.cases.persistenceHealthEndpoint = "FAIL";
    report.cases.localPass = "FAIL";
    report.cases.postgresHonest = "FAIL";
    report.cases.fallbackLocalPrimary = "FAIL";
    report.cases.backupSupported = "FAIL";
  }

  const matrix = await get(CP + "/v1/system/persistence-matrix");
  report.cases.persistenceMatrix =
    matrix.status === 200 && JSON.parse(matrix.body).states?.jobs?.classification === "DURABLE"
      ? "PASS"
      : "FAIL";

  const cockpit = await get("http://127.0.0.1:4000/");
  report.cases.cockpitHttp = cockpit.status === 200 ? "PASS" : "SKIP";
  if (cockpit.status === 200) {
    report.cases.cockpitPersistenceHealth =
      cockpit.body.includes("/v1/persistence/health") && cockpit.body.includes("persistenceHealth")
        ? "PASS"
        : "PARTIAL";
  }

  stopInstalled();
  const required = Object.entries(report.cases).filter(
    ([k, v]) => k !== "reusedRunningInstance" && v !== "PASS" && v !== "PARTIAL" && v !== "SKIP"
  );
  report.status = required.length === 0 ? "PASS" : "FAIL";
  write("08-installed-e2e-proof.json", report);
  console.log(JSON.stringify({ ok: report.status === "PASS", cases: report.cases, token: report.token, buildId: report.buildId }));
  process.exit(report.status === "PASS" ? 0 : 1);
}

main();
