#!/usr/bin/env node
"use strict";

/**
 * WHI-001 owner-loss controlled fixture — orchestrator + keeper + long-lived child.
 * Writes marker JSON then waits until killed. ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const path = require("path");
const { ProcessSupervisor } = require("../../../installer/scripts/startup/process-supervisor.cjs");

async function main() {
  const markerPath = process.argv[2];
  const appRoot = path.resolve(__dirname, "../../..");
  const runId = `owner-loss-${process.pid}`;
  const sup = new ProcessSupervisor(appRoot, process.execPath, {
    bootId: runId,
    runId,
    buildId: "fixture",
  });
  await sup.initHostLayer();
  const rec = await sup.start("long-child", process.execPath, ["-e", "setInterval(()=>{}, 120000)"], {
    shell: false,
    cwd: appRoot,
    detached: false,
  });
  const marker = {
    orchestratorPid: process.pid,
    childPid: rec.pid,
    keeperPid: sup.jobProvider.keeperPid,
    jobStatus: sup.jobProvider.status,
    jobAttached: rec.jobAttached,
    at: new Date().toISOString(),
  };
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2));
  console.log("FIXTURE_READY", JSON.stringify(marker));
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
