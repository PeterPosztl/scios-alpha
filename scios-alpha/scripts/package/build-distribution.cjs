#!/usr/bin/env node
"use strict";

/**
 * Build SCI OS ×10 packaged distribution (NO Electron — extend existing pkg + bundled Node).
 * Output: dist/SCI-OS-X10/ + dist/release/Setup payload
 * Build-time may use pnpm/esbuild; runtime must not.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const { spawnSync, execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "dist", "SCI-OS-X10");
const RELEASE = path.join(ROOT, "dist", "release");
const NODE_VERSION = process.env.SCIOS_BUNDLE_NODE_VERSION || "20.18.1";
const NODE_DIST = `node-v${NODE_VERSION}-win-x64`;
const NODE_ZIP = `${NODE_DIST}.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDir(src, dst) {
  ensureDir(dst);
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    encoding: "utf8",
    shell: opts.shell === true,
    env: { ...process.env, ...(opts.env || {}) },
    stdio: opts.stdio || "pipe",
  });
  if (r.status !== 0 && !opts.allowFail) {
    const err = (r.stderr || r.stdout || "").slice(-2000);
    throw new Error(`${cmd} ${args.join(" ")} failed: ${err}`);
  }
  return r;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const file = fs.createWriteStream(dest);
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`download ${url} → ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(dest)));
      })
      .on("error", reject);
  });
}

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "UNAVAILABLE";
  }
}

async function ensureBundledNode() {
  const cache = path.join(ROOT, "dist", "cache");
  const zipPath = path.join(cache, NODE_ZIP);
  const extractDir = path.join(cache, NODE_DIST);
  const targetNode = path.join(OUT, "runtime", "node", "node.exe");

  if (fs.existsSync(targetNode)) {
    return { path: targetNode, reused: true, version: NODE_VERSION };
  }

  if (!fs.existsSync(zipPath)) {
    console.log(JSON.stringify({ step: "download_node", url: NODE_URL }));
    await download(NODE_URL, zipPath);
  }

  if (!fs.existsSync(path.join(extractDir, "node.exe"))) {
    ensureDir(extractDir);
    // Expand-Archive via PowerShell
    const ps = `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${cache.replace(/'/g, "''")}' -Force`;
    run("powershell", ["-NoProfile", "-Command", ps], { shell: false });
  }

  ensureDir(path.join(OUT, "runtime", "node"));
  const srcNode = path.join(extractDir, "node.exe");
  if (!fs.existsSync(srcNode)) {
    throw new Error(`node.exe missing after extract: ${srcNode}`);
  }
  // Copy node.exe + critical DLLs from the dist folder
  for (const f of fs.readdirSync(extractDir)) {
    const s = path.join(extractDir, f);
    if (fs.statSync(s).isFile()) {
      copyFile(s, path.join(OUT, "runtime", "node", f));
    }
  }
  return { path: targetNode, reused: false, version: NODE_VERSION };
}

function ensureEsbuild() {
  try {
    require.resolve("esbuild");
    return require("esbuild");
  } catch {
    // Pinned workspace dependency required — no release-time npx download
    return null;
  }
}

async function bundleBackend() {
  const outfile = path.join(OUT, "backend", "server.cjs");
  ensureDir(path.dirname(outfile));
  console.log(JSON.stringify({ step: "bundle_backend", outfile }));
  const esbuild = ensureEsbuild();
  if (!esbuild) {
    throw new Error("BUILD_TOOLCHAIN_INCOMPLETE: esbuild required for backend bundle");
  }
  await esbuild.build({
    entryPoints: [path.join(ROOT, "apps/control-plane-api/src/server.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    outfile,
    sourcemap: false,
    logLevel: "warning",
    packages: "bundle",
    external: [],
  });
  return outfile;
}

async function bundleRecovery() {
  const src = path.join(ROOT, "apps/meta-recovery-control-plane/src/server.ts");
  const outfile = path.join(OUT, "recovery", "server.cjs");
  if (!fs.existsSync(src)) {
    console.log(JSON.stringify({ step: "bundle_recovery", skipped: true, reason: "SRC_MISSING" }));
    return null;
  }
  ensureDir(path.dirname(outfile));
  console.log(JSON.stringify({ step: "bundle_recovery", outfile }));
  const esbuild = ensureEsbuild();
  if (!esbuild) {
    throw new Error("BUILD_TOOLCHAIN_INCOMPLETE: esbuild required for recovery bundle");
  }
  await esbuild.build({
    entryPoints: [src],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    outfile,
    sourcemap: false,
    logLevel: "warning",
    packages: "bundle",
    external: [],
  });
  return outfile;
}

function hashFileOrNull(p) {
  return fs.existsSync(p) ? sha256(p) : null;
}

function hashTreeSample(relRoots) {
  const h = crypto.createHash("sha256");
  for (const rel of relRoots) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const walk = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".git") {
            continue;
          }
          walk(p);
        } else if (/\.(cjs|js|mjs|ts|json)$/i.test(ent.name)) {
          h.update(path.relative(ROOT, p).split(path.sep).join("/"));
          h.update(fs.readFileSync(p));
        }
      }
    };
    if (fs.statSync(abs).isDirectory()) walk(abs);
    else {
      h.update(rel);
      h.update(fs.readFileSync(abs));
    }
  }
  return h.digest("hex");
}

function writeBuildIdentity(buildId, sha, manifest) {
  const identity = {
    schema: "sci-os-build-identity/v1",
    label: "ALPHA_NON_PRODUCTION",
    buildId,
    gitSha: sha,
    timestamp: new Date().toISOString(),
    nodeRuntime: NODE_VERSION,
    treeHash: hashTreeSample([
      "installer/scripts",
      "apps/control-plane-api/src",
      "apps/cockpit-ui/src",
      "apps/meta-recovery-control-plane/src",
      "scripts/package",
      "sci-os.manifest.json",
      "package.json",
    ]),
    packageHash: hashFileOrNull(path.join(ROOT, "package.json")),
    lockfileHash: hashFileOrNull(path.join(ROOT, "pnpm-lock.yaml")),
    manifestHash: hashFileOrNull(path.join(ROOT, "sci-os.manifest.json")),
    packagedManifestHash: manifest
      ? crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex")
      : null,
  };
  writeJson(path.join(OUT, "manifests", "build-identity.json"), identity);
  writeJson(
    path.join(ROOT, "diagnostics-export", "cursor-repair", "build-identity.json"),
    identity
  );
  return identity;
}

function writeSourceDistParity(info) {
  const critical = [
    "installer/scripts/start-sci-os.cjs",
    "installer/scripts/startup/resolve-runtime-entries.cjs",
    "installer/scripts/startup/resolve-app-root.cjs",
    "installer/scripts/startup/resolve-node-runtime.cjs",
    "installer/scripts/startup/transactional-boot.cjs",
    "installer/scripts/startup/desired-state.cjs",
    "apps/cockpit-ui/src/index.js",
    "sci-os.manifest.json",
  ];
  const files = [];
  for (const rel of critical) {
    const src = path.join(ROOT, rel);
    const distRel =
      rel === "apps/cockpit-ui/src/index.js"
        ? "cockpit/index.mjs"
        : rel.startsWith("installer/") || rel === "sci-os.manifest.json"
          ? rel
          : null;
    const dist = distRel ? path.join(OUT, distRel) : null;
    const srcHash = fs.existsSync(src) ? sha256(src) : null;
    const distHash = dist && fs.existsSync(dist) ? sha256(dist) : null;
    const cockpitBundled = rel === "apps/cockpit-ui/src/index.js" && !!distHash;
    files.push({
      source: rel,
      dist: distRel,
      sourceSha256: srcHash,
      distSha256: distHash,
      match: cockpitBundled
        ? true
        : distRel
          ? !!(srcHash && distHash && srcHash === distHash)
          : null,
      note: cockpitBundled ? "cockpit_esbuild_bundle" : null,
    });
  }
  const artifacts = {
    backend: info.backend && fs.existsSync(info.backend) ? sha256(info.backend) : null,
    cockpit: info.cockpit && fs.existsSync(info.cockpit) ? sha256(info.cockpit) : null,
    recovery:
      info.recovery && fs.existsSync(info.recovery) ? sha256(info.recovery) : null,
    node:
      info.nodeInfo && info.nodeInfo.path && fs.existsSync(info.nodeInfo.path)
        ? sha256(info.nodeInfo.path)
        : null,
  };
  const parity = {
    schema: "sci-os-source-dist-parity/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    buildId: info.buildId,
    gitSha: info.sha,
    sourceRoot: ROOT,
    distRoot: OUT,
    files,
    artifacts,
    ok: files.every((f) => f.match !== false),
  };
  writeJson(
    path.join(ROOT, "diagnostics-export", "cursor-repair", "source-dist-parity.json"),
    parity
  );
  writeJson(path.join(OUT, "manifests", "source-dist-parity.json"), parity);
  return parity;
}


async function packageCockpit() {
  const src = path.join(ROOT, "apps/cockpit-ui/src/index.js");
  const dst = path.join(OUT, "cockpit", "index.mjs");
  ensureDir(path.dirname(dst));
  console.log(JSON.stringify({ step: "bundle_cockpit", outfile: dst }));
  const esbuild = ensureEsbuild();
  if (!esbuild) {
    throw new Error("BUILD_TOOLCHAIN_INCOMPLETE: esbuild required for cockpit bundle");
  }
  await esbuild.build({
    entryPoints: [src],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: dst,
    sourcemap: false,
    logLevel: "warning",
    packages: "bundle",
  });
  // Compatibility alias for resolvers that prefer index.js
  copyFile(dst, path.join(OUT, "cockpit", "index.js"));
  writeJson(path.join(OUT, "cockpit", "package.json"), {
    name: "@scios/cockpit-ui-packaged",
    private: true,
    type: "module",
    main: "./index.mjs",
  });
  return dst;
}

function listJsFiles(dir, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listJsFiles(abs, base));
    else if (/\.(cjs|js|mjs)$/i.test(ent.name)) {
      out.push(path.relative(base, abs).split(path.sep).join("/"));
    }
  }
  return out;
}

/**
 * Stage complete installer runtime closure (not a fragile incomplete list).
 * Always includes transactional-boot, desired-state, shell-readiness, runtime-services.
 */
