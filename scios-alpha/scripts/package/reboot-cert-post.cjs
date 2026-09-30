#!/usr/bin/env node
"use strict";

/**
 * Post-reboot certification — run with BUNDLED node from install root only.
 * Example:
 *   "%LOCALAPPDATA%\SCI OS X10\app\runtime\node\node.exe" installer\scripts\reboot-cert-post.cjs
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync, execSync } = require("child_process");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(dir, name, obj) {
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2) + "\n");
}

function httpGet(port, urlPath, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: urlPath, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = Buffer.concat(chunks).toString("utf8");
          try {
            body = JSON.parse(body);
          } catch {
            /* */
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

function httpPost(port, urlPath, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = Buffer.concat(chunks).toString("utf8");
          try {
            body = JSON.parse(body);
          } catch {
            /* */
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    req.write(payload);
    req.end();
  });
}

function listSciProcesses() {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'SCI OS X10|start-sci-os|control-plane-api|cockpit-ui|scios-alpha' } | Select-Object ProcessId,Name | ConvertTo-Json -Compress"`,
      { encoding: "utf8", timeout: 20000 }
    );
    if (!out.trim()) return [];
    const j = JSON.parse(out);
    return Array.isArray(j) ? j : [j];
  } catch {
    return [];
  }
}

