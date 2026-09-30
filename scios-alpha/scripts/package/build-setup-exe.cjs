#!/usr/bin/env node
"use strict";

/**
 * Build SCI-OS-X10-Setup.exe via pkg (payload must sit next to Setup.exe).
 */
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const RELEASE = path.join(ROOT, "dist", "release");
const OUT_EXE = path.join(RELEASE, "SCI-OS-X10-Setup.exe");

fs.mkdirSync(RELEASE, { recursive: true });

const pkgJson = {
  name: "sci-os-x10-setup",
  bin: "scripts/package/setup-entry.cjs",
  pkg: {
    scripts: ["scripts/package/setup-entry.cjs"],
    targets: ["node18-win-x64"],
    outputPath: "dist/release",
  },
};

const tmpPkg = path.join(ROOT, "dist", "cache", "setup-pkg.json");
fs.mkdirSync(path.dirname(tmpPkg), { recursive: true });
// Use root pkg tooling against setup-entry
const r = spawnSync(
  "pnpm",
  [
    "exec",
    "pkg",
    "scripts/package/setup-entry.cjs",
    "--targets",
    "node18-win-x64",
    "--output",
    OUT_EXE,
  ],
  { cwd: ROOT, shell: true, encoding: "utf8", stdio: "inherit" }
);

const ok = r.status === 0 && fs.existsSync(OUT_EXE);
fs.writeFileSync(
  path.join(ROOT, "diagnostics-export", "packaging", "06-installer-proof.json"),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      ok,
      setupExe: OUT_EXE.replace(/\\/g, "/"),
      payloadDir: path.join(RELEASE, "payload").replace(/\\/g, "/"),
      exitCode: r.status,
      usage:
        "Distribute dist/release/ with SCI-OS-X10-Setup.exe + payload/ together",
    },
    null,
    2
  ) + "\n"
);

console.log(JSON.stringify({ ok, setupExe: OUT_EXE, exitCode: r.status }, null, 2));
process.exit(ok ? 0 : 1);
