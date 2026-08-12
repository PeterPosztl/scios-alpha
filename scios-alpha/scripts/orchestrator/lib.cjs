"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "diagnostics-export", "orchestrator");

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  return OUT_DIR;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(name, data) {
  const dir = ensureOutDir();
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

function listWorkspacePackages() {
  const surfaces = [];
  for (const group of ["apps", "packages"]) {
    const base = path.join(ROOT, group);
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base)) {
      const pkgPath = path.join(base, name, "package.json");
      if (!fs.existsSync(pkgPath)) continue;
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        surfaces.push({
          id: `${group}/${name}`,
          group,
          name: pkg.name ?? name,
          version: pkg.version ?? "0.0.0",
          surface: path.join(group, name),
          scripts: Object.keys(pkg.scripts ?? {}),
        });
      } catch {
        /* skip invalid package.json */
      }
    }
  }
  return surfaces;
}

function repoSandboxRel(name) {
  return path.join("sandbox", "public_repos", name.replace(/\//g, "_"));
}

module.exports = {
  ROOT,
  OUT_DIR,
  ensureOutDir,
  readJson,
  writeJson,
  listWorkspacePackages,
  repoSandboxRel,
};
