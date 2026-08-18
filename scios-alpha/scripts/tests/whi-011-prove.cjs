#!/usr/bin/env node
"use strict";

/**
 * WHI-011 installed/package evidence assembler. ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "windows-host-v1", "host-digital-twin");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const BASELINE = "pkg_1787080434560";

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function httpReq(method, url, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const payload = body != null ? Buffer.from(JSON.stringify(body), "utf8") : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        timeout: 15000,
        headers: payload ? { "content-type": "application/json", "content-length": payload.length } : {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let parsed = null;
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode || 0, body: parsed });
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
  const dist = path.join(ROOT, "dist", "SCI-OS-X10");
  const files = [
    "installer/scripts/host/digital-twin.cjs",
    "installer/scripts/host/job-object-provider.cjs",
    "installer/scripts/startup/process-supervisor.cjs",
    "installer/scripts/startup/desired-state.cjs",
  ];
  const pkgCheck = files.map((rel) => ({ rel, exists: fs.existsSync(path.join(dist, rel)) }));
  const identity = fs.existsSync(path.join(dist, "manifests", "build-identity.json"))
    ? readJson(path.join(dist, "manifests", "build-identity.json"))
    : null;
  write("13-package-proof.json", {
    schema: "sci-os-whi-011-package/v1",
    files: pkgCheck,
    allPresent: pkgCheck.every((f) => f.exists),
    buildIdentity: identity,
    status: pkgCheck.every((f) => f.exists) ? "PASS" : "FAIL",
  });

  const instFiles = files.map((rel) => ({ rel, exists: fs.existsSync(path.join(INSTALL, rel)) }));
  const instId = fs.existsSync(path.join(INSTALL, "manifests", "build-identity.json"))
    ? readJson(path.join(INSTALL, "manifests", "build-identity.json"))
    : null;

  const twinPath = path.join(INSTALL, "diagnostics-export", "host", "digital-twin.json");
  const twin = fs.existsSync(twinPath) ? readJson(twinPath) : null;
  const gw1 = await httpReq("POST", "http://127.0.0.1:3000/api/vertical-slice/run", {
    instrumentId: "AAPL",
    horizonSec: 3600,
    size: 10,
    actor: "actor:arch.market_analyst",
    role: "arch.market_analyst",
    idempotencyKey: "whi011-gw1-" + Date.now(),
  });
  const home = await httpReq("GET", "http://127.0.0.1:3000/v1/home");
  write("14-installed-proof.json", {
    schema: "sci-os-whi-011-installed/v1",
    launchedVia: "SCI-OS-X10.exe",
    installedBuild: instId && instId.buildId,
    hostFiles: instFiles,
    twin,
    homeStatus: home.status,
    gw1: { status: gw1.status, runId: gw1.body && gw1.body.runId },
    jobAttached:
      twin &&
      twin.processes &&
      twin.processes["control-plane"] &&
      twin.processes["control-plane"].jobAttached &&
      twin.processes.cockpit &&
      twin.processes.cockpit.jobAttached,
    status:
      home.status === 200 && gw1.status === 200 && instFiles.every((f) => f.exists) ? "PASS" : "FAIL",
  });

  console.log(
    JSON.stringify(
      {
        package: identity && identity.buildId,
        installed: instId && instId.buildId,
        gw1: gw1.status,
        home: home.status,
        twinLifecycle: twin && twin.desired && twin.desired.lifecycle,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
