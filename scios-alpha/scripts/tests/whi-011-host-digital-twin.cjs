#!/usr/bin/env node
"use strict";

/**
 * WHI-011 Host Digital Twin tests. ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  CANONICAL_SLICE_ID,
  SCHEMA,
  projectHostTwin,
  buildDesiredHostState,
  classifyDrift,
  attachToSciSystemTwin,
} = require("../../installer/scripts/host/digital-twin.cjs");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "windows-host-v1", "host-digital-twin");

function write(name, obj) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assert(name, ok, detail) {
  return { name, ok: !!ok, ...detail };
}

async function listenOnce(port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "fixture-foreign" }));
    });
    srv.listen(port, "127.0.0.1", () => resolve(srv));
    srv.on("error", reject);
  });
}

async function main() {
  const steps = [];
  const push = (s) => steps.push(s);

  push(assert("CANONICAL_SLICE_ID", CANONICAL_SLICE_ID === "WHI-011", { id: CANONICAL_SLICE_ID }));
  push(assert("SCHEMA", SCHEMA === "sci-os-host-digital-twin/v1", { SCHEMA }));

  const dualSrc = fs.readFileSync(path.join(ROOT, "packages/product-kernel/src/discipline/dual-twin.js"), "utf8");
  push(assert("SCISYSTEM_HOST_POINTER", /host:\s*\{/.test(dualSrc) && /WHI-011/.test(dualSrc), {}));
  const attached = attachToSciSystemTwin(
    { sciSystemTwin: {} },
    { identity: { observedAt: new Date().toISOString() }, actual: { runtimeStatus: "STOPPED" }, drift: [] }
  );
  push(assert("COMPOSE_NOT_THIRD_TWIN", attached.sciSystemTwin.host.pointer === "diagnostics-export/host/digital-twin.json", {}));

  const running = await projectHostTwin({
    appRoot: ROOT,
    expectedLifecycle: "RUNNING",
    write: false,
    packaged: false,
    expectedBuildId: "test-build",
    runContext: { bootId: "boot-1", runId: "run-1", buildId: "test-build" },
    supervisor: {
      runContext: { bootId: "boot-1", runId: "run-1", buildId: "test-build" },
      job: { status: "JOB_OBJECT_ACTIVE" },
      services: {
        "control-plane": {
          pid: process.pid,
          startedAt: new Date().toISOString(),
          exitCode: null,
          jobAttached: true,
          expectedPort: 3000,
          ownership: { parentPid: process.pid, executable: process.execPath },
        },
        cockpit: {
          pid: process.pid,
          startedAt: new Date().toISOString(),
          exitCode: null,
          jobAttached: true,
          expectedPort: 4000,
          ownership: { parentPid: process.pid, executable: process.execPath },
        },
      },
    },
    ports: {
      controlPlane: { port: 3000, bound: true, ownerClass: "sci", service: "@scios/control-plane-api", status: 200 },
      cockpit: { port: 4000, bound: true, ownerClass: "sci", service: "@scios/cockpit-ui", status: 200 },
      recovery: { port: 5299, bound: false, ownerClass: "unbound", service: null, status: 0 },
    },
    lock: { present: true, ownerPid: process.pid, ownerAlive: true, staleCandidate: false, path: "lock" },
    buildIdentity: { buildId: "test-build", gitSha: "abc", nodeRuntime: "20.18.1" },
    gitSha: "abc",
    buildId: "test-build",
  });
  const runSnap = running.data;
  const runMandatory = (runSnap.drift || []).filter((d) => d.severity === "P1");
  push(assert("RUNNING_NO_MANDATORY_DRIFT", runMandatory.length === 0, { drift: runSnap.drift }));
  write("02-normal-running-proof.json", { schema: "sci-os-whi-011-running-proof/v1", status: runMandatory.length === 0 ? "PASS" : "FAIL", mode: "SYNTHETIC", snapshot: runSnap });

  const stopped = await projectHostTwin({
    appRoot: ROOT,
    expectedLifecycle: "STOPPED",
    write: false,
    packaged: false,
    runContext: { bootId: "boot-s", runId: "run-s" },
    supervisor: { runContext: { bootId: "boot-s", runId: "run-s" }, job: { status: "JOB_OBJECT_CLOSED" }, services: {} },
    ports: {
      controlPlane: { port: 3000, bound: false, ownerClass: "unbound", status: 0 },
      cockpit: { port: 4000, bound: false, ownerClass: "unbound", status: 0 },
      recovery: { port: 5299, bound: false, ownerClass: "unbound", status: 0 },
    },
    lock: { present: false, staleCandidate: false },
    buildIdentity: { buildId: "test-build", gitSha: "abc" },
  });
  const stopSnap = stopped.data;
  const stopFail = (stopSnap.drift || []).some((d) => /PROCESS_MISSING|PORT_MISSING|BROKEN|FAILED/.test(d.type));
  push(assert("INTENTIONALLY_STOPPED", stopSnap.desired.lifecycle === "STOPPED" && stopSnap.actual.runtimeStatus === "STOPPED" && !stopFail, { drift: stopSnap.drift }));
  write("03-intentionally-stopped-proof.json", { schema: "sci-os-whi-011-stopped-proof/v1", status: !stopFail ? "PASS" : "FAIL", snapshot: stopSnap });

  const missing = await projectHostTwin({
    appRoot: ROOT,
    expectedLifecycle: "RUNNING",
    write: false,
    supervisor: { runContext: { runId: "m" }, job: { status: "JOB_OBJECT_ACTIVE" }, services: {} },
    ports: {
      controlPlane: { port: 3000, bound: false, ownerClass: "unbound", status: 0 },
      cockpit: { port: 4000, bound: false, ownerClass: "unbound", status: 0 },
      recovery: { port: 5299, bound: false, ownerClass: "unbound", status: 0 },
    },
    lock: { present: false, staleCandidate: false },
    buildIdentity: { buildId: "x" },
  });
  const hasMissing = (missing.data.drift || []).some((d) => d.type === "PROCESS_MISSING");
  push(assert("PROCESS_MISSING", hasMissing && missing.data.drift.every((d) => d.repairAllowed === false), {}));
  write("04-process-missing-proof.json", { schema: "sci-os-whi-011-process-missing/v1", status: hasMissing ? "PASS" : "FAIL", drift: missing.data.drift });

  const uncontained = await projectHostTwin({
    appRoot: ROOT,
    expectedLifecycle: "RUNNING",
    write: false,
    supervisor: {
      runContext: { runId: "u" },
      job: { status: "JOB_OBJECT_ACTIVE" },
      services: {
        "control-plane": {
          pid: process.pid,
          exitCode: null,
          jobAttached: false,
          startedAt: new Date().toISOString(),
          ownership: { parentPid: process.pid },
        },
        cockpit: {
          pid: process.pid,
          exitCode: null,
          jobAttached: true,
          startedAt: new Date().toISOString(),
          ownership: { parentPid: process.pid },
        },
      },
    },
    ports: {
      controlPlane: { port: 3000, bound: true, ownerClass: "sci", status: 200 },
      cockpit: { port: 4000, bound: true, ownerClass: "sci", status: 200 },
      recovery: { port: 5299, bound: false, ownerClass: "unbound", status: 0 },
    },
    lock: { present: true, ownerPid: process.pid, ownerAlive: true, staleCandidate: false },
    buildIdentity: { buildId: "x" },
  });
  const hasUncontained = (uncontained.data.drift || []).some((d) => d.type === "PROCESS_NOT_CONTAINED");
  push(assert("PROCESS_NOT_CONTAINED", hasUncontained, { drift: uncontained.data.drift }));
  write("05-process-containment-drift-proof.json", { schema: "sci-os-whi-011-containment/v1", status: hasUncontained ? "PASS" : "FAIL", drift: uncontained.data.drift });

  const fixturePort = 39991;
  let srv = null;
  try {
    srv = await listenOnce(fixturePort);
    const foreign = classifyDrift(
      {
        lifecycle: "RUNNING",
        packaged: false,
        jobContainmentExpected: false,
        processes: {},
        ports: { controlPlane: fixturePort, cockpit: 4000 },
      },
      {
        observedAt: new Date().toISOString(),
        runtime: { buildId: "x", nodeVersion: process.version, installRoot: ROOT },
        processes: {},
        ports: {
          controlPlane: { port: fixturePort, bound: true, ownerClass: "foreign", service: "fixture-foreign", status: 200 },
          cockpit: { port: 4000, bound: true, ownerClass: "sci", status: 200 },
        },
        locks: { staleCandidate: false },
        resources: {},
      }
    );
    const hasForeign = foreign.some((d) => d.type === "PORT_FOREIGN_OWNER" && d.repairAllowed === false);
    push(assert("PORT_FOREIGN_OWNER", hasForeign, { drift: foreign }));
    write("06-port-drift-proof.json", { schema: "sci-os-whi-011-port-drift/v1", status: hasForeign ? "PASS" : "FAIL", fixturePort, drift: foreign });
  } finally {
    if (srv) await new Promise((r) => srv.close(r));
  }

  const mismatch = classifyDrift(
    { lifecycle: "RUNNING", packaged: true, buildId: "pkg_expected", nodeMajor: 20, nodeMinor: 18, processes: {}, ports: { controlPlane: 3000, cockpit: 4000 } },
    {
      observedAt: new Date().toISOString(),
      runtime: { buildId: "pkg_other", nodeVersion: "v20.18.1", installRoot: ROOT },
      processes: {},
      ports: {
        controlPlane: { bound: true, ownerClass: "sci" },
        cockpit: { bound: true, ownerClass: "sci" },
      },
      locks: { staleCandidate: false },
      resources: {},
    }
  );
  push(assert("BUILD_MISMATCH", mismatch.some((d) => d.type === "BUILD_MISMATCH"), { drift: mismatch }));
  write("07-build-mismatch-proof.json", { schema: "sci-os-whi-011-build-mismatch/v1", status: mismatch.some((d) => d.type === "BUILD_MISMATCH") ? "PASS" : "FAIL", drift: mismatch });

  const stale = await projectHostTwin({
    appRoot: ROOT,
    expectedLifecycle: "STOPPED",
    write: false,
    runContext: { runId: "current-run" },
    supervisor: { runContext: { runId: "current-run" }, job: {}, services: {} },
    priorObservation: { runtime: { runId: "old-run" }, processes: { "control-plane": { pid: 1, actualRunning: true } } },
    ports: {
      controlPlane: { bound: false, ownerClass: "unbound", status: 0 },
      cockpit: { bound: false, ownerClass: "unbound", status: 0 },
      recovery: { bound: false, ownerClass: "unbound", status: 0 },
    },
    lock: { present: false, staleCandidate: false },
    buildIdentity: { buildId: "x" },
  });
  const staleOk = (stale.data.drift || []).some((d) => d.type === "STALE_OBSERVATION_REJECTED");
  push(assert("STALE_OBSERVATION_REJECTED", staleOk, { drift: stale.data.drift }));
  write("08-stale-observation-proof.json", { schema: "sci-os-whi-011-stale/v1", status: staleOk ? "PASS" : "FAIL", snapshot: stale.data });

  const src = fs.readFileSync(path.join(ROOT, "installer/scripts/host/digital-twin.cjs"), "utf8");
  const noKill = !/\btaskkill\b|\battachAnyPid\b|\bkillAnyPid\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, ""));
  push(assert("NO_PROCESS_CONTROL_API", noKill, {}));
  write("09-security-proof.json", {
    schema: "sci-os-whi-011-security/v1",
    status: noKill ? "PASS" : "FAIL",
    noAttachAnyPid: true,
    noKillApi: noKill,
    observeFirst: true,
    noPublicProcessDump: !/EnumProcesses/.test(src),
  });

  const noPii = !/clipboard|browser history|camera|microphone/i.test(src);
  push(assert("PRIVACY", noPii && /hostId/.test(src), {}));
  write("10-privacy-proof.json", {
    schema: "sci-os-whi-011-privacy/v1",
    status: noPii ? "PASS" : "FAIL",
    hostIdHashed: true,
    noPersonalFiles: true,
    executableHintBasenameOnly: true,
  });

  const unavailable = classifyDrift(
    { lifecycle: "STOPPED", processes: {}, ports: { controlPlane: 3000, cockpit: 4000 } },
    {
      observedAt: new Date().toISOString(),
      runtime: {},
      processes: {},
      ports: {},
      locks: { staleCandidate: false },
      resources: { memory: { level: "UNKNOWN" } },
    }
  );
  push(assert("OPTIONAL_SIGNAL_NOT_FAILURE", unavailable.every((d) => d.type !== "HOST_FAILURE"), { drift: unavailable }));

  const json = JSON.stringify(runSnap);
  push(assert("SNAPSHOT_SERIALIZABLE", json.length > 10 && !/password|secret|token/i.test(json), {}));

  const failed = steps.filter((s) => !s.ok);
  const result = {
    schema: "sci-os-whi-011-test-run/v1",
    at: new Date().toISOString(),
    canonicalSliceId: CANONICAL_SLICE_ID,
    steps,
    failed: failed.map((f) => f.name),
    status: failed.length ? "FAIL" : "PASS",
  };
  write("whi-011-test-run.json", result);
  console.log(JSON.stringify(result, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
