/**
 * Packaged vs developer runtime detection — shared by startup + packaging proofs.
 * ALPHA_NON_PRODUCTION
 */
"use strict";

const fs = require("fs");
const path = require("path");

function hasCockpitArtifact(appRoot) {
  return (
    fs.existsSync(path.join(appRoot, "cockpit", "index.mjs")) ||
    fs.existsSync(path.join(appRoot, "cockpit", "index.js"))
  );
}

/**
 * Valid packaged root requires full identity — not merely bundled node.exe.
 */
function isPackagedLayout(appRoot) {
  if (process.env.SCIOS_RUNTIME_MODE === "PACKAGED") return true;
  if (process.env.SCIOS_PACKAGED === "1") return true;

  const required = [
    path.join(appRoot, "runtime", "node", "node.exe"),
    path.join(appRoot, "backend", "server.cjs"),
    path.join(appRoot, "config", "packaged.json"),
    path.join(appRoot, "manifests", "golden-boot.packaged.json"),
  ];
  const allRequired = required.every((p) => fs.existsSync(p));
  return allRequired && hasCockpitArtifact(appRoot);
}

function packagedEntries(appRoot) {
  return {
    backend: path.join(appRoot, "backend", "server.cjs"),
    cockpit: path.join(appRoot, "cockpit", "index.mjs"),
    cockpitAlt: path.join(appRoot, "cockpit", "index.js"),
    recovery: path.join(appRoot, "recovery", "server.cjs"),
    startScript: path.join(appRoot, "installer", "scripts", "start-sci-os.cjs"),
    node: path.join(appRoot, "runtime", "node", "node.exe"),
    manifest: path.join(appRoot, "manifests", "golden-boot.packaged.json"),
    config: path.join(appRoot, "config", "packaged.json"),
  };
}

module.exports = { isPackagedLayout, packagedEntries, hasCockpitArtifact };
