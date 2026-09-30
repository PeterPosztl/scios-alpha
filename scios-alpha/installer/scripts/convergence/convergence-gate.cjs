"use strict";

/**
 * ci:startup-convergence-gate — dual consecutive clean one-click startups.
 *
 * Sequence (acceptance):
 *   stop → start#1 (canonical capsule) → proof#1 (worker smoke + readiness)
 *   → stop → start#2 → proof#2 → stop (orderly)
 *   → scorecard + dual-startup-evidence
 *
 * Exit 0 when both startups prove core (backend+worker smoke+cockpit) even if
 * readiness is DEGRADED (optional infra). Exit 1 on NO_GO / failed stop/start.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
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
  return {
    status: r.status === null ? 1 : r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

function parseJsonTail(stdout) {
  const i = stdout.lastIndexOf("{");
  if (i < 0) return null;
  try {
    return JSON.parse(stdout.slice(i));
  } catch {
    return null;
  }
}

function httpGet(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.on("error", () => resolve(0));
    req.on("timeout", () => {
      req.destroy();
      resolve(0);
    });
  });
}

function postSmoke(port) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ job: `gate_smoke_${Date.now()}` });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/v1/foundation/worker-smoke",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(data),
        },
        timeout: 5000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8").slice(0, 200),
          });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.write(data);
    req.end();
  });
}

function row(id, pass, detail, points = 10) {
  return { id, pass: !!pass, points: pass ? points : 0, max: points, detail };
}

async function liveSnapshot(apiPort, cockpitPort) {
  const [hz, rz, ck, smoke] = await Promise.all([
    httpGet(`http://127.0.0.1:${apiPort}/healthz`),
    httpGet(`http://127.0.0.1:${apiPort}/readyz`),
    httpGet(`http://127.0.0.1:${cockpitPort}/healthz`),
    postSmoke(apiPort),
  ]);
  return {
    backendHealth: hz === 200,
    backendReady: rz === 200,
    cockpitHealth: ck === 200,
    workerSmoke: smoke.status === 200,
    raw: { hz, rz, ck, smoke },
  };
}

function resolvePorts(appRoot) {
  const reportPath = path.join(appRoot, "diagnostics-export", "startup-report.json");
  let api = Number(process.env.PORT) || 3000;
  let cockpit = Number(process.env.SCIOS_COCKPIT_PORT) || 4000;
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    api = report?.configuration?.redactedConfig?.apiPort || api;
    cockpit = report?.configuration?.redactedConfig?.cockpitPort || cockpit;
  } catch {
    /* defaults */
  }
  return { api, cockpit };
}

