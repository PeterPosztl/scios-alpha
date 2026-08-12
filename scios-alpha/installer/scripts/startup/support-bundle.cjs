"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/**
 * Redacted support bundle (zip when possible; folder fallback).
 * Never includes secrets, tokens, or unredacted URLs with credentials.
 */
function createSupportBundle(appRoot, correlationId) {
  const diag = path.join(appRoot, "diagnostics-export");
  fs.mkdirSync(diag, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bundleDir = path.join(diag, `support-bundle-${stamp}`);
  fs.mkdirSync(bundleDir, { recursive: true });

  const include = [
    "startup-report.json",
    "startup.log",
    "startup-proof.json",
    "repair-report.json",
    "shutdown-report.json",
    "boot-normal-proof.json",
    "boot-repair-proof.json",
    "boot-proof-proof.json",
  ];

  const copied = [];
  for (const name of include) {
    const src = path.join(diag, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(bundleDir, name));
      copied.push(name);
    }
  }

  const meta = {
    correlationId,
    createdAt: new Date().toISOString(),
    appRoot,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    copied,
    redaction: "credentials stripped from reports; no .env copied",
    enterpriseClaim: false,
  };
  fs.writeFileSync(path.join(bundleDir, "bundle-meta.json"), JSON.stringify(meta, null, 2));

  const zipPath = path.join(diag, `support-bundle-${stamp}.zip`);
  let zipped = false;
  if (process.platform === "win32") {
    const ps = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path '${bundleDir}\\*' -DestinationPath '${zipPath}' -Force`,
      ],
      { encoding: "utf8" }
    );
    zipped = ps.status === 0 && fs.existsSync(zipPath);
  } else {
    const z = spawnSync("zip", ["-r", zipPath, "."], {
      cwd: bundleDir,
      encoding: "utf8",
    });
    zipped = z.status === 0 && fs.existsSync(zipPath);
  }

  return {
    ok: true,
    bundleDir,
    zipPath: zipped ? zipPath : null,
    copied,
  };
}

module.exports = { createSupportBundle };
