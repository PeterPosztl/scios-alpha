#!/usr/bin/env node
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(
  __dirname,
  "../../diagnostics-export/autonomous-marathon/performance-probe.json"
);

function timed(pathname) {
  return new Promise((resolve) => {
    const start = Date.now();
    const u = new URL(pathname, CP);
    const req = http.get(u, { timeout: 8000 }, (res) => {
      res.resume();
      res.on("end", () =>
        resolve({ path: pathname, status: res.statusCode || 0, ms: Date.now() - start })
      );
    });
    req.on("error", (e) =>
      resolve({ path: pathname, status: 0, ms: Date.now() - start, error: e.message })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ path: pathname, status: 0, ms: Date.now() - start, error: "timeout" });
    });
  });
}

(async () => {
  const steps = [];
  for (const p of ["/readyz", "/v1/home", "/v1/search?q=AAPL", "/v1/entities/AAPL"]) {
    steps.push(await timed(p));
  }
  const gwStart = Date.now();
  const gw = await new Promise((resolve) => {
    const body = JSON.stringify({
      instrumentId: "AAPL",
      horizonSec: 3600,
      size: 10,
    });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/vertical-slice/run",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            path: "POST /api/vertical-slice/run",
            status: res.statusCode || 0,
            ms: Date.now() - gwStart,
          })
        );
      }
    );
    req.on("error", (e) =>
      resolve({
        path: "POST /api/vertical-slice/run",
        status: 0,
        ms: Date.now() - gwStart,
        error: e.message,
      })
    );
    req.end(body);
  });
  steps.push(gw);
  const report = {
    schema: "sci-os-performance-probe/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    cp: CP,
    status: "MEASURED",
    note: "MEASURED != PASS SLO. First-release has no contracted latency SLO.",
    steps,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})();
