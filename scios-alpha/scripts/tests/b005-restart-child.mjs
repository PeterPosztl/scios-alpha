#!/usr/bin/env node
"use strict";
/** Cross-process job hydrate proof for B-005 restart gate. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const jobId = process.argv[2];
if (!jobId) {
  console.log(JSON.stringify({ ok: false, error: "missing_job_id" }));
  process.exit(1);
}

const dataJobs = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
  "SCI OS X10",
  "data",
  "jobs"
);
const diskPath = path.join(dataJobs, `${jobId}.json`);
if (!fs.existsSync(diskPath)) {
  console.log(JSON.stringify({ ok: false, error: "missing_job_file", jobId }));
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(diskPath, "utf8"));
const ok =
  job.state === "COMPLETED" && Array.isArray(job.evidenceRefs) && job.evidenceRefs.length >= 2;
console.log(
  JSON.stringify({
    ok,
    jobId,
    state: job.state,
    evidenceCount: job.evidenceRefs?.length ?? 0,
  })
);
process.exit(ok ? 0 : 1);
