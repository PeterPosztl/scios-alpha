#!/usr/bin/env node
"use strict";

/**
 * SCI OS runtime preflight — fail fast on incompatible Node before meaningful work.
 * Contract: package.json engines.node (>=20.18.0 <21) / packaged 20.18.1 family.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const range = (pkg.engines && pkg.engines.node) || ">=20.18.0 <21";
const ver = process.version.replace(/^v/, "");
const m = ver.match(/^(\d+)\.(\d+)\.(\d+)/);
let ok = false;
if (m) {
  const major = Number(m[1]);
  const minor = Number(m[2]);
  ok = major === 20 && minor >= 18;
}
const force = process.env.SCI_ALLOW_OUTSIDE_ENGINES === "1";
const out = {
  at: new Date().toISOString(),
  schema: "sci-os-runtime-preflight/v1",
  expected: range,
  observed: process.version,
  ok,
  force,
};
fs.mkdirSync(path.join(ROOT, "diagnostics-export"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "diagnostics-export", "runtime-preflight.json"),
  JSON.stringify(out, null, 2) + "\n"
);
if (!ok && !force) {
  console.error(
    JSON.stringify(
      {
        error: "RUNTIME_CONTRACT_MISMATCH",
        ...out,
        remediation:
          "Install/use Node 20.18.x for SCI OS development/release. Packaged installs use bundled 20.18.1. Override only with SCI_ALLOW_OUTSIDE_ENGINES=1 (non-release).",
      },
      null,
      2
    )
  );
  process.exit(3);
}
if (!ok && force) {
  console.warn(JSON.stringify({ warning: "OUTSIDE_ENGINES_FORCED", ...out }));
}
console.log(JSON.stringify({ ok: true, ...out }));
