"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { resolveAppRoot } = require("./startup/resolve-app-root.cjs");
const { resolveNodeRuntime } = require("./startup/resolve-node-runtime.cjs");
const { resolveRuntimeEntries } = require("./startup/resolve-runtime-entries.cjs");
const { validateConfig } = require("./startup/validate-config.cjs");
const { classifyDocker } = require("./startup/classify-docker.cjs");
const { ensurePostgres } = require("./startup/ensure-postgres.cjs");
const { ensureRedis } = require("./startup/ensure-redis.cjs");
const { migrationGate } = require("./startup/migration-gate.cjs");
const { acquireProcessLock, releaseProcessLock, lockPath } = require("./startup/process-lock.cjs");

async function main() {
  const actions = [];
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) {
    console.log(JSON.stringify({ verdict: "NO_GO", error: "ROOT_RESOLUTION_FAILED" }));
    process.exit(1);
  }
  const appRoot = rootRes.appRoot;
  const diag = path.join(appRoot, "diagnostics-export");
  fs.mkdirSync(diag, { recursive: true });

  const node = resolveNodeRuntime(appRoot);
  actions.push({
    problem: "runtime",
    action: "resolve_node",
    result: node.usable ? "ok" : "failed",
    residualRisk: node.usable ? "none" : "high",
  });

  const entries = resolveRuntimeEntries(appRoot);
  actions.push({
    problem: "entries",
    action: "resolve_entries",
    result: entries.ok ? "ok" : "failed",
    residualRisk: entries.ok ? "none" : "high",
  });

  const config = validateConfig(appRoot);
  actions.push({
    problem: "config",
    action: "validate_config",
    result: config.valid ? "ok" : "failed",
    residualRisk: "low",
  });

  const docker = classifyDocker();
  actions.push({
    problem: "docker",
    action: "classify",
    result: docker.status,
    residualRisk: docker.status === "AVAILABLE" ? "none" : "medium",
    nextAction: docker.nextAction,
  });

  const postgres = ensurePostgres();
  const redis = await ensureRedis();
  const migrations = migrationGate();

  // clear proven stale locks
  const lp = lockPath(appRoot);
  if (fs.existsSync(lp)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lp, "utf8"));
      let alive = false;
      try {
        process.kill(lock.pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
      if (!alive) {
        fs.unlinkSync(lp);
        actions.push({
          problem: "stale_lock",
          action: "remove",
          result: "ok",
          changed: [lp],
          residualRisk: "none",
        });
      }
    } catch (e) {
      actions.push({ problem: "lock", action: "inspect", result: String(e), residualRisk: "low" });
    }
  }

  // rebuild + fixture repair via leaf boot (no recursion into start-sci-os)
  const bootRepair = spawnSync(
    process.execPath,
    [path.join(appRoot, "scripts/boot/index.mjs"), "repair"],
    { cwd: appRoot, encoding: "utf8", shell: false }
  );
  actions.push({
    problem: "alpha_known_issues",
    action: "scripts/boot/index.mjs repair",
    result: bootRepair.status === 0 ? "ok" : "failed",
    residualRisk: "low",
    rollback: "git checkout diagnostics / fixtures",
  });

  const report = {
    at: new Date().toISOString(),
    appRoot,
    node,
    entries: entries.entries,
    config,
    docker,
    postgres,
    redis,
    migrations,
    actions,
    verdict:
      node.usable && entries.ok && config.valid && bootRepair.status === 0
        ? "REPAIR_OK"
        : "REPAIR_INCOMPLETE",
    enterpriseClaim: false,
  };

  fs.writeFileSync(path.join(diag, "repair-report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        verdict: report.verdict,
        actions: actions.length,
        report: path.join(diag, "repair-report.json"),
      },
      null,
      2
    )
  );
  process.exit(report.verdict === "REPAIR_OK" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