async function main() {
  const root = process.env.SCIOS_APP_ROOT || path.resolve(__dirname, "../..");
  const out = path.join(root, "diagnostics-export", "reboot-certification");
  ensureDir(out);

  const bootTrace = {
    at: new Date().toISOString(),
    installRoot: root.replace(/\\/g, "/"),
    cwd: process.cwd().replace(/\\/g, "/"),
    execPath: process.execPath.replace(/\\/g, "/"),
    steps: [],
    failedAt: null,
  };
  const push = (id, ok, detail) => {
    bootTrace.steps.push({ id, ok, detail });
    if (!ok && !bootTrace.failedAt) bootTrace.failedAt = id;
  };

  const isBundled = /runtime[\\/]+node/i.test(process.execPath);
  push("BUNDLED_RUNTIME", isBundled, {
    execPath: process.execPath,
    version: process.version,
  });
  push(
    "INSTALL_ROOT",
    fs.existsSync(path.join(root, "runtime/node/node.exe")),
    { root }
  );
  push("CONFIG", fs.existsSync(path.join(root, "config/packaged.json")), {});

  const [hz, rz, ck, homePage, homeApi] = await Promise.all([
    httpGet(3000, "/healthz"),
    httpGet(3000, "/readyz"),
    httpGet(4000, "/healthz"),
    httpGet(4000, "/"),
    httpGet(3000, "/v1/home"),
  ]);
  push("BACKEND", hz.status === 200 && !!rz.body?.ready, {
    healthz: hz.status,
    ready: rz.body?.ready,
  });
  const smoke = await httpPost(3000, "/v1/foundation/worker-smoke", {});
  push("WORKER", smoke.status === 200, { status: smoke.status });
  const html = typeof homePage.body === "string" ? homePage.body : "";
  push("SHELL", ck.status === 200, { status: ck.status });
  push(
    "HOME_HANDOFF",
    ck.status === 200 && /What needs your attention|SCI OS/.test(html),
    { homeApi: homeApi.status }
  );
  push(
    "PRODUCT_KERNEL",
    homeApi.status === 200 && !!homeApi.body?.attention,
    { status: homeApi.status }
  );

  let startupReport = null;
  const reportPath = path.join(root, "diagnostics-export", "startup-report.json");
  if (fs.existsSync(reportPath)) {
    try {
      startupReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      push("SUPERVISOR", startupReport.verdict !== "NO_GO", {
        verdict: startupReport.verdict,
      });
      push("INFRASTRUCTURE", true, {
        note: "optional infra may be DEGRADED",
        docker: startupReport.docker?.status,
      });
    } catch {
      push("SUPERVISOR", false, { error: "startup-report unreadable" });
    }
  } else {
    push("SUPERVISOR", false, { error: "startup-report missing — launch SCI-OS-X10.cmd first" });
  }

  write(out, "post-reboot-boot-trace.json", bootTrace);
  write(out, "post-reboot-runtime-proof.json", {
    at: new Date().toISOString(),
    execPath: process.execPath.replace(/\\/g, "/"),
    version: process.version,
    bundled: isBundled,
    installRoot: root.replace(/\\/g, "/"),
    underDeveloperRepo: /scios-alpha/i.test(root),
    pass: isBundled && !/scios-alpha/i.test(root),
  });
  write(out, "post-reboot-service-proof.json", {
    at: new Date().toISOString(),
    backend: { healthz: hz.status, ready: rz.body?.ready },
    workerSmoke: { status: smoke.status },
    shell: { healthz: ck.status },
    home: {
      api: homeApi.status,
      htmlHome: /What needs your attention/.test(html),
    },
    startupReportVerdict: startupReport?.verdict || null,
  });

  const search = await httpGet(3000, "/v1/search?q=AAPL");
  const entity = await httpGet(3000, "/v1/entities/AAPL");
  const analyze = await httpPost(3000, "/api/vertical-slice/run", {
    instrumentId: "AAPL",
    horizonSec: 3600,
    size: 10,
  });
  const body = analyze.body || {};
  const gw1 = {
    at: new Date().toISOString(),
    pass:
      search.status === 200 &&
      entity.status === 200 &&
      analyze.status === 200 &&
      !!body.predictionEnvelope &&
      !!body.riskDecision &&
      !!body.governanceDecision &&
      !!body.executionOutcome &&
      !!body.lineage,
    steps: {
      search: search.status === 200,
      entity: entity.status === 200,
      prediction: !!body.predictionEnvelope,
      uncertainty: !!(body.predictionEnvelope?.uncertainty || body.predictionEnvelope?.predictionInterval || body.predictionEnvelope?.calibration),
      risk: !!body.riskDecision,
      governance: !!body.governanceDecision,
      simulation: !!body.executionOutcome,
      evidence: !!body.lineage,
      lineage: !!body.lineage,
    },
    runId: body.runId || null,
  };
  write(out, "post-reboot-gw1-proof.json", gw1);

  const stopScript = path.join(root, "installer/scripts/convergence/stop.cjs");
  let shutdown = { attempted: false, clean: false };
  if (fs.existsSync(stopScript)) {
    const r = spawnSync(process.execPath, [stopScript], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        SCIOS_APP_ROOT: root,
        SCIOS_PACKAGED: "1",
        SCIOS_RUNTIME_MODE: "PACKAGED",
      },
    });
    await new Promise((x) => setTimeout(x, 2500));
    const left = listSciProcesses();
    shutdown = {
      attempted: true,
      exitCode: r.status,
      remaining: left.length,
      clean: left.length === 0,
      remainingDetail: left,
    };
  }
  write(out, "post-reboot-shutdown-proof.json", {
    at: new Date().toISOString(),
    ...shutdown,
    statePersistHint: path
      .join(process.env.LOCALAPPDATA || "", "SCI OS X10", "data")
      .replace(/\\/g, "/"),
  });

  const underRepo = /scios-alpha/i.test(root);
  const coreOk = ["BUNDLED_RUNTIME", "INSTALL_ROOT", "BACKEND", "WORKER", "SHELL", "HOME_HANDOFF"]
    .every((id) => bootTrace.steps.find((s) => s.id === id)?.ok);
  let verdict = "FULL PRODUCT BOOT — READY";
  if (!coreOk || !gw1.pass || !shutdown.clean) {
    verdict = `POST-REBOOT INTERNAL BLOCKER — ${bootTrace.failedAt || "UNKNOWN"}`;
  } else if (underRepo) {
    verdict = "POST-REBOOT INTERNAL BLOCKER — INSTALL_ROOT";
  } else if (!isBundled) {
    verdict = "POST-REBOOT INTERNAL BLOCKER — BUNDLED_RUNTIME";
  }

  const final = {
    at: new Date().toISOString(),
    schema: "sci-os-final-reboot-certification/v1",
    label: "ALPHA_NON_PRODUCTION",
    verdict,
    earliestFailedTransition: bootTrace.failedAt,
    gw1Pass: gw1.pass,
    shutdownClean: shutdown.clean,
    runtime: {
      execPath: process.execPath.replace(/\\/g, "/"),
      bundled: isBundled,
      version: process.version,
    },
    installRoot: root.replace(/\\/g, "/"),
    rootCause:
      verdict === "FULL PRODUCT BOOT — READY"
        ? null
        : {
            class: bootTrace.failedAt || (underRepo ? "INSTALL_ROOT" : "UNKNOWN"),
            exactError: bootTrace.steps.find((s) => !s.ok)?.detail || null,
            evidence: out.replace(/\\/g, "/"),
            minimalFix: "Fix earliest failed transition only; do not invent architecture",
          },
  };
  write(out, "final-reboot-certification.json", final);
  console.log(JSON.stringify({ verdict, gw1: gw1.pass, out }, null, 2));
  process.exit(verdict === "FULL PRODUCT BOOT — READY" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
