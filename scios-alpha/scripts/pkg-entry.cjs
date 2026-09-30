#!/usr/bin/env node
"use strict";

/**
 * pkg entry — thin launcher for SCI OS ×10 ALPHA.
 * Packaged as dist/SCI-OS-X10.exe (node18-win-x64).
 * Spawns the golden-boot bootstrap when possible; otherwise prints guidance.
 */
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.pkg
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, "..");

console.log(
  JSON.stringify({
    app: "SCI-OS-X10",
    label: "ALPHA_NON_PRODUCTION",
    packaged: !!process.pkg,
    root,
    argv: process.argv.slice(2),
  })
);

const capsule = path.join(root, "bootstrap", "bootstrap-capsule.js");
const installer = path.join(
  root,
  "installer",
  "scripts",
  "bootstrap-capsule.cjs"
);

const target = require("fs").existsSync(capsule)
  ? capsule
  : require("fs").existsSync(installer)
    ? installer
    : null;

if (!target) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "LAUNCHER_ENTRY_MISSING",
      note: "Run from scios-alpha workspace or ship bootstrap/ next to the exe",
    })
  );
  process.exit(1);
}

const r = spawnSync(process.execPath, [target, ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: false,
});
process.exit(r.status ?? 1);
