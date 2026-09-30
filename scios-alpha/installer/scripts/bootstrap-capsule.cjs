"use strict";

/**
 * Bootstrap Capsule — reads sci-os.manifest.json, then hands off to
 * installer/scripts/start-sci-os.cjs. Not a second orchestrator.
 */
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { resolveAppRoot } = require("./startup/resolve-app-root.cjs");
const { resolveNodeRuntime } = require("./startup/resolve-node-runtime.cjs");
const {
  loadDotEnv,
  loadPackagedConfig,
  validateConfig,
} = require("./startup/validate-config.cjs");
const { writeJson } = require("./startup/startup-report.cjs");

function openUrl(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  }
}

function isPackaged(appRoot) {
  return (
    process.env.SCIOS_PACKAGED === "1" ||
    process.env.SCIOS_RUNTIME_MODE === "PACKAGED" ||
    fs.existsSync(path.join(appRoot, "config", "packaged.json"))
  );
}

function startRecoveryShell(appRoot, nodePath, noOpen) {
  const packagedRecovery = path.join(appRoot, "recovery", "server.cjs");
  const env = {
    ...process.env,
    SCIOS_APP_ROOT: appRoot,
    PORT: process.env.SCIOS_RECOVERY_PORT || "5299",
  };
  if (isPackaged(appRoot) && fs.existsSync(packagedRecovery)) {
    spawn(nodePath || process.execPath, [packagedRecovery], {
      cwd: appRoot,
      detached: true,
      stdio: "ignore",
      shell: false,
      env: { ...env, SCIOS_PACKAGED: "1", SCIOS_RUNTIME_MODE: "PACKAGED" },
    }).unref();
    if (!noOpen) openUrl("http://127.0.0.1:5299/");
    return { ok: true, entry: packagedRecovery };
  }
  // DEVELOPMENT fallback only
  const devEntry = path.join(
    appRoot,
    "apps/meta-recovery-control-plane/src/server.ts"
  );
  if (!fs.existsSync(devEntry)) {
    return { ok: false, error: "RECOVERY_ENTRY_MISSING" };
  }
  spawn(process.execPath, ["--import", "tsx", devEntry], {
    cwd: appRoot,
    detached: true,
    stdio: "ignore",
    shell: false,
    env,
  }).unref();
  if (!noOpen) openUrl("http://127.0.0.1:5299/");
  return { ok: true, entry: devEntry, mode: "DEVELOPMENT" };
}

function main() {
  const args = process.argv.slice(2);
  const serve = args.includes("--serve");
  const noOpen = args.includes("--no-open");
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) {
    console.log(JSON.stringify({ ok: false, error: "ROOT_RESOLUTION_FAILED" }));
    process.exit(3);
  }
  const appRoot = rootRes.appRoot;
  const packaged = isPackaged(appRoot);
  if (packaged) {
    process.env.SCIOS_PACKAGED = "1";
    process.env.SCIOS_RUNTIME_MODE = process.env.SCIOS_RUNTIME_MODE || "PACKAGED";
    try {
      loadPackagedConfig(appRoot);
    } catch {
      /* validateConfig will surface */
    }
  } else {
    loadDotEnv(appRoot);
  }

  const manifestPath = path.join(appRoot, "sci-os.manifest.json");
  const goldenPath = path.join(appRoot, "manifests", "golden-boot.packaged.json");
  if (!fs.existsSync(manifestPath) && !fs.existsSync(goldenPath)) {
    console.log(JSON.stringify({ ok: false, error: "MANIFEST_MISSING" }));
    process.exit(2);
  }
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : { id: "SCI_OS_X10", orchestrator: "installer/scripts/start-sci-os.cjs" };

  const node = resolveNodeRuntime(appRoot, { packaged });
  const config = validateConfig(appRoot, { packaged });
  const docker = { status: "SKIPPED_IN_CAPSULE" };
  try {
    const info = spawnSync("docker", ["info"], {
      encoding: "utf8",
      timeout: 4000,
      windowsHide: true,
      shell: false,
    });
    docker.status = info.status === 0 ? "AVAILABLE" : "ENGINE_STOPPED";
  } catch {
    docker.status = "ENGINE_UNREACHABLE";
  }

  const report = {
    at: new Date().toISOString(),
    capsule: "BootstrapCapsule",
    manifestId: manifest.id,
    mode: manifest.mode,
    profile: manifest.profile,
    root: appRoot,
    packaged,
    node: { usable: node.usable, version: node.version, source: node.source },
    ports: {
      backend: config.redactedConfig?.apiPort,
      cockpit: config.redactedConfig?.cockpitPort,
    },
    docker: docker.status,
    next: "start-sci-os.cjs",
  };
  writeJson(path.join(appRoot, "diagnostics-export"), "bootstrap-capsule-report.json", report);

  if (!node.usable) {
    console.log(JSON.stringify({ ...report, ok: false, error: "RUNTIME_MISSING" }, null, 2));
    startRecoveryShell(appRoot, node.path, noOpen);
    process.exit(3);
  }

  if (docker.status === "AVAILABLE" && manifest.infraProfile && !packaged) {
    spawnSync("docker", ["compose", "-f", manifest.infraProfile, "up", "-d"], {
      cwd: appRoot,
      encoding: "utf8",
      timeout: 20000,
      windowsHide: true,
      shell: false,
    });
  }

  const orchestrator =
    manifest.orchestrator || "installer/scripts/start-sci-os.cjs";
  const startArgs = [path.join(appRoot, orchestrator), "--mode=normal"];
  if (serve) startArgs.push("--serve");
  if (noOpen) startArgs.push("--no-open");
  if (packaged) startArgs.push("--packaged");

  const nodeBin = node.usable && node.path ? node.path : process.execPath;
  const r = spawnSync(nodeBin, startArgs, {
    cwd: appRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      SCIOS_APP_ROOT: appRoot,
    },
    stdio: "inherit",
    shell: false,
  });

  if (r.status !== 0) {
    startRecoveryShell(appRoot, nodeBin, noOpen);
  }

  process.exit(r.status === null ? 2 : r.status);
}

main();
