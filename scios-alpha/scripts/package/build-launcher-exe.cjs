#!/usr/bin/env node
"use strict";

/**
 * Build SCI-OS-X10.exe launcher via pkg into dist/SCI-OS-X10/
 */
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "dist", "SCI-OS-X10");
const OUT_EXE = path.join(OUT_DIR, "SCI-OS-X10.exe");

fs.mkdirSync(OUT_DIR, { recursive: true });

const r = spawnSync(
  "pnpm",
  [
    "exec",
    "pkg",
    "scripts/package/launcher-entry.cjs",
    "--targets",
    "node18-win-x64",
    "--output",
    OUT_EXE,
  ],
  { cwd: ROOT, shell: true, encoding: "utf8", stdio: "inherit" }
);

const ok = r.status === 0 && fs.existsSync(OUT_EXE);
if (ok) {
  // Also copy into release payload
  const payload = path.join(ROOT, "dist", "release", "payload");
  if (fs.existsSync(payload)) {
    fs.copyFileSync(OUT_EXE, path.join(payload, "SCI-OS-X10.exe"));
  }
  fs.copyFileSync(OUT_EXE, path.join(OUT_DIR, "SCI OS X10.exe"));
}

console.log(JSON.stringify({ ok, exe: OUT_EXE, exitCode: r.status }, null, 2));
process.exit(ok ? 0 : 1);