function copyInstallerScripts() {
  const roots = [
    "installer/scripts/start-sci-os.cjs",
    "installer/scripts/bootstrap-capsule.cjs",
    "installer/scripts/shutdown-sci-os.cjs",
    "installer/scripts/repair-sci-os.cjs",
  ];
  for (const rel of roots) {
    const src = path.join(ROOT, rel);
    if (fs.existsSync(src)) copyFile(src, path.join(OUT, rel));
  }
  // Full startup + convergence trees — dependency closure for canonical boot
  for (const tree of ["installer/scripts/startup", "installer/scripts/convergence"]) {
    const srcTree = path.join(ROOT, tree);
    if (fs.existsSync(srcTree)) copyDir(srcTree, path.join(OUT, tree));
  }
  copyFile(
    path.join(ROOT, "bootstrap/bootstrap-capsule.js"),
    path.join(OUT, "bootstrap/bootstrap-capsule.js")
  );
}

/**
 * Fail packaging if any staged .cjs/.js relative require/import points at a missing file.
 */
function verifyPackageClosure() {
  const scriptRoots = [
    path.join(OUT, "installer", "scripts"),
    path.join(OUT, "backend"),
    path.join(OUT, "cockpit"),
  ];
  const missing = [];
  const checked = [];
  const requireRe =
    /(?:require\s*\(\s*|from\s+)["'](\.[^"']+)["']/g;

  for (const root of scriptRoots) {
    if (!fs.existsSync(root)) continue;
    for (const rel of listJsFiles(root)) {
      const abs = path.join(root, rel);
      const text = fs.readFileSync(abs, "utf8");
      let m;
      requireRe.lastIndex = 0;
      while ((m = requireRe.exec(text))) {
        const spec = m[1];
        // Only relative module paths
        if (!spec.startsWith(".")) continue;
        const baseDir = path.dirname(abs);
        const candidates = [
          path.resolve(baseDir, spec),
          path.resolve(baseDir, spec + ".cjs"),
          path.resolve(baseDir, spec + ".js"),
          path.resolve(baseDir, spec + ".mjs"),
          path.resolve(baseDir, spec, "index.cjs"),
          path.resolve(baseDir, spec, "index.js"),
        ];
        const found = candidates.some((c) => fs.existsSync(c));
        checked.push({ from: path.relative(OUT, abs), spec, found });
        if (!found) {
          missing.push({
            from: path.relative(OUT, abs).split(path.sep).join("/"),
            spec,
          });
        }
      }
    }
  }

  const evidence = {
    schema: "sci-os-package-closure/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    checked: checked.length,
    missing,
    ok: missing.length === 0,
  };
  writeJson(
    path.join(ROOT, "diagnostics-export", "cursor-repair", "package-closure.json"),
    evidence
  );
  writeJson(path.join(OUT, "manifests", "package-closure.json"), evidence);
  if (missing.length) {
    throw new Error(
      `PACKAGED_RUNTIME_CLOSURE_INCOMPLETE: ${missing
        .map((x) => `${x.from} → ${x.spec}`)
        .join("; ")}`
    );
  }
  return evidence;
}

function writeManifests(buildId, sha) {
  const backend = "backend/server.cjs";
  const cockpit = "cockpit/index.js";
  const nodeRel = "runtime/node/node.exe";
  const required = [
    backend,
    "cockpit/index.mjs",
    "recovery/server.cjs",
    nodeRel,
    "installer/scripts/start-sci-os.cjs",
    "installer/scripts/startup/transactional-boot.cjs",
    "installer/scripts/startup/desired-state.cjs",
    "installer/scripts/startup/runtime-services.cjs",
    "SCI OS X10.cmd",
  ];
  const hashes = {};
  for (const rel of required) {
    const abs = path.join(OUT, rel);
    if (fs.existsSync(abs)) hashes[rel] = sha256(abs);
  }

  const manifest = {
    schema: "sci-os-golden-boot-packaged/v1",
    applicationVersion: "0.1.0-alpha",
    buildId,
    gitSha: sha,
    runtimeMode: "PACKAGED",
    installRoot: ".",
    runtimeNode: nodeRel,
    backendEntry: backend,
    recoveryEntry: "recovery/server.cjs",
    workerEntries: ["embedded-foundation-worker"],
    cockpitAssets: "cockpit/index.mjs",
    requiredFiles: Object.keys(hashes),
    requiredFileHashes: hashes,
    servicePorts: { backend: 3000, cockpit: 4000, recoveryShell: 5299 },
    startupOrder: ["runtime", "backend", "workers", "cockpit", "readiness", "ui"],
    shutdownOrder: ["cockpit", "backend", "workers"],
    healthChecks: [
      "http://127.0.0.1:3000/healthz",
      "http://127.0.0.1:3000/readyz",
      "http://127.0.0.1:4000/healthz",
    ],
    readinessChecks: ["worker-smoke", "vertical-slice-http"],
    migrationVersion: "alpha-0",
    requiredCapabilities: [
      "control-plane-api",
      "vertical-slice.foundation",
      "cockpit.professional-view",
    ],
    optionalCapabilities: ["postgresql", "redis", "electron-desktop"],
    label: "ALPHA_NON_PRODUCTION",
  };
  writeJson(path.join(OUT, "manifests", "golden-boot.packaged.json"), manifest);
  writeJson(path.join(OUT, "installer", "golden-boot.manifest.json"), {
    ...manifest,
    note: "Packaged copy — paths relative to installRoot",
  });
  return manifest;
}

function writeConfig() {
  writeJson(path.join(OUT, "config", "packaged.json"), {
    schema: "sci-os-packaged-config/v1",
    profile: "PACKAGED",
    bundledRuntime: {
      nodeVersion: "20.18.1",
      acceptMajor: [20],
      requireMinor: 18,
      path: "runtime/node/node.exe",
    },
    env: {
      SCIOS_RUNTIME_MODE: "PACKAGED",
      SCIOS_PACKAGED: "1",
      SCI_RUNTIME_PROFILE: "packaged",
      SCIOS_API_PORT: "3000",
      SCIOS_COCKPIT_PORT: "4000",
      PORT: "3000",
      EXECUTION_MODE: "SIMULATION_ONLY",
      AUTH_MODE: "local-packaged",
      TELEMETRY_MODE: "local",
      GOVERNANCE_MODE: "embedded-foundation",
    },
    userDataHint: "%LOCALAPPDATA%\\SCI OS X10\\data",
    note: "No developer .env loaded in PACKAGED mode",
  });
}

function writePackageJson(buildId) {
  writeJson(path.join(OUT, "package.json"), {
    name: "sci-os-x10",
    version: "0.1.0-alpha",
    private: true,
    description: "SCI OS ×10 packaged install root (ALPHA_NON_PRODUCTION)",
    label: "ALPHA_NON_PRODUCTION",
    sciOs: {
      layout: "PACKAGED",
      runtime: "20.18.1",
      buildId: buildId || "unknown",
    },
  });
}

function writeCmdLauncher() {
  // Double-clickable Windows launcher — does not use system Node/pnpm
  const cmd = `@echo off
setlocal
set "INSTALL_ROOT=%~dp0"
set "SCIOS_APP_ROOT=%INSTALL_ROOT%"
set "SCIOS_RUNTIME_MODE=PACKAGED"
set "SCI_RUNTIME_PROFILE=packaged"
set "SCIOS_BOOT_SERVE=1"
set "NODE=%INSTALL_ROOT%runtime\\node\\node.exe"
if not exist "%NODE%" (
  echo Bundled Node runtime missing: %NODE%
  echo SCI OS cannot start without its application-managed runtime.
  pause
  exit /b 1
)
REM Browser handoff is owned by start-sci-os.cjs after VERIFY_HOME (do not --no-open then wait for exit).
"%NODE%" "%INSTALL_ROOT%installer\\scripts\\start-sci-os.cjs" --serve --packaged
set "SCI_EXIT=%ERRORLEVEL%"
if "%SCI_EXIT%"=="0" exit /b 0
if "%SCI_EXIT%"=="2" (
  echo Internal startup blocker. See diagnostics-export\\startup-report.json
  pause
  exit /b 2
)
if "%SCI_EXIT%"=="3" (
  echo External environment blocker. See diagnostics-export\\startup-report.json
  pause
  exit /b 3
)
echo Process ended with code %SCI_EXIT%. If Home was already usable, this may be a forced stop — check shutdown-report.json
pause
exit /b %SCI_EXIT%
`;
  fs.writeFileSync(path.join(OUT, "SCI OS X10.cmd"), cmd);
  // Also ASCII-safe name for tooling
  fs.writeFileSync(path.join(OUT, "SCI-OS-X10.cmd"), cmd);
}

function writePreparingUiNote() {
  writeJson(path.join(OUT, "assets", "first-launch.json"), {
    title: "SCI OS ×10",
    stages: [
      "Checking installation",
      "Starting core services",
      "Starting analysis engine",
      "Starting workers",
      "Checking data services",
      "Checking risk and policy",
      "Verifying system",
    ],
    readyMessage: "READY",
  });
}

async function main() {
  console.log(JSON.stringify({ step: "clean_out", out: OUT }));
  fs.rmSync(OUT, { recursive: true, force: true });
  ensureDir(OUT);

  const buildId = `pkg_${Date.now()}`;
  const sha = gitSha();

  const nodeInfo = await ensureBundledNode();
  const backend = await bundleBackend();
  const recovery = await bundleRecovery();
  const cockpit = await packageCockpit();
  copyInstallerScripts();
  // Manifest authority for ports/identity
  if (fs.existsSync(path.join(ROOT, "sci-os.manifest.json"))) {
    copyFile(
      path.join(ROOT, "sci-os.manifest.json"),
      path.join(OUT, "sci-os.manifest.json")
    );
  }
  writeConfig();
  writePackageJson(buildId);
  writeCmdLauncher();
  writePreparingUiNote();
  const manifest = writeManifests(buildId, sha);
  const identity = writeBuildIdentity(buildId, sha, manifest);
  manifest.buildIdentity = {
    buildId: identity.buildId,
    treeHash: identity.treeHash,
    packageHash: identity.packageHash,
    lockfileHash: identity.lockfileHash,
    manifestHash: identity.manifestHash,
  };
  writeJson(path.join(OUT, "manifests", "golden-boot.packaged.json"), manifest);
  verifyPackageClosure();
  writeSourceDistParity({ buildId, sha, backend, cockpit, recovery, nodeInfo });

  // Stage launcher source next to install root (EXE build consumes this)
  copyFile(
    path.join(ROOT, "scripts/package/launcher-entry.cjs"),
    path.join(OUT, "launcher-entry.cjs")
  );
  copyFile(
    path.join(ROOT, "scripts/package/atomic-install.cjs"),
    path.join(OUT, "installer", "scripts", "atomic-install.cjs")
  );

  // Thin EXE wrapper (pkg may be Node18) → always hands off to bundled Node 20.18.1
  const exeOut = path.join(OUT, "SCI-OS-X10.exe");
  try {
    const pkgTry = run(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      [
        "exec",
        "pkg",
        "scripts/package/launcher-entry.cjs",
        "--targets",
        "node18-win-x64",
        "--output",
        exeOut,
      ],
      { allowFail: true, shell: false, stdio: "inherit" }
    );
    console.log(
      JSON.stringify({
        step: "pkg_exe",
        out: exeOut,
        ok: pkgTry.status === 0 && fs.existsSync(exeOut),
        note:
          pkgTry.status === 0
            ? "thin_wrapper_node18_to_bundled_node20"
            : "CMD launcher remains compatibility fallback",
      })
    );
  } catch (e) {
    console.log(
      JSON.stringify({
        step: "pkg_exe",
        ok: false,
        error: String(e.message || e),
        note: "CMD launcher remains compatibility fallback",
      })
    );
  }

  if (!fs.existsSync(exeOut)) {
    const thin = spawnSync(
      process.execPath,
      [path.join(ROOT, "scripts/package/write-thin-exe-launcher.cjs")],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: { ...process.env, SCIOS_THIN_EXE_DIR: OUT },
        windowsHide: true,
      }
    );
    console.log(
      JSON.stringify({
        step: "thin_exe_fallback",
        ok: fs.existsSync(exeOut),
        status: thin.status,
        note: "CSC thin wrapper delegates to SCI-OS-X10.cmd; not a second boot SM",
      })
    );
  }

  // Release payload for Setup
  ensureDir(RELEASE);
  const payload = path.join(RELEASE, "payload");
  fs.rmSync(payload, { recursive: true, force: true });
  copyDir(OUT, payload);

  writeJson(path.join(ROOT, "diagnostics-export", "packaging", "03-production-build-proof.json"), {
    at: new Date().toISOString(),
    ok: true,
    buildId,
    gitSha: sha,
    out: OUT.replace(/\\/g, "/"),
    backend,
    cockpit,
    node: nodeInfo,
    backendBytes: fs.statSync(backend).size,
    cockpitBytes: fs.statSync(cockpit).size,
    note: "Production artifacts built; runtime must not invoke pnpm",
  });

  writeJson(path.join(ROOT, "diagnostics-export", "packaging", "04-manifest-proof.json"), {
    at: new Date().toISOString(),
    ok: true,
    manifest,
  });

  writeJson(path.join(ROOT, "diagnostics-export", "packaging", "02-runtime-bundle-proof.json"), {
    at: new Date().toISOString(),
    ok: fs.existsSync(nodeInfo.path),
    nodeVersion: NODE_VERSION,
    nodePath: nodeInfo.path.replace(/\\/g, "/"),
    source: "bundled",
    sha256: fs.existsSync(nodeInfo.path) ? sha256(nodeInfo.path) : null,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        buildId,
        backend,
        node: nodeInfo.path,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
