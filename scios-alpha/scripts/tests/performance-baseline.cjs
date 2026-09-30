#!/usr/bin/env node
"use strict";
/**
 * Performance baseline for the installed product surface.
 *
 * Replaces single-sample millisecond timings (the two existing probes each took
 * one sample with Date.now() and wrote to the same output file, so one
 * overwrote the other) with warmed, repeated, high-resolution measurement and
 * reported percentiles.
 *
 * No performance target is asserted: budgets for this product have not been
 * declared, and inventing one would fabricate a requirement. The only failure
 * conditions are conditions that indicate malfunction rather than slowness —
 * unreachable surface, a server error, or a latency so large it implies a hang.
 * UI frame rate, large-graph render latency and concurrent throughput remain
 * unmeasured and are reported as such rather than estimated.
 *
 * Evidence: diagnostics-export/final-completion/performance-baseline.json
 */
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "final-completion", "performance-baseline.json");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const COCKPIT = process.env.SCIOS_SHELL_URL || "http://127.0.0.1:4000";

const SAMPLES = Number(process.env.SCIOS_PERF_SAMPLES || 30);
const WARMUP = Number(process.env.SCIOS_PERF_WARMUP || 5);
/** Loopback latency above this implies a hang, not slowness. */
const HANG_MS = Number(process.env.SCIOS_PERF_HANG_MS || 5000);

const TARGETS = [
  { id: "cp.healthz", method: "GET", url: CP + "/healthz" },
  { id: "cp.startupReadiness", method: "GET", url: CP + "/v1/system/startup-readiness" },
  { id: "cp.home", method: "GET", url: CP + "/v1/home" },
  { id: "cp.search", method: "GET", url: CP + "/v1/search?q=AAPL" },
  { id: "cp.entity", method: "GET", url: CP + "/v1/entities/AAPL" },
  { id: "cp.jobsHealth", method: "GET", url: CP + "/v1/jobs/health" },
  { id: "cp.engineInfra", method: "GET", url: CP + "/v1/ecl/engine/infra" },
  { id: "shell.root", method: "GET", url: COCKPIT + "/" },
];

function request(method, url, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const t0 = process.hrtime.bigint();
    const req = http.request(
      {
        method,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        timeout: HANG_MS * 2,
        headers: payload
          ? { "content-type": "application/json", "content-length": payload.length }
          : undefined,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const ms = Number(process.hrtime.bigint() - t0) / 1e6;
          resolve({ status: res.statusCode || 0, ms, bytes: Buffer.concat(chunks).length });
        });
      }
    );
    req.on("error", () => resolve({ status: 0, ms: Number(process.hrtime.bigint() - t0) / 1e6, bytes: 0 }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, ms: Number(process.hrtime.bigint() - t0) / 1e6, bytes: 0 });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

const round = (n) => Math.round(n * 1000) / 1000;

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    n: samples.length,
    minMs: round(sorted[0]),
    p50Ms: round(percentile(sorted, 50)),
    p95Ms: round(percentile(sorted, 95)),
    p99Ms: round(percentile(sorted, 99)),
    maxMs: round(sorted[sorted.length - 1]),
    meanMs: round(mean),
  };
}

async function measure(target) {
  for (let i = 0; i < WARMUP; i++) await request(target.method, target.url, target.body);

  const samples = [];
  const statuses = new Set();
  for (let i = 0; i < SAMPLES; i++) {
    const r = await request(target.method, target.url, target.body);
    statuses.add(r.status);
    samples.push(r.ms);
  }

  const codes = [...statuses];
  const reachable = codes.some((c) => c > 0);
  const serverError = codes.some((c) => c >= 500);
  const notFound = codes.every((c) => c === 404);

  if (!reachable) {
    return { id: target.id, status: "UNKNOWN", reason: "unreachable", statuses: codes };
  }
  if (notFound) {
    // An endpoint that does not exist is recorded honestly, not measured.
    return { id: target.id, status: "ABSENT", reason: "endpoint_not_found", statuses: codes };
  }

  const stats = summarize(samples);
  const hang = stats.p95Ms > HANG_MS;
  return {
    id: target.id,
    status: serverError ? "FAIL" : hang ? "FAIL" : "MEASURED",
    reason: serverError ? "server_error" : hang ? "latency_implies_hang" : null,
    statuses: codes,
    ...stats,
  };
}

async function main() {
  const report = {
    schema: "sci-os-performance-baseline/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    note: "Measured values only. No performance target is asserted because none is declared for this product.",
    failureConditions: ["unreachable product surface", "HTTP 5xx", `p95 > ${HANG_MS}ms (implies hang)`],
    method: {
      samplesPerTarget: SAMPLES,
      warmupPerTarget: WARMUP,
      timer: "process.hrtime.bigint",
      concurrency: 1,
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
    unmeasured: [
      { id: "ui.frameRate", reason: "no instrumented renderer harness", state: "UNKNOWN" },
      { id: "ui.largeGraphRender", reason: "no dataset fixture at scale", state: "UNKNOWN" },
      { id: "api.concurrentThroughput", reason: "single-connection probe only", state: "UNKNOWN" },
      { id: "persistence.postgresLatency", reason: "no PostgreSQL instance", state: "OPTIONAL_PROVIDER_UNAVAILABLE" },
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

  const alive = await request("GET", CP + "/healthz");
  if (alive.status !== 200) {
    report.status = "UNKNOWN";
    report.reason = "control_plane_unreachable";
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ ok: false, token: "PERFORMANCE_BASELINE_UNKNOWN", reason: report.reason }));
    process.exit(1);
  }

  for (const t of TARGETS) report.targets.push(await measure(t));

  const failed = report.targets.filter((t) => t.status === "FAIL");
  const measured = report.targets.filter((t) => t.status === "MEASURED");
  report.status = failed.length ? "FAIL" : "MEASURED";
  report.token = failed.length ? "PERFORMANCE_BASELINE_FAIL" : "PERFORMANCE_BASELINE_MEASURED";
  report.summary = {
    measuredTargets: measured.length,
    failedTargets: failed.map((t) => ({ id: t.id, reason: t.reason })),
    absentTargets: report.targets.filter((t) => t.status === "ABSENT").map((t) => t.id),
    unknownTargets: report.targets.filter((t) => t.status === "UNKNOWN").map((t) => t.id),
    slowestP95: measured.length
      ? measured.reduce((a, b) => (b.p95Ms > a.p95Ms ? b : a))
      : null,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

  console.log(
    JSON.stringify({
      ok: report.status !== "FAIL",
      token: report.token,
      buildId: report.buildId,
      measured: measured.map((t) => ({ id: t.id, p50: t.p50Ms, p95: t.p95Ms })),
      absent: report.summary.absentTargets,
      failed: report.summary.failedTargets,
    })
  );
  process.exit(report.status === "FAIL" ? 1 : 0);
}

main();
