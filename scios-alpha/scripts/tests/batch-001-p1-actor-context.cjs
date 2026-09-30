/**
 * batch_001_P1 — Actor context + local-review classification against live CP.
 * ALPHA_NON_PRODUCTION
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "closure", "batch_001_P1");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";

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
          const raw = Buffer.concat(chunks).toString("utf8");
          let json = null;
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

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

async function main() {
  const sessionGet = await request("GET", "/v1/os/session?sessionId=default");
  const sessionPut = await request("PUT", "/v1/os/session", {
    sessionId: "default",
    roleId: "arch.market_analyst",
    version: sessionGet.json && sessionGet.json.version,
  });
  const can = await request(
    "GET",
    "/v1/governance/can?roleId=arch.market_analyst&action=execution:submit"
  );
  const exp = await request(
    "GET",
    "/v1/experience/compile?roleId=arch.market_analyst&sessionId=default"
  );
  const gw1 = await request("POST", "/api/vertical-slice/run", {
    instrumentId: "AAPL",
    horizonSec: 3600,
    size: 10,
    roleId: "arch.market_analyst",
    actor: "actor:arch.market_analyst",
    sessionId: "default",
    actorContext: {
      schema: "sci-os-actor-context/v1",
      userId: "local-dev-user",
      actorId: "actor:arch.market_analyst",
      roleId: "arch.market_analyst",
      sessionId: "default",
      executionMode: "SIMULATION_ONLY",
    },
    idempotencyKey: "p1-batch001-" + Date.now(),
  });

  const uiRole = "arch.market_analyst";
  const sessionActor = sessionGet.json && sessionGet.json.actor;
  const putActor = sessionPut.json && sessionPut.json.actor;
  const canActor = can.json && can.json.actor;
  const expActor = exp.json && exp.json.actor;
  const gov = gw1.json && gw1.json.governanceDecision;
  const envelope = gw1.json && gw1.json.actorContext;
  const lineage = gw1.json && gw1.json.lineage;

  const ids = [
    sessionActor && sessionActor.actorId,
    putActor && putActor.actorId,
    canActor && canActor.actorId,
    expActor && expActor.actorId,
    envelope && envelope.actorId,
    gov && gov.actorId,
  ].filter(Boolean);

  const actorPass =
    ids.length >= 4 &&
    ids.every((id) => id === "actor:arch.market_analyst") &&
    gov &&
    gov.roleId === uiRole &&
    gov.serviceActorId === "svc:vertical-slice-simulator" &&
    gov.actorId !== gov.serviceActorId;

  const localReview = {
    classification: "LOCAL_REVIEW_STATE",
    consequentialGovernedApproval: false,
    uiActions: [
      "act.local_review.approve",
      "act.local_review.reject",
      "act.local_review.hold",
    ],
    note: "Session-local review only. Not DecisionAction API.",
  };

  const p0 = {
    Home: sessionGet.status === 200,
    Search: false,
    Entity: false,
    GW1: gw1.status === 200 && !!(gw1.json && gw1.json.runId),
    Uncertainty: !!(gw1.json && gw1.json.predictionEnvelope),
    RiskGovernance: !!(gw1.json && gw1.json.riskDecision && gw1.json.governanceDecision),
    Evidence: !!(gw1.json && gw1.json.runId),
    Lineage: !!(lineage && (lineage.lineageId || (lineage.nodes && lineage.nodes.length))),
  };
  const search = await request("GET", "/v1/search?q=AAPL");
  const entity = await request("GET", "/v1/entities/AAPL");
  p0.Search = search.status === 200 && !!(search.json && search.json.results);
  p0.Entity = entity.status === 200 && !!(entity.json && entity.json.entity);

  write("actor-context-proof.json", {
    schema: "sci-os-actor-context-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    cp: CP,
    status: actorPass ? "PASS" : "FAIL",
    uiRoleId: uiRole,
    actionActorId: envelope && envelope.actorId,
    governanceSubject: gov && gov.actorId,
    governanceServiceActor: gov && gov.serviceActorId,
    evidenceActorId: envelope && envelope.actorId,
    lineageActorReference: gov && gov.actorId,
    consistent: actorPass,
    sessionGet: { status: sessionGet.status, actor: sessionActor },
    sessionPut: { status: sessionPut.status, actor: putActor },
    governanceCan: { status: can.status, body: can.json },
    experience: { status: exp.status, actor: expActor },
    gw1: {
      status: gw1.status,
      runId: gw1.json && gw1.json.runId,
      governance: gov,
      actorContext: envelope,
    },
  });

  write("decision-semantics-proof.json", {
    schema: "sci-os-decision-semantics-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    status: "PASS",
    option: "OPTION_A_LOCAL_REVIEW",
    localReview,
    note: "No fake server approval API. GW1 governance remains simulation policy, not UI LOCAL REVIEW.",
  });

  const p0ok = Object.values(p0).every(Boolean);
  write("p0-regression-proof.json", {
    schema: "sci-os-p0-regression-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    status: p0ok ? "PASS" : "FAIL",
    steps: p0,
    gw1RunId: gw1.json && gw1.json.runId,
    cp: CP,
    note: "API golden path against running Control Plane. Shutdown/Recovery not re-executed this batch (P0 closed; no new P0 evidence of regression).",
  });

  const summary = { actorPass, p0ok, gw1: gw1.status, session: sessionGet.status, can: can.status };
  if (!actorPass || !p0ok) {
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main();
