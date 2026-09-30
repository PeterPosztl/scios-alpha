#!/usr/bin/env node
"use strict";

/**
 * scripts/smoke-vertical-slice.js
 * Smoke: health → POST /api/vertical-slice/run → runId + lineage check.
 * Default BASE=http://127.0.0.1:3000 (canonical Control Plane). Override SMOKE_BASE for mock-api :5230.
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");

const ROOT = process.cwd();
const BASE = (process.env.SMOKE_BASE || "http://127.0.0.1:3000").replace(
  /\/$/,
  ""
);

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath.startsWith("http") ? urlPath : `${BASE}${urlPath}`);
    const lib = u.protocol === "https:" ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: {
          Accept: "application/json",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
        timeout: 30_000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {
            /* text */
          }
          resolve({ status: res.statusCode ?? 0, body: parsed, raw });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function fail(msg, code = 2) {
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(code);
}

(async () => {
  console.log("Running smoke test: vertical slice");
  console.log(`BASE=${BASE}`);

  // 1. Health
  const health = await request("GET", "/api/system/health");
  if (health.status !== 200) {
    fail(`health HTTP ${health.status}`);
  }
  console.log("Health:");
  console.log(JSON.stringify(health.body, null, 2));

  // 2. Vertical slice
  const run = await request("POST", "/api/vertical-slice/run", {
    instrumentId: "AAPL",
    horizonSec: 3600,
    size: 10,
  });
  console.log("Run response:");
  console.log(JSON.stringify(run.body, null, 2));
  if (run.status !== 200) {
    fail(`slice/run HTTP ${run.status}`);
  }

  const runId = run.body?.runId;
  if (!runId || runId === "null") {
    fail("No runId returned; smoke test failed");
  }
  console.log(`RunId: ${runId}`);

  // 3. Lineage
  const lineage = run.body?.lineage;
  if (!lineage || !Array.isArray(lineage.nodes) || lineage.nodes.length === 0) {
    fail("Lineage missing or empty");
  }
  console.log(
    `Lineage: id=${lineage.lineageId || "n/a"} nodes=${lineage.nodes.length} edges=${(lineage.edges || []).length}`
  );

  // 4. Readiness proof (optional file)
  const signoffPath = path.join(ROOT, "diagnostics-export", "p0-startup-signoff.json");
  let signoff = null;
  if (fs.existsSync(signoffPath)) {
    signoff = JSON.parse(fs.readFileSync(signoffPath, "utf8"));
    console.log("Signoff:");
    console.log(JSON.stringify(signoff, null, 2));
  } else {
    console.log("Signoff file absent (optional) — diagnostics-export/p0-startup-signoff.json");
  }

  const evidence = {
    at: new Date().toISOString(),
    ok: true,
    base: BASE,
    runId,
    status: run.body?.status ?? null,
    lineageNodes: lineage.nodes.length,
    health: health.body,
    signoffVerdict: signoff?.verdict ?? null,
    label: "ALPHA_NON_PRODUCTION",
  };
  const outDir = path.join(ROOT, "diagnostics-export");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "smoke-vertical-slice.json"),
    JSON.stringify(evidence, null, 2)
  );

  console.log("Smoke test passed (basic).");
  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        evidence: "diagnostics-export/smoke-vertical-slice.json",
      },
      null,
      2
    )
  );
})().catch((e) => {
  fail(e instanceof Error ? e.message : String(e), 1);
});
