#!/usr/bin/env node
"use strict";

/**
 * dev/auto_fill.cjs — Windows-native SCI OS ×10 auto-fill runner
 *
 *   pnpm auto:fill              propose-only + gate:scaffold
 *   pnpm auto:fill:apply        write into tree + gate (no commit)
 *   node dev/auto_fill.cjs --apply --commit
 *
 * Constitution: propose-only; never auto-deploy. Commit requires --commit.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const COMMIT = process.argv.includes("--commit");
const USE_PYTHON = process.argv.includes("--python");
const SCAN_TODOS = process.argv.includes("--scan-todos");
const MANIFEST = "build/manifest.json";
const TEMPLATES = "dev/templates";
const PLAN = "dev/fill-plan.json";
const TEST_CMD = ["pnpm", "gate:scaffold"];
const GIT_USER = "auto-generator";
const BRANCH_PREFIX = "auto/fill";

function run(cmd, args, opts = {}) {
  const useShell = opts.shell === true || (process.platform === "win32" && cmd === "pnpm");
  return spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: useShell,
    stdio: opts.stdio || "inherit",
    env: process.env,
    windowsHide: true,
  });
}

function writeJson(rel, obj) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(obj, null, 2));
}

function main() {
  if (COMMIT && !APPLY) {
    console.error(
      JSON.stringify({ ok: false, error: "COMMIT_REQUIRES_APPLY" })
    );
    process.exit(1);
  }
  if (!fs.existsSync(path.join(ROOT, MANIFEST))) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "MANIFEST_MISSING",
        hint: "Generate build/manifest.json first",
      })
    );
    process.exit(1);
  }

  let branchName = null;
  if (COMMIT) {
    branchName = `${BRANCH_PREFIX}-${Math.floor(Date.now() / 1000)}`;
    const co = run("git", ["checkout", "-b", branchName]);
    if ((co.status ?? 1) !== 0) process.exit(co.status ?? 1);
  }

  let gen;
  if (USE_PYTHON) {
    const pyArgs = [
      path.join(ROOT, "dev/generator.py"),
      "--manifest",
      MANIFEST,
      "--templates",
      TEMPLATES,
      "--plan",
      PLAN,
    ];
    if (APPLY) pyArgs.push("--apply");
    if (SCAN_TODOS) pyArgs.push("--scan-todos");
    gen = run("python", pyArgs);
  } else {
    const genArgs = [
      path.join(ROOT, "dev/generator.cjs"),
      "--manifest",
      MANIFEST,
      "--templates",
      TEMPLATES,
      "--plan",
      PLAN,
    ];
    if (APPLY) genArgs.push("--apply");
    if (SCAN_TODOS) genArgs.push("--scan-todos");
    gen = run(process.execPath, genArgs);
  }
  if ((gen.status ?? 1) !== 0) process.exit(gen.status ?? 1);

  console.log(`Futtatom a gate-et: ${TEST_CMD.join(" ")}`);
  const test = run(TEST_CMD[0], TEST_CMD.slice(1));
  const testExit = test.status ?? 1;

  writeJson("diagnostics-export/auto-fill/auto-fill-run.json", {
    at: new Date().toISOString(),
    branch: branchName,
    apply: APPLY,
    commitRequested: COMMIT,
    testCmd: TEST_CMD.join(" "),
    testExit,
    label: "ALPHA_NON_PRODUCTION",
    constitution: "propose-only; never auto-deploy",
  });

  if (testExit === 0) {
    console.log("Gate sikeres.");
    if (COMMIT) {
      run("git", ["add", "-A"]);
      const commit = run(
        "git",
        [
          "-c",
          `user.name=${GIT_USER}`,
          "-c",
          `user.email=${GIT_USER}@example.com`,
          "commit",
          "-m",
          "chore(auto-fill): propose/apply missing components (ALPHA)",
        ],
        { stdio: "inherit" }
      );
      if ((commit.status ?? 1) !== 0) process.exit(commit.status ?? 1);
      console.log(`Branch kész: ${branchName} — ellenőrizd, majd nyiss PR-t.`);
    } else {
      console.log(
        "Nincs commit (propose-only / --commit nélkül). Bizonyíték: diagnostics-export/auto-fill/"
      );
    }
    process.exit(0);
  }

  console.error(`Gate sikertelen (exit=${testExit}). Nincs commit.`);
  if (branchName) {
    run("git", ["checkout", "-"]);
    run("git", ["branch", "-D", branchName]);
  }
  process.exit(2);
}

main();
