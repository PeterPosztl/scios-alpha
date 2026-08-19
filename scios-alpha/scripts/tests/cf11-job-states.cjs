#!/usr/bin/env node
"use strict";
/**
 * CF11 job-state contract — targeted Wave B-002 gate.
 * ALPHA_NON_PRODUCTION
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2));
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
        timeout: 12000,
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

async function main() {
  const proof = {
    schema: "sci-os-cf11-job-states-proof/v1",
    at: new Date().toISOString(),
    cp: CP,
    steps: {},
    status: "FAIL",
  };

  const key = "cf11-test-" + Date.now();
  const created = await request("POST", "/v1/os/jobs", {
    title: "CF11 proof job",
    type: "analysis",
    objectId: "AAPL",
    idempotencyKey: key,
  });
  proof.steps.create = created.status === 201 ? "PASS" : "FAIL";
  const jobId = created.json?.job?.jobId;
  assert.ok(jobId, "jobId required");

  const dup = await request("POST", "/v1/os/jobs", {
    title: "CF11 proof job",
    idempotencyKey: key,
  });
  proof.steps.idempotency =
    dup.status === 201 && dup.json?.job?.jobId === jobId ? "PASS" : "FAIL";

  const run = await request("PATCH", `/v1/os/jobs/${jobId}`, {
    state: "RUNNING",
    progress: 10,
    reason: "cf11-proof-start",
  });
  proof.steps.running = run.status === 200 && run.json?.job?.state === "RUNNING" ? "PASS" : "FAIL";

  const bad = await request("PATCH", `/v1/os/jobs/${jobId}`, { state: "QUEUED" });
  proof.steps.invalidTransition = bad.status === 409 ? "PASS" : "FAIL";

  const done = await request("PATCH", `/v1/os/jobs/${jobId}`, {
    state: "COMPLETED",
    progress: 100,
    result: { note: "cf11-proof" },
  });
  proof.steps.completed =
    done.status === 200 && done.json?.job?.state === "COMPLETED" ? "PASS" : "FAIL";

  const legacy = await request("POST", "/v1/os/jobs", {
    title: "Legacy COMPLETE alias",
    idempotencyKey: "legacy-" + Date.now(),
  });
  const lid = legacy.json?.job?.jobId;
  const legacyPatch = await request("PATCH", `/v1/os/jobs/${lid}`, { state: "COMPLETE" });
  proof.steps.legacyCompleteAlias =
    legacyPatch.status === 200 && legacyPatch.json?.job?.state === "COMPLETED"
      ? "PASS"
      : "FAIL";

  const got = await request("GET", `/v1/os/jobs/${jobId}`);
  proof.steps.getJob =
    got.status === 200 &&
    got.json?.job?.jobId === jobId &&
    Array.isArray(got.json?.job?.evidenceRefs) &&
    got.json.job.evidenceRefs.length >= 2
      ? "PASS"
      : "FAIL";

  const list = await request("GET", "/v1/os/jobs");
  proof.steps.list =
    list.status === 200 && Array.isArray(list.json?.states) && list.json.states.includes("QUEUED")
      ? "PASS"
      : "FAIL";

  const allPass = Object.values(proof.steps).every((s) => s === "PASS");
  proof.status = allPass ? "PASS" : "FAIL";
  write("cf11-job-states-proof.json", proof);

  console.log(JSON.stringify({ ok: allPass, status: proof.status, steps: proof.steps }));
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