async function main() {
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) process.exit(1);
  const appRoot = rootRes.appRoot;
  const steps = [];
  const capsule = path.join(appRoot, "installer/scripts/bootstrap-capsule.cjs");
  const stopScript = path.join(appRoot, "installer/scripts/convergence/stop.cjs");
  const proofScript = path.join(
    appRoot,
    "installer/scripts/convergence/startup-proof.cjs"
  );

  // 0 — clean slate
  let r = run(appRoot, "node", [stopScript]);
  steps.push({ step: "clean_state_stop", exit: r.status });

  // 1 — first one-click (canonical capsule, gate mode: no --serve hang)
  r = run(appRoot, "node", [capsule, "--no-open"]);
  const start1 = parseJsonTail(r.stdout);
  steps.push({
    step: "first_one_click_start",
    exit: r.status,
    verdict: start1?.verdict || null,
    stdoutTail: r.stdout.slice(-500),
  });

  r = run(appRoot, "node", [proofScript]);
  const proof1 = parseJsonTail(r.stdout);
  steps.push({
    step: "first_proof",
    exit: r.status,
    verdict: proof1?.verdict || null,
    workerProof: proof1?.workerProof,
    stdoutTail: r.stdout.slice(-400),
  });

  const ports1 = resolvePorts(appRoot);
  const live1 = await liveSnapshot(ports1.api, ports1.cockpit);
  steps.push({ step: "first_live_snapshot", exit: 0, ...live1, ports: ports1 });

  // 2 — orderly shutdown between startups
  r = run(appRoot, "node", [stopScript]);
  steps.push({ step: "mid_shutdown", exit: r.status });
  await new Promise((res) => setTimeout(res, 1500));
  const afterStop1 = await liveSnapshot(ports1.api, ports1.cockpit);
  steps.push({
    step: "mid_shutdown_verify",
    exit:
      !afterStop1.backendHealth && !afterStop1.cockpitHealth ? 0 : 1,
    down: {
      api: !afterStop1.backendHealth,
      cockpit: !afterStop1.cockpitHealth,
    },
  });

  // 3 — second one-click
  r = run(appRoot, "node", [capsule, "--no-open"]);
  const start2 = parseJsonTail(r.stdout);
  steps.push({
    step: "second_one_click_start",
    exit: r.status,
    verdict: start2?.verdict || null,
    stdoutTail: r.stdout.slice(-500),
  });

  r = run(appRoot, "node", [proofScript]);
  const proof2 = parseJsonTail(r.stdout);
  steps.push({
    step: "second_proof",
    exit: r.status,
    verdict: proof2?.verdict || null,
    workerProof: proof2?.workerProof,
    stdoutTail: r.stdout.slice(-400),
  });

  const ports2 = resolvePorts(appRoot);
  const live2 = await liveSnapshot(ports2.api, ports2.cockpit);
  steps.push({ step: "second_live_snapshot", exit: 0, ...live2, ports: ports2 });

  // 4 — final orderly shutdown
  r = run(appRoot, "node", [stopScript]);
  steps.push({ step: "final_shutdown", exit: r.status });
  await new Promise((res) => setTimeout(res, 1500));
  const afterFinal = await liveSnapshot(ports2.api, ports2.cockpit);
  steps.push({
    step: "final_shutdown_verify",
    exit:
      !afterFinal.backendHealth && !afterFinal.cockpitHealth ? 0 : 1,
    down: {
      api: !afterFinal.backendHealth,
      cockpit: !afterFinal.cockpitHealth,
    },
  });

  const firstOk =
    steps.find((s) => s.step === "first_one_click_start")?.exit === 0 &&
    live1.backendHealth &&
    live1.backendReady &&
    live1.workerSmoke &&
    live1.cockpitHealth;
  const secondOk =
    steps.find((s) => s.step === "second_one_click_start")?.exit === 0 &&
    live2.backendHealth &&
    live2.backendReady &&
    live2.workerSmoke &&
    live2.cockpitHealth;
  const stopsOk = ["clean_state_stop", "mid_shutdown", "final_shutdown"].every(
    (id) => steps.find((s) => s.step === id)?.exit === 0
  );
  const shutdownVerified =
    steps.find((s) => s.step === "mid_shutdown_verify")?.exit === 0 &&
    steps.find((s) => s.step === "final_shutdown_verify")?.exit === 0;

  const autonomous =
    firstOk && secondOk && stopsOk && shutdownVerified;

  const readiness =
    proof2?.readiness ||
    proof1?.readiness ||
    start2?.verdict ||
    start1?.verdict ||
    "UNKNOWN";

  const rows = [
    row(
      "clean_state",
      steps.find((s) => s.step === "clean_state_stop")?.exit === 0,
      `stopExit=${steps.find((s) => s.step === "clean_state_stop")?.exit}`
    ),
    row(
      "one_click_entry_exists",
      fs.existsSync(capsule),
      "installer/scripts/bootstrap-capsule.cjs"
    ),
    row(
      "first_one_click_start",
      firstOk,
      `exit=${steps.find((s) => s.step === "first_one_click_start")?.exit} live=${JSON.stringify(live1.raw)}`
    ),
    row("backend_health", live1.backendHealth, `status=${live1.raw.hz}`),
    row(
      "backend_readyz",
      live1.backendReady,
      `status=${live1.raw.rz}`
    ),
    row(
      "worker_smoke",
      live1.workerSmoke,
      `status=${live1.raw.smoke.status}`
    ),
    row("cockpit_health", live1.cockpitHealth, `status=${live1.raw.ck}`),
    row(
      "startup_proof_written",
      fs.existsSync(
        path.join(
          appRoot,
          "diagnostics-export/convergence/startup-convergence-proof.json"
        )
      ),
      "diagnostics-export/convergence/startup-convergence-proof.json"
    ),
    row(
      "shutdown_api_down",
      !afterStop1.backendHealth,
      `mid_api=${afterStop1.raw.hz}`
    ),
    row(
      "shutdown_cockpit_down",
      !afterStop1.cockpitHealth,
      `mid_ck=${afterStop1.raw.ck}`
    ),
    row(
      "second_one_click_start",
      secondOk,
      `exit=${steps.find((s) => s.step === "second_one_click_start")?.exit} live=${JSON.stringify(live2.raw)}`
    ),
    row(
      "second_backend_ready",
      live2.backendHealth && live2.backendReady,
      `healthz=${live2.raw.hz} readyz=${live2.raw.rz}`
    ),
    row(
      "second_worker_smoke",
      live2.workerSmoke,
      `status=${live2.raw.smoke.status}`
    ),
    row(
      "second_cockpit_200",
      live2.cockpitHealth,
      `healthz=${live2.raw.ck}`
    ),
    row(
      "final_orderly_shutdown",
      shutdownVerified &&
        steps.find((s) => s.step === "final_shutdown")?.exit === 0,
      `api=${afterFinal.raw.hz} cockpit=${afterFinal.raw.ck}`
    ),
    row("dual_consecutive_autonomous", autonomous, `readiness=${readiness}`),
  ];

  const earned = rows.reduce((a, x) => a + x.points, 0);
  const max = rows.reduce((a, x) => a + x.max, 0);
  const scorecard = {
    at: new Date().toISOString(),
    display: `${earned}/${max}`,
    earned,
    max,
    rows,
    verdict: autonomous ? "PASS" : "FAIL",
    label: "ALPHA_NON_PRODUCTION",
    note:
      "PASS = two consecutive clean one-click startups + worker smoke + readiness probe + orderly shutdown. Infra may still be DEGRADED.",
  };

  const report = {
    at: new Date().toISOString(),
    gate: "ci:startup-convergence-gate",
    acceptance:
      "two_consecutive_clean_one_click_startups + worker_smoke + readiness + orderly_shutdown",
    steps,
    autonomous,
    readiness,
    verdict: autonomous
      ? typeof readiness === "object" && readiness.verdict === "READY"
        ? "STARTUP_CONVERGED_READY"
        : "STARTUP_CONVERGED_DEGRADED"
      : "NO_GO",
    ok: autonomous,
    scorecardPath: "diagnostics-export/p0-startup-scorecard.json",
    dualEvidencePath: "diagnostics-export/dual-startup-evidence.json",
  };

  writeJson(appRoot, "startup-convergence-gate-report.json", report);

  const diag = path.join(appRoot, "diagnostics-export");
  fs.mkdirSync(diag, { recursive: true });
  fs.writeFileSync(
    path.join(diag, "p0-startup-scorecard.json"),
    JSON.stringify(scorecard, null, 2)
  );
  fs.writeFileSync(
    path.join(diag, "dual-startup-evidence.json"),
    JSON.stringify(
      {
        schema: "sci-os-dual-startup/v1",
        at: report.at,
        autonomous,
        verdict: report.verdict,
        readiness,
        first: { start: start1, proof: proof1, live: live1 },
        second: { start: start2, proof: proof2, live: live2 },
        shutdowns: {
          mid: afterStop1,
          final: afterFinal,
        },
        steps,
        scorecard,
      },
      null,
      2
    )
  );

  console.log(JSON.stringify(report, null, 2));
  process.exit(autonomous ? 0 : 1);
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    })
  );
  process.exit(1);
});
