#!/usr/bin/env node
"use strict";
/**
 * Wave B-005 CF28 validation hard gate.
 * ALPHA_NON_PRODUCTION
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-005");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
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
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode || 0, json });
        });
      }
    );
    req.on("error", () => resolve({ status: 0, json: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, json: null });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const report = {
    schema: "sci-os-b005-cf28-hard-gate/v1",
    at: new Date().toISOString(),
    cp: CP,
    steps: {},
    status: "FAIL",
  };

  const modUrl = pathToFileURL(
    path.join(ROOT, "packages/model-registry/src/validation.ts")
  ).href.replace(/\.ts$/, ".js");
  let unit = null;
  try {
    unit = await import(
      pathToFileURL(path.join(ROOT, "packages/model-registry/dist/validation.js")).href
    );
  } catch {
    unit = await import(
      pathToFileURL(path.join(ROOT, "packages/model-registry/src/validation.ts")).href
    );
  }

  const def = unit.defaultValidationRecord("unit-test-model");
  report.steps.defaultNotValidated = def.state === "NOT_VALIDATED" ? "PASS" : "FAIL";

  const badValidated = unit.applyValidationEvidence(
    "unit-bad-validated",
    unit.createValidationEvidence("unit-bad-validated", "validation_pass", {
      outcome: "VALIDATED",
      summary: "test",
    })
  );
  report.steps.validatedWithEvidence = badValidated.error === null ? "PASS" : "FAIL";

  const noEvidence = unit.assertValidationTruth({
    ...def,
    state: "VALIDATED",
    evidence: [],
    productionEligible: true,
  });
  report.steps.missingEvidenceInvariant = noEvidence.ok === false ? "PASS" : "FAIL";

  const failedEv = unit.applyValidationEvidence(
    "unit-failed",
    unit.createValidationEvidence("unit-failed", "validation_fail", {
      outcome: "FAILED",
      summary: "fail proof",
    })
  );
  report.steps.failedWithEvidence = failedEv.record?.state === "FAILED" ? "PASS" : "FAIL";

  const unknownRec = unit.applyValidationEvidence(
    "unit-unknown",
    unit.createValidationEvidence("unit-unknown", "validation_unknown", {
      outcome: "UNKNOWN",
      summary: "unknown proof",
    })
  );
  report.steps.unknownState = unknownRec.record?.state === "UNKNOWN" ? "PASS" : "FAIL";

  const ui = unit.uiValidationTruth(def);
  report.steps.uiTruthNotValidated =
    ui.displayState === "NOT_VALIDATED" && ui.honest === true ? "PASS" : "FAIL";

  const list = await request("GET", "/v1/models/validation");
  report.steps.validationListRoute =
    list.status === 200 && list.json?.schema === "sci-os-model-validation-registry/v1"
      ? "PASS"
      : "FAIL";

  const one = await request("GET", "/v1/models/baseline-logistic/validation");
  report.steps.validationGetRoute =
    one.status === 200 && one.json?.record?.state === "NOT_VALIDATED" ? "PASS" : "FAIL";

  const models = await request("GET", "/v1/models");
  report.steps.modelsHonesty =
    models.status === 200 &&
    models.json?.models?.some((m) => m.validationStatus === "NOT_VALIDATED")
      ? "PASS"
      : "FAIL";

  const invalid = await request("POST", "/v1/models/baseline-logistic/validation/evidence", {
    kind: "validation_pass",
    outcome: "NOT_A_STATE",
    summary: "invalid",
  });
  report.steps.invalidStateRejected = invalid.status === 400 ? "PASS" : "FAIL";

  write("03-cf28-implementation-proof.json", {
    authority: "packages/model-registry/src/validation.ts",
    routes: [
      "GET /v1/models/validation",
      "GET /v1/models/:id/validation",
      "POST /v1/models/:id/validation/evidence",
    ],
    states: unit.VALIDATION_STATES,
  });

  const allPass = Object.values(report.steps).every((s) => s === "PASS");
  report.status = allPass ? "PASS" : "FAIL";
  write("04-cf28-tests.json", report);

  console.log(JSON.stringify({ ok: allPass, status: report.status, steps: report.steps }));
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
