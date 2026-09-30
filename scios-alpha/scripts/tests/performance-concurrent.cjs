#!/usr/bin/env node
"use strict";
/**
 * Concurrent API throughput measurement for the installed product surface.
 *
 * Completes the remaining measurable slice of GAP-PERF-UNMEASURED:
 * sequential baselines already exist; this probe issues overlapping HTTP
 * requests against the same loopback endpoints and records completed-request
 * rate, error count, and latency under concurrency. No performance target is
 * asserted — founder budgets have not been declared.
 *
 * postgresLatency remains OPTIONAL_PROVIDER_UNAVAILABLE without DATABASE_URL.
 * UI frame rate / large-graph render remain UNKNOWN without a renderer harness.
 *
 * Evidence: diagnostics-export/final-completion/performance-concurrent.json
 */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "final-completion", "performance-concurrent.json");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const COCKPIT = process.env.SCIOS_SHELL_URL || "http://127.0.0.1:4000";

const CONCURRENCY = Number(process.env.SCIOS_PERF_CONCURRENCY || 8);
const REQUESTS = Number(process.env.SCIOS_PERF_CONCURRENT_REQUESTS || 80);
const HANG_MS = Number(process.env.SCIOS_PERF_HANG_MS || 5000);

const TARGETS = [
  { id: "cp.healthz", url: CP + "/healthz" },
  { id: "cp.home", url: CP + "/v1/home" },
  { id: "cp.search", url: CP + "/v1/search?q=AAPL" },
  { id: "cp.productContext", url: CP + "/v1/product/context?objectId=AAPL&sessionId=default" },
  { id: "shell.root", url: COCKPIT + "/" },
];

function request(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const t0 = process.hrtime.bigint();
    const req = http.get(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout: HANG_MS * 2 },
      (res) => {
        res.resume();
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            ms: Number(process.hrtime.bigint() - t0) / 1e6,
          });
        });
      }
    );
    req.on("error", () =>
      resolve({ status: 0, ms: Number(process.hrtime.bigint() - t0) / 1e6 })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, ms: Number(process.hrtime.bigint() - t0) / 1e6 });
    });
  });
}

const round = (n) => Math.round(n * 1000) / 1000;

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function measureConcurrent(target) {
  const inFlight = new Set();
  const samples = [];
  let launched = 0;
  const wall0 = process.hrtime.bigint();

  function launch() {
    if (launched >= REQUESTS) return;
    launched += 1;
    const p = request(target.url).then((r) => {
      inFlight.delete(p);
      samples.push(r);
      if (launched < REQUESTS) launch();
    });
    inFlight.add(p);
  }

  for (let i = 0; i < Math.min(CONCURRENCY, REQUESTS); i++) launch();
  while (inFlight.size) await Promise.race(inFlight);
  const wallMs = Number(process.hrtime.bigint() - wall0) / 1e6;

  const latencies = samples.map((s) => s.ms).sort((a, b) => a - b);
  const statuses = samples.map((s) => s.status);
  const errors = samples.filter((s) => s.status === 0 || s.status >= 500).length;
  const ok = samples.filter((s) => s.status > 0 && s.status < 500).length;
  const hang = percentile(latencies, 95) > HANG_MS;

  return {
    id: target.id,
    status: errors ? "FAIL" : hang ? "FAIL" : "MEASURED",
    reason: errors ? "concurrent_error_or_unreachable" : hang ? "latency_implies_hang" : null,
    concurrency: CONCURRENCY,
    requests: samples.length,
    ok,
    errors,
    wallMs: round(wallMs),
    throughputRps: wallMs > 0 ? round((samples.length / wallMs) * 1000) : null,
    p50Ms: round(percentile(latencies, 50)),
    p95Ms: round(percentile(latencies, 95)),
    p99Ms: round(percentile(latencies, 99)),
    maxMs: round(latencies[latencies.length - 1]),
    statuses: [...new Set(statuses)],
  };
}

async function main() {
  const report = {
    schema: "sci-os-performance-concurrent/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    note: "Measured concurrent loopback HTTP. No performance target is asserted.",
    method: {
      concurrency: CONCURRENCY,
      requestsPerTarget: REQUESTS,
      timer: "process.hrtime.bigint",
      transport: "loopback HTTP",
    },
    environment: {
      node: process.version,
      platform: `${os.platform()} ${os.release()}`,
      cpu: os.cpus()[0]?.model ?? "UNKNOWN",
      cpuCount: os.cpus().length,
      totalMemBytes: os.totalmem(),
    },
    buildId: "UNKNOWN",
    targets: [],
    stillUnmeasured: [
      { id: "ui.frameRate", reason: "no instrumented renderer harness", state: "UNKNOWN" },
      { id: "ui.largeGraphRender", reason: "no dataset fixture at scale", state: "UNKNOWN" },
      {
        id: "persistence.postgresLatency",
        reason: "no PostgreSQL instance",
        state: "OPTIONAL_PROVIDER_UNAVAILABLE",
      },
    ],
    status: "UNKNOWN",
  };

  try {
    report.buildId = JSON.parse(
      fs.readFileSync(path.join(INSTALL, "manifests/build-identity.json"), "utf8")
    ).buildId;
  } catch {
    /* optional */
  }

  const alive = await request(CP + "/healthz");
  if (alive.status !== 200) {
    report.status = "UNKNOWN";
    report.reason = "control_plane_unreachable";
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ ok: false, token: "PERFORMANCE_CONCURRENT_UNKNOWN", reason: report.reason }));
    process.exit(1);
  }

  for (const t of TARGETS) report.targets.push(await measureConcurrent(t));

  const failed = report.targets.filter((t) => t.status === "FAIL");
  report.status = failed.length ? "FAIL" : "MEASURED";
  report.token = failed.length ? "PERFORMANCE_CONCURRENT_FAIL" : "PERFORMANCE_CONCURRENT_MEASURED";
  report.summary = {
    measuredTargets: report.targets.filter((t) => t.status === "MEASURED").length,
    failedTargets: failed.map((t) => ({ id: t.id, reason: t.reason })),
    minThroughputRps: Math.min(...report.targets.map((t) => t.throughputRps || 0)),
    maxP95Ms: Math.max(...report.targets.map((t) => t.p95Ms || 0)),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      ok: report.status !== "FAIL",
      token: report.token,
      buildId: report.buildId,
      measured: report.targets.map((t) => ({
        id: t.id,
        rps: t.throughputRps,
        p95: t.p95Ms,
        errors: t.errors,
      })),
      failed: report.summary.failedTargets,
    })
  );
  process.exit(report.status === "FAIL" ? 1 : 0);
}

main();
