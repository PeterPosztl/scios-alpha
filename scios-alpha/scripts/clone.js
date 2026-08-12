#!/usr/bin/env node
"use strict";

/**
 * orchestrator:clone — clone plan + optional sandbox clone (ORCHESTRATOR_CLONE=1).
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { ROOT, OUT_DIR, readJson, writeJson, repoSandboxRel } = require("./orchestrator/lib.cjs");

const filtered = readJson(path.join(OUT_DIR, "filtered.json"));
if (!filtered) {
  console.error(JSON.stringify({ step: "clone", ok: false, error: "run orchestrator:filter first" }));
  process.exit(1);
}

const execute = process.env.ORCHESTRATOR_CLONE === "1";
const plans = (filtered.candidates ?? []).map((c) => {
  const rel = repoSandboxRel(c.name);
  return {
    surfaceId: c.name,
    repoUrl: c.url,
    cloneTarget: rel,
    adapterTarget: `diagnostics-export/orchestrator/adapters/${c.name.replace(/\//g, "__")}.adapter.ts`,
    action: execute ? "git_clone_sandbox" : "propose_git_clone",
    cloned: false,
    license: c.license,
    stars: c.stars,
    note: execute
      ? "Cloned into sandbox/public_repos for scan only"
      : "Set ORCHESTRATOR_CLONE=1 to clone into sandbox",
  };
});

if (execute) {
  fs.mkdirSync(path.join(ROOT, "sandbox", "public_repos"), { recursive: true });
  for (const plan of plans) {
    const abs = path.join(ROOT, plan.cloneTarget);
    if (fs.existsSync(abs)) {
      plan.cloned = true;
      plan.skipReason = "already_exists";
      continue;
    }
    try {
      execSync(`git clone --depth 1 "${plan.repoUrl}" "${abs}"`, {
        cwd: ROOT,
        stdio: "pipe",
        encoding: "utf8",
        timeout: 300_000,
        windowsHide: true,
      });
      plan.cloned = true;
    } catch (err) {
      plan.cloned = false;
      plan.error = err instanceof Error ? err.message : String(err);
    }
  }
}

const out = {
  at: new Date().toISOString(),
  source: "filtered.json",
  plans,
  externalClone: true,
  executed: execute,
  sandboxRoot: "sandbox/public_repos",
};

const file = writeJson("clone-plan.json", out);
console.log(
  JSON.stringify(
    {
      step: "clone",
      ok: true,
      file,
      plans: plans.length,
      executed: execute,
      cloned: plans.filter((p) => p.cloned).length,
    },
    null,
    2
  )
);
