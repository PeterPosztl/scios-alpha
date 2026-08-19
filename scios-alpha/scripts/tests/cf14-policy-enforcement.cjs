#!/usr/bin/env node
"use strict";
/**
 * CF14 policy-decision + enforcement — Wave B-003 targeted gate.
 * ALPHA_NON_PRODUCTION
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

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
    schema: "sci-os-cf14-policy-proof/v1",
    at: new Date().toISOString(),
    cp: CP,
    steps: {},
    status: "FAIL",
  };

  const can = await request(
    "GET",
    "/v1/governance/can?roleId=arch.market_analyst&action=execution:submit"
  );
  proof.steps.canEnvelope =
    can.status === 200 &&
    can.json?.policy?.schema === "sci-os-policy-evaluation/v1" &&
    Array.isArray(can.json?.denyReasons) &&
    can.json.policy.policyVersion
      ? "PASS"
      : "FAIL";

  const deny = await request("POST", "/v1/governance/evaluate", {
    actionId: "live_execution",
    roleId: "arch.market_analyst",
    executionMode: "SIMULATION_ONLY",
  });
  proof.steps.simulationDeny =
    deny.status === 200 &&
    deny.json?.policy?.decision === "DENY" &&
    deny.json.policy.denyReasons?.includes("simulation_only_mode")
      ? "PASS"
      : "FAIL";

  proof.steps.denyReason =
    deny.json?.policy?.denyReasons?.length > 0 ? "PASS" : "FAIL";

  proof.steps.policyEvidence =
    Array.isArray(deny.json?.policy?.evidenceRefs) &&
    deny.json.policy.evidenceRefs[0]?.policyVersion
      ? "PASS"
      : "FAIL";

  const bypass = await request("POST", "/v1/governance/evaluate", {
    actionId: "live_execution",
    roleId: "arch.market_analyst",
    decision: "ALLOW",
    attemptBypass: true,
  });
  proof.steps.bypassBlocked =
    bypass.status === 200 &&
    bypass.json?.policy?.blocked === true &&
    bypass.json.policy.bypassAttempted === true
      ? "PASS"
      : "FAIL";

  const allow = await request("POST", "/v1/governance/evaluate", {
    actionId: "read_features",
    roleId: "arch.market_analyst",
    executionMode: "SIMULATION_ONLY",
  });
  proof.steps.readAllow =
    allow.status === 200 && allow.json?.policy?.decision === "ALLOW" ? "PASS" : "FAIL";

  const allPass = Object.values(proof.steps).every((s) => s === "PASS");
  proof.status = allPass ? "PASS" : "FAIL";
  write("cf14-policy-proof.json", proof);

  console.log(JSON.stringify({ ok: allPass, status: proof.status, steps: proof.steps }));
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
