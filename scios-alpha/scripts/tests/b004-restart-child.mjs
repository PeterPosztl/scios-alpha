#!/usr/bin/env node
"use strict";
/** Child helper — verify loadPersistedRuns hydrates a runId (cross-process restart truth). */
import { loadPersistedRuns } from "../../packages/vertical-slice/dist/local-durable.js";

const runId = process.argv[2];
if (!runId) {
  console.log(JSON.stringify({ ok: false, error: "missing_run_id" }));
  process.exit(1);
}

const runs = loadPersistedRuns();
const ok = runs.has(runId);
console.log(JSON.stringify({ ok, runId, count: runs.size }));
process.exit(ok ? 0 : 1);
