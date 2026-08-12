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
const { loadDotEnv, validateConfig } = require("./startup/validate-config.cjs");
const { writeJson } = require("./startup/startup-report.cjs");

function openUrl(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  }
}

function main() {
  const args = process.argv.slice(2);
  const serve = args.includes("--serve");
  const noOpen = args.includes("--no-open");
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) {
    console.log(JSON.stringify({ ok: false, error: "ROOT_RESOLUTION_FAILED" }));
    process.exit(1);
  }
  const appRoot = rootRes.appRoot;
  loadDotEnv(appRoot);
  const manifestPath = path.join(appRoot, "sci-os.manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.log(JSON.stringify({ ok: false, error: "MANIFEST_MISSING" }));
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const node = resolveNodeRuntime(appRoot);
  const config = validateConfig(appRoot);
  const docker = { status: "SKIPPED_IN_CAPSULE" };
  try {
    const info = spawnSync("docker", ["info"], {
      encoding: "utf8",
      timeout: 4000,
      windowsHide: true,
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
    node: { usable: node.usable, version: node.version },
    ports: {
      backend: config.redactedConfig.apiPort,
      cockpit: config.redactedConfig.cockpitPort,
    },
    docker: docker.status,
    next: "start-sci-os.cjs",
  };
  writeJson(path.join(appRoot, "diagnostics-export"), "bootstrap-capsule-report.json", report);

  if (!node.usable) {
    console.log(JSON.stringify({ ...report, ok: false, error: "RUNTIME_MISSING" }, null, 2));
    spawn(process.execPath, [path.join(appRoot, "apps/meta-recovery-control-plane/src/server.ts")], {
      cwd: appRoot,
      detached: true,
      stdio: "ignore",
      shell: true,
    }).unref();
    if (!noOpen) openUrl("http://127.0.0.1:5299/");
    process.exit(3);
  }

  if (docker.status === "AVAILABLE") {
    spawnSync("docker", ["compose", "-f", manifest.infraProfile, "up", "-d"], {
      cwd: appRoot,
      encoding: "utf8",
      timeout: 20000,
      windowsHide: true,
    });
  }

  const startArgs = [path.join(appRoot, manifest.orchestrator), "--mode=normal"];
  if (serve) startArgs.push("--serve");
  if (noOpen) startArgs.push("--no-open");

  const r = spawnSync(process.execPath, startArgs, {
    cwd: appRoot,
    encoding: "utf8",
    env: process.env,
    stdio: "inherit",
  });

  if (r.status !== 0) {
    const shell = spawn(
      process.execPath,
      ["--import", "tsx", path.join(appRoot, "apps/meta-recovery-control-plane/src/server.ts")],
      { cwd: appRoot, detached: true, stdio: "ignore", env: process.env }
    );
    shell.unref();
    if (!noOpen) openUrl("http://127.0.0.1:5299/");
  }

  process.exit(r.status === null ? 1 : r.status);
}

main();
