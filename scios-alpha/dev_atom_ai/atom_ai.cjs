#!/usr/bin/env node
"use strict";

/**
 * Atom AI kit runner — SCI OS ×10 (propose-only by default)
 *   pnpm atom:ai
 *   pnpm atom:ai:gates
 *   pnpm atom:health
 *   node dev_atom_ai/atom_ai.cjs --apply --commit   # explicit only
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const COMMIT = process.argv.includes("--commit");
const SCAN_TODOS = process.argv.includes("--scan-todos");
const RUN_GATES =
  process.argv.includes("--run-gates") ||
  process.argv.includes("--gates") ||
  COMMIT;
const WORK = ".atom_ai";
const MANIFEST = process.env.MANIFEST || "build/manifest.json";
const REPORT = path.join(WORK, "report.json");
const LOG = path.join(WORK, "atom_ai.log");
const TEST_CMD = process.env.TEST_CMD || "pnpm gate:scaffold";
const GIT_USER = "atom-autogen";
const BRANCH_PREFIX = "atom/finish";

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
  fs.mkdirSync(path.join(ROOT, WORK), { recursive: true });
  fs.appendFileSync(path.join(ROOT, LOG), line + "\n", "utf8");
  console.log(line);
}

function main() {
  if (COMMIT && !APPLY) {
    console.error(JSON.stringify({ ok: false, error: "COMMIT_REQUIRES_APPLY" }));
    process.exit(1);
  }
  if (!fs.existsSync(path.join(ROOT, MANIFEST))) {
    console.error(JSON.stringify({ ok: false, error: "MANIFEST_MISSING", MANIFEST }));
    process.exit(1);
  }

  fs.mkdirSync(path.join(ROOT, WORK), { recursive: true });
  fs.writeFileSync(path.join(ROOT, LOG), `Atom AI kit @ ${new Date().toISOString()}\n`);

  let branchName = null;
  if (COMMIT) {
    branchName = `${BRANCH_PREFIX}-${Math.floor(Date.now() / 1000)}`;
    const co = run("git", ["checkout", "-b", branchName]);
    if ((co.status ?? 1) !== 0) process.exit(co.status ?? 1);
    log(`Branch: ${branchName}`);
  } else {
    log("Propose-only / no-commit (constitution)");
  }

  const pyArgs = [
    path.join(ROOT, "dev_atom_ai/generator_atom.py"),
    "--manifest",
    MANIFEST,
    "--templates",
    path.join("dev_atom_ai", "templates"),
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
    gateOk = run(parts[0], parts.slice(1)).status ?? 1;
  }

  const evidence = {
    at: new Date().toISOString(),
    branch: branchName,
    apply: APPLY,
    commitRequested: COMMIT,
    scanTodos: SCAN_TODOS,
    runGates: RUN_GATES,
    gateExit: gateOk,
    label: "ALPHA_NON_PRODUCTION",
    canonicalStartup: "pnpm sci:start",
    constitution: "propose-only; never auto-deploy; no parallel Atom core",
  };
  fs.mkdirSync(path.join(ROOT, "diagnostics-export", "atom-ai"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "diagnostics-export", "atom-ai", "atom-ai-run.json"),
    JSON.stringify(evidence, null, 2)
  );

  if (gateOk !== 0) {
    log("Gate failed — no commit");
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
      "chore(atom-ai): propose/apply kit changes (ALPHA)",
    ]);
    if ((c.status ?? 1) !== 0) process.exit(c.status ?? 1);
    log(`Committed: ${branchName}`);
    if (process.env.OPEN_PR === "true") {
      log("OPEN_PR=true — run manually: gh pr create");
    }
  } else {
    log(`No commit. Reports: ${REPORT}, .atom_ai/report.html, diagnostics-export/atom-ai/`);
  }
  process.exit(0);
}

main();
