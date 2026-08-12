"use strict";

/**
 * ci:startup-convergence-gate — P0 last-mile gate.
 */
const path = require("path");
const { spawnSync } = require("child_process");
const { resolveAppRoot } = require("../startup/resolve-app-root.cjs");
const { writeJson } = require("./lib.cjs");

function run(appRoot, cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: appRoot,
    encoding: "utf8",
    shell: true,
    env: {
      ...process.env,
      SCI_RUNTIME_PROFILE: "local-foundation",
      EXECUTION_MODE: "SIMULATION_ONLY",
      AUTH_MODE: "local-development",
      TELEMETRY_MODE: "local",
      GOVERNANCE_MODE: "embedded-foundation",
    },
  });
  return { status: r.status ?? 1, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function main() {
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) process.exit(1);
  const appRoot = rootRes.appRoot;
  const steps = [];

  // 1 status / inventory via proof
  let r = run(appRoot, "node", [
    path.join(appRoot, "installer/scripts/convergence/startup-proof.cjs"),
  ]);
  steps.push({ step: "startup_proof_1", exit: r.status, stdoutTail: r.stdout.slice(-400) });

  // 2 stop
  r = run(appRoot, "node", [
    path.join(appRoot, "installer/scripts/convergence/stop.cjs"),
  ]);
  steps.push({ step: "graceful_stop", exit: r.status });

  // 3 second clean start
  r = run(appRoot, "node", [
    path.join(appRoot, "installer/scripts/start-sci-os.cjs"),
    "--mode=normal",
    "--no-open",
  ]);
  steps.push({
    step: "second_clean_startup",
    exit: r.status,
    stdoutTail: r.stdout.slice(-500),
  });

  // 4 second proof
  r = run(appRoot, "node", [
    path.join(appRoot, "installer/scripts/convergence/startup-proof.cjs"),
  ]);
  steps.push({ step: "startup_proof_2", exit: r.status, stdoutTail: r.stdout.slice(-400) });

  const ok = steps.every((s) => s.exit === 0);
  const report = {
    at: new Date().toISOString(),
    gate: "ci:startup-convergence-gate",
    steps,
    verdict: ok ? "STARTUP_CONVERGED_DEGRADED_OR_READY" : "NO_GO",
    ok,
  };
  writeJson(appRoot, "startup-convergence-gate-report.json", report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
}

main();
