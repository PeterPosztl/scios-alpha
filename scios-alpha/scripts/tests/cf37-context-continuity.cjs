#!/usr/bin/env node
"use strict";
/**
 * CF37 context continuity and dead-end control evidence.
 *
 * Three P1 register entries (CTRL.CF37.object-continuity,
 * CTRL.CF37.context-preservation, CTRL.CF37.no-dead-end-controls) were recorded
 * as DOCUMENTED with no proof: the implementation existed but no formal test
 * did. This produces that evidence rather than reclassifying the entries.
 *
 * It found a real defect on first run: /v1/product/context and
 * /v1/kernel/projection forwarded only roleId/objectId/workflowState, so the
 * server-side actor envelope always reported sessionId=null and
 * workspaceId=null — leaving the governance tamper comparison nothing
 * authoritative to compare a client claim against.
 *
 * Evidence: diagnostics-export/final-completion/cf37-context-continuity.json
 */
const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "final-completion", "cf37-context-continuity.json");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const COCKPIT = process.env.SCIOS_SHELL_URL || "http://127.0.0.1:4000";

function req(method, url, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = http.request(
      {
        method,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        timeout: 15000,
        headers: payload
          ? { "content-type": "application/json", "content-length": payload.length }
          : undefined,
      },
      (res) => {
        const c = [];
        res.on("data", (d) => c.push(d));
        res.on("end", () => {
          const text = Buffer.concat(c).toString("utf8");
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* non-JSON */
          }
          resolve({ status: res.statusCode || 0, json, text });
        });
      }
    );
    r.on("error", () => resolve({ status: 0, json: null, text: "" }));
    r.on("timeout", () => {
      r.destroy();
      resolve({ status: 0, json: null, text: "" });
    });
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  const report = {
    schema: "sci-os-cf37-context-continuity/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    registerEntries: [
      "CTRL.CF37.object-continuity",
      "CTRL.CF37.context-preservation",
      "CTRL.CF37.no-dead-end-controls",
    ],
    buildId: "UNKNOWN",
    checks: {},
    evidence: {},
    status: "FAIL",
  };
  try {
    report.buildId = JSON.parse(
      fs.readFileSync(path.join(INSTALL, "manifests/build-identity.json"), "utf8")
    ).buildId;
  } catch {
    /* optional */
  }

  const alive = await req("GET", CP + "/healthz");
  if (alive.status !== 200) {
    report.status = "UNKNOWN";
    report.reason = "control_plane_unreachable";
    write(report);
    console.log(JSON.stringify({ ok: false, token: "CF37_CONTINUITY_UNKNOWN", reason: report.reason }));
    process.exit(1);
  }

  // ---- object continuity: an object selected in one request survives ------
  const objectId = "AAPL";
  const recent = await req("POST", CP + "/v1/os/recent", {
    kind: "entity",
    id: objectId,
    title: "Apple Inc.",
  });
  const recorded = recent.json?.session?.recent?.entities?.[0]?.id ?? null;
  report.checks.objectRecorded = recorded === objectId ? "PASS" : "FAIL";
  report.evidence.objectRecorded = { expected: objectId, got: recorded };

  const sessionAfter = await req("GET", CP + "/v1/os/session");
  const survives =
    (sessionAfter.json?.recent?.entities || []).some((e) => e && e.id === objectId) === true;
  report.checks.objectSurvivesAcrossRequests = survives ? "PASS" : "FAIL";
  report.evidence.objectSurvivesAcrossRequests = {
    recentEntityIds: (sessionAfter.json?.recent?.entities || []).map((e) => e && e.id),
  };

  const ctxEntity = await req(
    "GET",
    CP + `/v1/product/context?objectId=${objectId}&sessionId=default`
  );
  const actor = ctxEntity.json?.actor || {};
  report.checks.contextCarriesObject = actor.objectId === objectId ? "PASS" : "FAIL";

  // ---- context preservation: server-authoritative session identity -------
  const serverSession = sessionAfter.json || {};
  report.checks.contextCarriesSession =
    actor.sessionId && actor.sessionId === serverSession.sessionId ? "PASS" : "FAIL";
  report.checks.contextCarriesWorkspace =
    actor.workspaceId && actor.workspaceId === serverSession.activeWorkspaceId ? "PASS" : "FAIL";
  report.evidence.actorEnvelope = {
    objectId: actor.objectId ?? null,
    sessionId: actor.sessionId ?? null,
    workspaceId: actor.workspaceId ?? null,
    roleId: actor.roleId ?? null,
    sessionActiveWorkspaceId: serverSession.activeWorkspaceId ?? null,
    sessionId_fromSessionEndpoint: serverSession.sessionId ?? null,
  };

  // A client-supplied workspaceId must not be able to override server truth.
  const spoof = await req(
    "GET",
    CP + "/v1/product/context?objectId=AAPL&sessionId=default&workspaceId=ws_attacker"
  );
  const spoofedWorkspace = spoof.json?.actor?.workspaceId ?? null;
  report.checks.workspaceNotClientOverridable =
    spoofedWorkspace === serverSession.activeWorkspaceId ? "PASS" : "FAIL";
  report.evidence.workspaceSpoofAttempt = {
    claimed: "ws_attacker",
    resolved: spoofedWorkspace,
    serverTruth: serverSession.activeWorkspaceId ?? null,
  };

  // Projection and product context must agree — one identity path, not two.
  const projection = await req("GET", CP + "/v1/kernel/projection?objectId=AAPL&sessionId=default");
  const pActor = projection.json?.actor || {};
  report.checks.projectionAgreesWithContext =
    pActor.sessionId === actor.sessionId && pActor.workspaceId === actor.workspaceId
      ? "PASS"
      : "FAIL";
  report.evidence.projectionActor = {
    sessionId: pActor.sessionId ?? null,
    workspaceId: pActor.workspaceId ?? null,
  };

  // ---- no dead-end controls: shell exposes navigation and non-terminal states
  const shell = await req("GET", CP + "/v1/os/shell");
  const primaryNav = shell.json?.primaryNav || [];
  report.checks.shellPrimaryNavPresent = primaryNav.length >= 4 ? "PASS" : "FAIL";
  report.evidence.primaryNav = primaryNav;

  const cockpit = await req("GET", COCKPIT + "/");
  const html = cockpit.text || "";
  const states = {
    loading: /loading/i.test(html),
    empty: /empty|no results|nothing/i.test(html),
    error: /error|failed|unavailable/i.test(html),
    navigation: primaryNav.some((n) => new RegExp(String(n), "i").test(html)),
  };
  report.checks.shellExposesNonTerminalStates =
    states.loading && states.error && states.navigation ? "PASS" : "FAIL";
  report.evidence.shellStates = states;

  report.status = Object.values(report.checks).every((v) => v === "PASS") ? "PASS" : "FAIL";
  report.token = report.status === "PASS" ? "CF37_CONTINUITY_PROVEN" : "CF37_CONTINUITY_FAIL";
  report.closesRegisterEntries = report.status === "PASS" ? report.registerEntries : [];
  write(report);

  console.log(
    JSON.stringify({
      ok: report.status === "PASS",
      token: report.token,
      buildId: report.buildId,
      failed: Object.entries(report.checks)
        .filter(([, v]) => v !== "PASS")
        .map(([k]) => k),
    })
  );
  process.exit(report.status === "PASS" ? 0 : 1);
}

function write(report) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
}

main();
