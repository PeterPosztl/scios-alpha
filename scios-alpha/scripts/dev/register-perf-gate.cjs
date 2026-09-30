#!/usr/bin/env node
"use strict";
/** One-shot: add the performance baseline to the release suite. */
const fs = require("fs");
const path = require("path");

const p = path.resolve(__dirname, "../../package.json");
const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
const step = "node scripts/tests/performance-baseline.cjs";
const anchor = "node scripts/tests/installed-restart-reliability.cjs";

if (pkg.scripts["test:release"].includes(step)) {
  console.log(JSON.stringify({ ok: true, note: "already registered" }));
  process.exit(0);
}
if (!pkg.scripts["test:release"].includes(anchor)) {
  console.error(JSON.stringify({ ok: false, error: "anchor_missing" }));
  process.exit(1);
}

pkg.scripts["test:release"] = pkg.scripts["test:release"].replace(anchor, `${anchor} && ${step}`);
fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, steps: pkg.scripts["test:release"].split("&&").length }));
