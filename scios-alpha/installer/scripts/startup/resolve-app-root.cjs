"use strict";

const fs = require("fs");
const path = require("path");

function isAppRoot(dir) {
  try {
    const pkg = path.join(dir, "package.json");
    if (!fs.existsSync(pkg)) return false;
    const j = JSON.parse(fs.readFileSync(pkg, "utf8"));
    if (j.name !== "scios-alpha" && j.name !== "scios-alpha".replace(/$/, "")) {
      // allow scios-alpha or future rename with workspace markers
    }
    const markers = [
      "pnpm-workspace.yaml",
      "packages",
      "apps",
      "diagnostics-export",
      "scripts/boot",
      "installer/scripts",
    ];
    const hits = markers.filter((m) => fs.existsSync(path.join(dir, m)));
    return hits.length >= 2 || j.name === "scios-alpha";
  } catch {
    return false;
  }
}

/**
 * Resolve application root without hardcoded drives.
 */
function resolveAppRoot(opts = {}) {
  const searchedPaths = [];
  const evidence = [];
  const candidates = [];

  if (opts.cliRoot) candidates.push(path.resolve(opts.cliRoot));
  if (process.env.SCIOS_APP_ROOT) candidates.push(path.resolve(process.env.SCIOS_APP_ROOT));
  candidates.push(process.cwd());
  candidates.push(path.resolve(__dirname, "../../..")); // installer/scripts/startup → repo
  candidates.push(path.resolve(__dirname, "../.."));
  if (process.resourcesPath) candidates.push(process.resourcesPath);
  if (require.main && require.main.filename) {
    candidates.push(path.dirname(require.main.filename));
    candidates.push(path.resolve(path.dirname(require.main.filename), "../.."));
  }

  // walk parents of cwd
  let cur = process.cwd();
  for (let i = 0; i < 8; i++) {
    candidates.push(cur);
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  const uniq = [...new Set(candidates.map((c) => path.resolve(c)))];
  for (const dir of uniq) {
    searchedPaths.push(dir);
    if (isAppRoot(dir)) {
      evidence.push(`package.json+markers@${dir}`);
      let layout = "repo";
      if (fs.existsSync(path.join(dir, "runtime/node"))) layout = "installed";
      if (process.resourcesPath && dir.startsWith(process.resourcesPath)) {
        layout = "packaged-desktop";
      }
      if (process.env.SCIOS_LAYOUT === "container") layout = "container";
      return { appRoot: dir, layout, evidence, searchedPaths, ok: true };
    }
  }

  return {
    appRoot: null,
    layout: null,
    evidence,
    searchedPaths,
    ok: false,
    failureClass: "ROOT_RESOLUTION_FAILED",
  };
}

module.exports = { resolveAppRoot, isAppRoot };
