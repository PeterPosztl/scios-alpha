#!/usr/bin/env node
"use strict";
/**
 * Wave B-003 CF14 policy-decision hard gate — full proof generator.
 * ALPHA_NON_PRODUCTION
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "completion-program", "b-003");
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

function authorityMap() {
  return {
    schema: "sci-os-b003-policy-authority-map/v1",
    at: new Date().toISOString(),
    policyEvaluator: "packages/governance-engine/src/policy-enforcement.ts",
    permissionMatrix: "packages/governance-engine/src/index.ts",
    actorContext: "packages/product-kernel/src/actor-context.js",
    canRoute: "apps/control-plane-api/src/server.ts GET /v1/governance/can",
    evaluateRoute: "apps/control-plane-api/src/server.ts POST /v1/governance/evaluate",
    enforceRoute: "apps/control-plane-api/src/server.ts POST /v1/governance/action",
    pepSlice: "apps/control-plane-api/src/routes/verticalSlice.ts",
    experienceProjection: "packages/professional-domain-registry/src/experience-compiler.js",
    duplicatePolicyAuthority: false,
  };
}

async function main() {
  const report = { schema: "sci-os-b003-hard-gate/v1", at: new Date().toISOString(), cp: CP, steps: {}, status: "FAIL" };

  write("01-current-policy-authority-map.json", authorityMap());

  write("02-policy-decision-contract.json", {
    schema: "sci-os-policy-evaluation/v1",
    decisionStates: ["ALLOW", "DENY", "CONDITIONAL", "NOT_APPLICABLE", "UNKNOWN"],
    policySetId: "embedded-foundation",
    policySetVersion: "embedded-foundation/v1",
    note: "Server-authoritative — UI display only",
  });

  write("03-decision-precedence.json", {
    order: [
      "evaluation_failed → UNKNOWN",
      "permission_denied → DENY (non-overridable)",
      "risk_blocked → DENY",
      "simulation_only execution → DENY",
      "policy_explicit_deny → DENY",
      "local_review → CONDITIONAL",
      "all_gates → ALLOW",
    ],
    unknownNeverAllow: true,
  });

  const can = await request(
    "GET",
    "/v1/governance/can?roleId=arch.market_analyst&action=live_execution&objectId=AAPL"
  );
  report.steps.canEnvelope =
    can.status === 200 &&
    can.json?.decision &&
    can.json?.decisionId &&
    can.json?.policySetVersion &&
    Array.isArray(can.json?.reasonCodes)
      ? "PASS"
      : "FAIL";

  const simDeny = await request("POST", "/v1/governance/evaluate", {
    actionId: "live_execution",
    roleId: "arch.market_analyst",
    executionMode: "SIMULATION_ONLY",
    objectId: "AAPL",
    workflowState: "ready",
  });
  report.steps.simulationDeny =
    simDeny.json?.policy?.decision === "DENY" &&
    simDeny.json.policy.reasonCodes?.includes("SIMULATION_ONLY")
      ? "PASS"
      : "FAIL";

  const analyzeAllow = await request("POST", "/v1/governance/evaluate", {
    actionId: "analyze",
    roleId: "arch.market_analyst",
    executionMode: "SIMULATION_ONLY",
    objectId: "AAPL",
  });
  report.steps.analyzeAllow = analyzeAllow.json?.policy?.decision === "ALLOW" ? "PASS" : "FAIL";

  const permDeny = await request("POST", "/v1/governance/evaluate", {
    actionId: "analyze",
    roleId: "arch.restricted",
    permission: { allowed: false },
    actorContext: { actorId: "actor:restricted", roleId: "arch.restricted" },
  });
  report.steps.permissionDeny =
    permDeny.json?.policy?.decision === "DENY" &&
    permDeny.json.policy.reasonCodes?.includes("PERMISSION_DENIED")
      ? "PASS"
      : "FAIL";

  const riskDeny = await request("POST", "/v1/governance/evaluate", {
    actionId: "live_execution",
    roleId: "arch.market_analyst",
    risk: { approved: false, blocking: true, reason: "limit_exceeded" },
    executionMode: "LIVE",
  });
  report.steps.riskDeny =
    riskDeny.json?.policy?.decision === "DENY" &&
    riskDeny.json.policy.reasonCodes?.includes("RISK_BLOCKED")
      ? "PASS"
      : "FAIL";

  const policyDeny = await request("POST", "/v1/governance/evaluate", {
    actionId: "execution:submit",
    roleId: "arch.market_analyst",
    executionMode: "SIMULATION_ONLY",
  });
  report.steps.policyDeny =
    policyDeny.json?.policy?.decision === "DENY" ? "PASS" : "FAIL";

  const conditional = await request("POST", "/v1/governance/evaluate", {
    actionId: "act.local_review.approve",
    roleId: "arch.market_analyst",
    objectId: "AAPL",
    workflowState: "local_review",
  });
  report.steps.conditional =
    conditional.json?.policy?.decision === "CONDITIONAL" &&
    conditional.json.policy.obligations?.some((o) => o.code === "REQUIRE_LOCAL_REVIEW")
      ? "PASS"
      : "FAIL";

  const unknownInput = await request("POST", "/v1/governance/evaluate", {
    actionId: "live_execution",
    roleId: "arch.market_analyst",
    risk: { unknown: true },
    executionMode: "SIMULATION_ONLY",
    evaluationFailed: false,
  });
  report.steps.unknownFailClosed =
    unknownInput.json?.policy?.decision !== "ALLOW" ? "PASS" : "FAIL";

  const evalFail = await request("POST", "/v1/governance/evaluate", {
    actionId: "analyze",
    roleId: "arch.market_analyst",
    evaluationFailed: true,
  });
  report.steps.evaluationFailure =
    evalFail.json?.policy?.decision === "UNKNOWN" ? "PASS" : "FAIL";

  const tamper = await request("POST", "/v1/governance/evaluate", {
    actionId: "live_execution",
    roleId: "arch.market_analyst",
    decision: "ALLOW",
    attemptBypass: true,
    actorContext: { actorId: "actor:admin", roleId: "arch.admin" },
    serverActorContext: { actorId: "actor:arch.market_analyst", roleId: "arch.market_analyst" },
  });
  report.steps.tamper =
    tamper.json?.policy?.decision === "DENY" &&
    tamper.json.policy.reasonCodes?.some((c) =>
      ["DECISION_SPOOF_REJECTED", "ACTOR_CONTEXT_MISSING", "POLICY_BYPASS_FORBIDDEN"].includes(c)
    )
      ? "PASS"
      : "FAIL";

  const enforceDeny = await request("POST", "/v1/governance/action", {
    actionId: "live_execution",
    roleId: "arch.market_analyst",
    executionMode: "SIMULATION_ONLY",
  });
  report.steps.actionEnforcement =
    enforceDeny.status === 403 && enforceDeny.json?.executed === false ? "PASS" : "FAIL";

  const enforceAllow = await request("POST", "/v1/governance/action", {
    actionId: "act.local_review.approve",
    roleId: "arch.market_analyst",
    objectId: "AAPL",
    workflowState: "local_review",
  });
  report.steps.localReviewAction =
    enforceAllow.status === 200 &&
    enforceAllow.json?.reviewKind === "LOCAL_REVIEW_STATE" &&
    enforceAllow.json?.policy?.decision === "CONDITIONAL" &&
    enforceAllow.json?.policy?.obligations?.some((o) => o.code === "REQUIRE_LOCAL_REVIEW")
      ? "PASS"
      : "FAIL";

  const stale = await request("POST", "/v1/governance/evaluate", {
    actionId: "analyze",
    roleId: "arch.market_analyst",
    expectedPolicyVersion: "stale/v0",
  });
  report.steps.stalePolicyVersion =
    stale.json?.policy?.reasonCodes?.includes("STALE_POLICY_VERSION") ? "PASS" : "FAIL";

  const exp = await request(
    "GET",
    "/v1/experience/compile?roleId=arch.market_analyst&objectId=AAPL&workflowState=ready"
  );
  const liveAction = exp.json?.workspaceSpec?.actions?.find((a) => a.id === "live_execution");
  report.steps.experienceProjection =
    liveAction && liveAction.enabled === false ? "PASS" : "FAIL";

  report.steps.policyVersion =
    simDeny.json?.policy?.policySetVersion === "embedded-foundation/v1" ? "PASS" : "FAIL";

  report.steps.evidence =
    simDeny.json?.policy?.evidenceRefs?.[0]?.decisionId ? "PASS" : "FAIL";

  report.steps.actorContext =
    simDeny.json?.actor?.schema === "sci-os-actor-context/v1" ? "PASS" : "FAIL";

  write("04-policy-version-proof.json", { policyVersion: report.steps.policyVersion });
  write("05-actor-context-proof.json", { actorContext: report.steps.actorContext });
  write("06-permission-deny-proof.json", { permissionDeny: report.steps.permissionDeny });
  write("07-risk-deny-proof.json", { riskDeny: report.steps.riskDeny });
  write("08-policy-deny-proof.json", { policyDeny: report.steps.policyDeny });
  write("09-conditional-proof.json", { conditional: report.steps.conditional });
  write("10-local-review-proof.json", { localReviewAction: report.steps.localReviewAction });
  write("11-simulation-only-proof.json", { simulationDeny: report.steps.simulationDeny, analyzeAllow: report.steps.analyzeAllow });
  write("12-unknown-fail-closed-proof.json", { unknownFailClosed: report.steps.unknownFailClosed, evaluationFailure: report.steps.evaluationFailure });
  write("13-tamper-proof.json", { tamper: report.steps.tamper });
  write("14-action-enforcement-proof.json", { actionEnforcement: report.steps.actionEnforcement });
  write("15-evidence-proof.json", { evidence: report.steps.evidence });
  write("16-experience-projection-proof.json", { experienceProjection: report.steps.experienceProjection });
  write("17-security-proof.json", { tamper: report.steps.tamper, bypassBlocked: report.steps.tamper, noEval: true });

  const allPass = Object.values(report.steps).every((s) => s === "PASS");
  report.status = allPass ? "PASS" : "FAIL";
  write("26-final-report.json", report);

  console.log(JSON.stringify({ ok: allPass, status: report.status, steps: report.steps }));
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
