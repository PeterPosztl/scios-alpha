#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const log = (m) => fs.appendFileSync(path.join(__dirname, "../../diagnostics-export/completion-program/b-002/_install-trace.log"), m + "\n");

try {
  log("start " + new Date().toISOString());
  const atomic = path.join(__dirname, "atomic-install.cjs");
  log("exec " + atomic);
  require("child_process").execFileSync(process.execPath, [atomic], {
    cwd: path.join(__dirname, "../.."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  });
  log("done ok");
} catch (e) {
  log("fail " + (e.status || "") + " " + (e.stdout || "").slice(0, 500) + " ERR " + (e.stderr || "").slice(0, 500));
  process.exit(e.status || 1);
}
