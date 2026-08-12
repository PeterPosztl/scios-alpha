"use strict";

/**
 * Safe Mode entry — thin wrapper over canonical orchestrator.
 * No duplicated startup logic.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const orchestrator = path.join(__dirname, "start-sci-os.cjs");
const r = spawnSync(
  process.execPath,
  [orchestrator, "--mode=safe", "--no-open", ...process.argv.slice(2)],
  { cwd: path.join(__dirname, "../.."), stdio: "inherit", shell: false }
);
process.exit(r.status ?? 1);
