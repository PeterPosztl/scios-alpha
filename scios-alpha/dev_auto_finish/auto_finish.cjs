#!/usr/bin/env node
"use strict";

/**
 * Windows-native runner for SCI OS auto-finish (propose-only by default).
 *   pnpm auto:finish
 *   pnpm auto:finish:gates
 *   node dev_auto_finish/auto_finish.cjs --apply --commit
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const COMMIT = process.argv.includes("--commit");
const SCAN_TODOS = process.argv.includes("--scan-todos");
const RUN_GATES =
  process.argv.includes("--run-gates") || COMMIT || process.argv.includes("--gates");
const DEV_DIR = "dev_auto_finish";
const MANIFEST = "build/manifest.json";
const REPORT = path.join(DEV_DIR, "report.json");
const TEST_CMD = process.env.TEST_CMD || "pnpm gate:scaffold";
const GIT_USER = "auto-finisher";
const BRANCH_PREFIX = "auto/finish";
const LOG_FILE = path.join(ROOT, DEV_DIR, "auto_finish.log");

function run(cmd, args, opts = {}) {
  const useShell =
    opts.shell === true ||
    (process.platform === "win32" && (cmd === "pnpm" || cmd === "git"));
  return spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: useShell,
    stdio: opts.stdio || "inherit",
    env: process.env,
    windowsHide: true,
  });
}

function log(line) {
  fs.appendFileSync(LOG_FILE, line + "\n", "utf8");
  console.log(line);
}

function main() {
  if (COMMIT && !APPLY) {
    console.error(JSON.stringify({ ok: false, error: "COMMIT_REQUIRES_APPLY" }));
    process.exit(1);
  }
  if (!fs.existsSync(path.join(ROOT, MANIFEST))) {
    console.error(JSON.stringify({ ok: false, error: "MANIFEST_MISSING" }));
    process.exit(1);
  }

  fs.mkdirSync(path.join(ROOT, DEV_DIR), { recursive: true });
  fs.writeFileSync(LOG_FILE, "", "utf8");

  let branchName = null;
  if (COMMIT) {
    branchName = `${BRANCH_PREFIX}-${Math.floor(Date.now() / 1000)}`;
    const co = run("git", ["checkout", "-b", branchName]);
    if ((co.status ?? 1) !== 0) process.exit(co.status ?? 1);
    log(`Branch: ${branchName}`);
  } else {
    log("Propose-only / no-commit run");
  }

  const pyArgs = [
    path.join(ROOT, DEV_DIR, "generator_strong.py"),
    "--manifest",
    MANIFEST,
    "--templates",
    path.join(DEV_DIR, "templates"),
    "--report",
    REPORT,
  ];
  if (APPLY) pyArgs.push("--apply");
  if (SCAN_TODOS) pyArgs.push("--scan-todos");
  if (RUN_GATES) pyArgs.push("--run-gates");

  const gen = run("python", pyArgs);
  if ((gen.status ?? 1) !== 0) process.exit(gen.status ?? 1);

  let gateOk = 0;
  if (RUN_GATES) {
    log(`Gate: ${TEST_CMD}`);
    const parts = TEST_CMD.split(/\s+/);
    const test = run(parts[0], parts.slice(1));
    gateOk = test.status ?? 1;
  }

  fs.mkdirSync(path.join(ROOT, "diagnostics-export", "auto-finish"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(ROOT, "diagnostics-export", "auto-finish", "auto-finish-run.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        branch: branchName,
        apply: APPLY,
        commitRequested: COMMIT,
        scanTodos: SCAN_TODOS,
        runGates: RUN_GATES,
        gateExit: gateOk,
        label: "ALPHA_NON_PRODUCTION",
        constitution: "propose-only; never auto-deploy",
      },
      null,
      2
    )
  );

  if (gateOk !== 0) {
    log("Gate sikertelen — nincs commit.");
    if (branchName) {
      run("git", ["checkout", "-"]);
      run("git", ["branch", "-D", branchName]);
    }
    process.exit(2);
  }

  if (COMMIT) {
    run("git", ["add", "-A"]);
    const c = run("git", [
      "-c",
      `user.name=${GIT_USER}`,
      "-c",
      `user.email=${GIT_USER}@example.com`,
      "commit",
      "-m",
      "chore(auto-finish): fill missing components (ALPHA propose/apply)",
    ]);
    if ((c.status ?? 1) !== 0) process.exit(c.status ?? 1);
    log(`Commitolva: ${branchName}`);
    if (process.env.OPEN_PR === "true") {
      log("OPEN_PR=true — futtasd kézzel: gh pr create");
    }
  } else {
    log(`Nincs commit. Report: ${REPORT} + diagnostics-export/auto-finish/`);
  }
  process.exit(0);
}

main();
