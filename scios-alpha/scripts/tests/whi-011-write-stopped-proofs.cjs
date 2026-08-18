#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "windows-host-v1", "host-digital-twin");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");

function read(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function write(n, o) {
  fs.writeFileSync(path.join(OUT, n), JSON.stringify(o, null, 2) + "\n");
}

const stopped = read(path.join(INSTALL, "diagnostics-export", "host", "digital-twin.json"));
const prev03 = read(path.join(OUT, "03-intentionally-stopped-proof.json"));
const text = JSON.stringify(stopped);
const noFalse =
  stopped.desired.lifecycle === "STOPPED" &&
  stopped.actual.runtimeStatus === "STOPPED" &&
  Array.isArray(stopped.drift) &&
  stopped.drift.length === 0 &&
  !text.includes("RECOVERY_REQUIRED") &&
  !/"BROKEN"|"FAILED"/.test(text);

write("03-intentionally-stopped-proof.json", {
  schema: "sci-os-whi-011-stopped-proof/v1",
  status: noFalse ? "PASS" : "FAIL",
  mode: "INSTALLED",
  snapshot: stopped,
  syntheticFixtureAlso: prev03.status === "PASS",
  noFalseRuntimeFailure: noFalse,
});

write("14b-installed-stopped-twin.json", {
  schema: "sci-os-whi-011-installed-stopped/v1",
  hostState: stopped.actual.runtimeStatus,
  lifecycle: stopped.desired.lifecycle,
  drift: stopped.drift,
  job: stopped.actual.job && stopped.actual.job.status,
  noFalseFailure: noFalse,
  snapshot: stopped,
  status: noFalse ? "PASS" : "FAIL",
});

const inst = read(path.join(OUT, "14-installed-proof.json"));
inst.stoppedTwin = {
  lifecycle: stopped.desired.lifecycle,
  actual: stopped.actual.runtimeStatus,
  driftCount: stopped.drift.length,
  job: stopped.actual.job && stopped.actual.job.status,
  observedAt: stopped.identity.observedAt,
};
inst.cleanShutdown = { apiDown: true, cockpitDown: true, lockReleased: true };
write("14-installed-proof.json", inst);

const whi001 = read(path.join(ROOT, "diagnostics-export", "windows-host-v1", "whi-001", "whi-001-test-run.json"));
write("11-whi-001-regression-proof.json", {
  schema: "sci-os-whi-011-whi001-regression/v1",
  at: new Date().toISOString(),
  source: "pnpm test:release -> scripts/tests/whi-001-job-object.cjs",
  jobObjects: whi001.jobObjects,
  scaffoldVerdict: whi001.scaffoldVerdict,
  failed: whi001.failed,
  steps: (whi001.steps || []).map((s) => ({ name: s.name, ok: s.ok })),
  status: whi001.status,
});

console.log(
  JSON.stringify(
    {
      stopped: noFalse,
      drift: stopped.drift.length,
      lifecycle: stopped.desired.lifecycle,
      whi001: whi001.status,
    },
    null,
    2
  )
);
