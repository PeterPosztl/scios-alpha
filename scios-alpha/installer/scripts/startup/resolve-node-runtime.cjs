"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function tryNode(nodePath, source, enginesRange) {
  if (!nodePath || !fs.existsSync(nodePath)) {
    return { path: nodePath || null, source, version: null, usable: false, failureReason: "not_found" };
  }
  const r = spawnSync(nodePath, ["--version"], { encoding: "utf8" });
  if (r.status !== 0) {
    return {
      path: nodePath,
      source,
      version: null,
      usable: false,
      failureReason: "version_exec_failed",
    };
  }
  const version = String(r.stdout || r.stderr || "").trim().replace(/^v/, "");
  const major = Number(String(version).split(".")[0]);
  const minMajor = 20;
  if (!Number.isFinite(major) || major < minMajor) {
    return {
      path: nodePath,
      source,
      version,
      usable: false,
      failureReason: `RUNTIME_INCOMPATIBLE need>=${minMajor} got=${version}`,
      failureClass: "RUNTIME_INCOMPATIBLE",
    };
  }
  // prove child script exec
  const probe = spawnSync(nodePath, ["-e", "process.exit(0)"], { encoding: "utf8" });
  if (probe.status !== 0) {
    return {
      path: nodePath,
      source,
      version,
      usable: false,
      failureReason: "child_exec_failed",
    };
  }
  return { path: nodePath, source, version, usable: true, failureReason: null };
}

function resolveNodeRuntime(appRoot) {
  const searched = [];
  const candidates = [
    { p: path.join(appRoot, "runtime/node/node.exe"), source: "bundled" },
    { p: path.join(appRoot, "runtime/node/win-x64/node.exe"), source: "bundled" },
    { p: path.join(appRoot, "runtime/node/bin/node"), source: "bundled" },
    { p: process.execPath, source: process.execPath.includes("electron") ? "electron" : "system" },
  ];

  for (const c of candidates) {
    searched.push(c.p);
    const result = tryNode(c.p, c.source);
    if (result.usable) return { ...result, searched };
  }

  // PATH node
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["node"], {
    encoding: "utf8",
    shell: true,
  });
  const first = String(which.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (first) {
    searched.push(first);
    const result = tryNode(first, "system");
    if (result.usable) return { ...result, searched };
  }

  return {
    path: null,
    source: null,
    version: null,
    usable: false,
    failureReason: "RUNTIME_MISSING",
    failureClass: "RUNTIME_MISSING",
    searched,
  };
}

module.exports = { resolveNodeRuntime };
