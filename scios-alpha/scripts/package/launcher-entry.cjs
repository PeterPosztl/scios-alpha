#!/usr/bin/env node
"use strict";

/**
 * Packaged launcher entry for pkg → SCI-OS-X10.exe
 * Thin wrapper: bundled Node 20.18.1 → start-sci-os --packaged --serve
 * Validates required file SHA256 against golden-boot.packaged.json
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function findRoot() {
  const here = process.pkg
    ? path.dirname(process.execPath)
    : path.resolve(__dirname, "../../dist/SCI-OS-X10");
  if (fs.existsSync(path.join(here, "runtime", "node", "node.exe"))) return here;
  if (fs.existsSync(path.join(here, "payload", "runtime", "node", "node.exe"))) {
    return path.join(here, "payload");
  }
  return here;
}

function validateHashes(root) {
  const manPath = path.join(root, "manifests", "golden-boot.packaged.json");
  if (!fs.existsSync(manPath)) {
    return { ok: false, error: "PACKAGED_MANIFEST_MISSING", path: manPath };
  }
  let man;
  try {
    man = JSON.parse(fs.readFileSync(manPath, "utf8"));
  } catch (e) {
    return { ok: false, error: "PACKAGED_MANIFEST_INVALID", detail: String(e.message || e) };
  }
  const hashes = man.requiredFileHashes || {};
  const files = man.requiredFiles || Object.keys(hashes);
  if (!files.length) {
    return { ok: false, error: "PACKAGED_MANIFEST_EMPTY" };
  }
  for (const rel of files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      return { ok: false, error: "REQUIRED_FILE_MISSING", file: rel };
    }
    const expected = hashes[rel];
    if (!expected) continue;
    const actual = sha256(abs);
    if (actual !== expected) {
      return {
        ok: false,
        error: "REQUIRED_FILE_HASH_MISMATCH",
        file: rel,
        expected,
        actual,
      };
    }
  }
  // Bundled Node version contract
  return { ok: true, buildId: man.buildId || null, filesChecked: files.length };
}

function main() {
  const root = findRoot();
  const node = path.join(root, "runtime", "node", "node.exe");
  const start = path.join(root, "installer", "scripts", "start-sci-os.cjs");

  console.log(
    JSON.stringify({
      app: "SCI OS ×10",
      packaged: true,
      root,
      node,
      label: "ALPHA_NON_PRODUCTION",
    })
  );

  if (!fs.existsSync(node)) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "BUNDLED_RUNTIME_MISSING",
        path: node,
        userMessage:
          "SCI OS cannot start — application runtime is missing. Reinstall from Setup.exe.",
      })
    );
    process.exit(2);
  }
  if (!fs.existsSync(start)) {
    console.error(
      JSON.stringify({ ok: false, error: "START_SCRIPT_MISSING", path: start })
    );
    process.exit(2);
  }

  const hv = validateHashes(root);
  if (!hv.ok) {
    console.error(JSON.stringify(hv));
    process.exit(2);
  }

  // Verify bundled Node version via child (launcher itself may be pkg Node18 wrapper)
  const { spawnSync } = require("child_process");
  const ver = spawnSync(node, ["--version"], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  const version = String(ver.stdout || "").trim();
  if (version !== "v20.18.1") {
    console.error(
      JSON.stringify({
        ok: false,
        error: "BUNDLED_NODE_VERSION_MISMATCH",
        expected: "v20.18.1",
        actual: version || null,
      })
    );
    process.exit(2);
  }

  // Browser handoff owned by start-sci-os after VERIFY_HOME — no --no-open deadlock
  const child = spawn(
    node,
    [start, "--serve", "--packaged", ...process.argv.slice(2)],
    {
      cwd: root,
      env: {
        ...process.env,
        SCIOS_APP_ROOT: root,
        SCIOS_RUNTIME_MODE: "PACKAGED",
        SCI_RUNTIME_PROFILE: "packaged",
        SCIOS_BOOT_SERVE: "1",
        SCIOS_PACKAGED: "1",
      },
      stdio: "inherit",
      windowsHide: false,
      shell: false,
    }
  );

  child.on("exit", (code) => {
    process.exit(code ?? 2);
  });
}

main();
