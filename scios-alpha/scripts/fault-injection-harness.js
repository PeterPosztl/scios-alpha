#!/usr/bin/env node
"use strict";

/**
 * scripts/fault-injection-harness.js
 * ALPHA fault injection — Redis stop/start, worker kill, port conflict.
 * Evidence: diagnostics-export/fault-injection-report.json
 *
 * Does NOT mutate business data. Uses docker when available.
 */
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const http = require("node:http");
const { spawnSync, execSync } = require("node:child_process");

const ROOT = process.cwd();
const HEALTH =
  process.env.FAULT_HEALTH_URL ||
  "http://127.0.0.1:5230/api/system/health";
const PORT_CONFLICT = Number(process.env.FAULT_PORT || 4000);
const report = {
  at: new Date().toISOString(),
  label: "ALPHA_NON_PRODUCTION",
  healthUrl: HEALTH,
  steps: [],
};

function log(msg) {
  console.log(msg);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    windowsHide: true,
    shell: opts.shell ?? false,
    timeout: opts.timeout ?? 30_000,
    ...opts,
  });
  return {
    status: r.status,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
    error: r.error ? String(r.error.message) : null,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function probeHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH, { timeout: 5000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body = raw;
        try {
          body = JSON.parse(raw);
        } catch {
          /* text */
        }
        resolve({ ok: (res.statusCode ?? 0) === 200, status: res.statusCode, body });
      });
    });
    req.on("error", (e) => resolve({ ok: false, status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, error: "timeout" });
    });
  });
}

function dockerRedisIds(all = false) {
  const args = ["ps"];
  if (all) args.push("-a");
  args.push("--filter", "name=redis", "--format", "{{.ID}}");
  const r = run("docker", args);
  if (r.status !== 0) return { ids: [], error: r.stderr || r.error || "docker failed" };
  const ids = r.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { ids, error: null };
}

async function step(name, fn) {
  log(`\n=== ${name} ===`);
  const started = new Date().toISOString();
  let result;
  try {
    result = await fn();
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const entry = { name, started, ...result };
  report.steps.push(entry);
  log(JSON.stringify(entry, null, 2));
  return entry;
}

async function occupyPort(port, ms) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (e) => resolve({ ok: false, error: e.message }));
    server.listen(port, "0.0.0.0", async () => {
      log(`Port ${port} occupied for ${ms}ms`);
      await sleep(ms);
      server.close(() => resolve({ ok: true, port, heldMs: ms }));
    });
  });
}

function killWorkerLike() {
  // Windows: match node processes with worker-ish command lines under scios-alpha
  if (process.platform === "win32") {
    const ps = `
Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -match 'scios-alpha' -and
    ($_.CommandLine -match 'worker' -or $_.CommandLine -match 'foundation-smoke' -or $_.CommandLine -match 'mock-api')
  } |
  Select-Object -ExpandProperty ProcessId
`;
    const r = run("powershell", ["-NoProfile", "-Command", ps]);
    const pids = (r.stdout || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s));
    const killed = [];
    for (const pid of pids) {
      const k = run("taskkill", ["/PID", pid, "/T", "/F"]);
      killed.push({ pid, status: k.status });
    }
    return { ok: true, platform: "win32", pids, killed };
  }
  const r = run("pkill", ["-f", "worker"]);
  return { ok: true, platform: process.platform, status: r.status, stderr: r.stderr };
}

(async () => {
  log("Fault injection harness starting...");
  report.preHealth = await probeHealth();

  await step("stop_redis", async () => {
    const { ids, error } = dockerRedisIds(false);
    if (error) return { ok: false, error, health: await probeHealth() };
    if (!ids.length) {
      return {
        ok: true,
        skipped: true,
        reason: "no running redis container (Docker may be stopped)",
        health: await probeHealth(),
      };
    }
    for (const id of ids) run("docker", ["stop", id]);
    await sleep(3000);
    return { ok: true, stopped: ids, health: await probeHealth() };
  });
  log("Redis stop step done; check system behavior.");

  await step("start_redis", async () => {
    const { ids, error } = dockerRedisIds(true);
    if (error) return { ok: false, error, health: await probeHealth() };
    if (!ids.length) {
      return {
        ok: true,
        skipped: true,
        reason: "no redis containers to start",
        health: await probeHealth(),
      };
    }
    for (const id of ids) run("docker", ["start", id]);
    await sleep(3000);
    return { ok: true, started: ids, health: await probeHealth() };
  });
  log("Redis restart step done.");

  await step("kill_worker", async () => {
    const kill = killWorkerLike();
    await sleep(3000);
    return { ...kill, health: await probeHealth() };
  });
  log("Worker kill step done; check recovery.");

  await step("port_conflict", async () => {
    const hold = await occupyPort(PORT_CONFLICT, 10_000);
    const health = await probeHealth();
    return { ...hold, health };
  });
  log("Port conflict test done.");

  report.postHealth = await probeHealth();
  report.finishedAt = new Date().toISOString();
  report.note =
    "ALPHA harness — review supervisor / meta-recovery; no fake PASS. Docker optional.";

  const outDir = path.join(ROOT, "diagnostics-export");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "fault-injection-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  log("\nFault injection finished. Review logs and supervisor behavior.");
  log(`Evidence: ${path.relative(ROOT, outPath).replace(/\\/g, "/")}`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        steps: report.steps.map((s) => s.name),
        preHealth: report.preHealth?.ok,
        postHealth: report.postHealth?.ok,
        report: "diagnostics-export/fault-injection-report.json",
      },
      null,
      2
    )
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
