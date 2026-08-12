"use strict";

/**
 * SCI OS ×10.exe cascade orchestrator
 *
 * SCI OS ×10.exe
 *   → Bootstrap Kernel
 *   → Normal Startup
 *   → Startup Recovery Pack   (on NO_GO)
 *   → Meta-Recovery Engine    (on NO_GO / DEGRADED / always for proof)
 *   → Root-cause reasoning
 *   → Transactional repairs
 *   → Startup proof
 *   → READY / DEGRADED / EXTERNAL BLOCKER
 *
 * Does not duplicate startup logic — invokes canonical pack + meta-recovery.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { bootstrapKernel } = require("./bootstrap-kernel.cjs");
const { writeJson } = require("./startup/startup-report.cjs");

function parseArgs(argv) {
  const out = { skipMetaOnReady: false };
  for (const a of argv.slice(2)) {
    if (a === "--skip-meta-on-ready") out.skipMetaOnReady = true;
  }
  return out;
}

function runNode(script, args, cwd) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    status: r.status === null ? 1 : r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

function runPnpm(args, cwd) {
  const r = spawnSync("pnpm", args, {
    cwd,
    encoding: "utf8",
    shell: true,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    status: r.status === null ? 1 : r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

function parseVerdict(stdout) {
  try {
    const m = stdout.match(/\{[\s\S]*"verdict"\s*:\s*"([^"]+)"[\s\S]*\}/);
    if (m) {
      const jsonStart = stdout.lastIndexOf("{");
      if (jsonStart >= 0) {
        const obj = JSON.parse(stdout.slice(jsonStart));
        return obj.verdict || m[1];
      }
      return m[1];
    }
  } catch {
    /* fall through */
  }
  return null;
}

function mapFinal(verdict) {
  if (!verdict) return "SYSTEM_NO_GO";
  const v = String(verdict).toUpperCase();
  if (v === "READY" || v === "SYSTEM_READY") return "SYSTEM_READY";
  if (v === "DEGRADED" || v === "SYSTEM_DEGRADED" || v === "SAFE_MODE")
    return "SYSTEM_DEGRADED";
  if (v.includes("EXTERNAL_BLOCKER")) return "EXTERNAL_BLOCKER_PROVEN";
  if (v === "NO_GO" || v === "SYSTEM_NO_GO") return "SYSTEM_NO_GO";
  return v;
}

function main() {
  const args = parseArgs(process.argv);
  const stages = [];
  const cascadeAt = new Date().toISOString();

  // 1. Bootstrap Kernel
  console.error("[cascade] Bootstrap Kernel");
  const boot = bootstrapKernel();
  stages.push({
    stage: "BootstrapKernel",
    ok: boot.ok,
    failureClass: boot.failureClass || null,
  });
  if (!boot.ok) {
    const final = {
      at: cascadeAt,
      cascade: "SCI_OS_X10",
      stages,
      finalVerdict: "EXTERNAL_BLOCKER_PROVEN",
      reason: boot.failureClass,
      minimalHumanAction:
        boot.failureClass === "NODE_RUNTIME_MISSING"
          ? "Install Node.js 20+ and relaunch SCI OS ×10"
          : "Launch from SCI OS repository root or set SCIOS_APP_ROOT",
    };
    try {
      const d = path.join(process.cwd(), "diagnostics-export");
      fs.mkdirSync(d, { recursive: true });
      writeJson(d, "sci-os-x10-cascade-report.json", final);
    } catch {
      /* ignore */
    }
    console.log(JSON.stringify(final, null, 2));
    process.exit(3);
  }

  const appRoot = boot.appRoot;
  const diagDir = path.join(appRoot, "diagnostics-export");
  process.chdir(appRoot);

  // 2. Normal Startup (gate — no --serve; supervise after READY/DEGRADED via sci:start)
  console.error("[cascade] Normal Startup");
  const normal = runNode(
    path.join(appRoot, "installer/scripts/start-sci-os.cjs"),
    ["--mode=normal", "--no-open"],
    appRoot
  );
  let normalVerdict =
    parseVerdict(normal.stdout) || (normal.status === 0 ? "DEGRADED" : "NO_GO");
  stages.push({
    stage: "NormalStartup",
    ok: normal.status === 0,
    verdict: normalVerdict,
    exit: normal.status,
  });

  // 3. Startup Recovery Pack (repair) when Normal = NO_GO
  let recoveryVerdict = normalVerdict;
  if (normalVerdict === "NO_GO" || normal.status !== 0) {
    console.error("[cascade] Startup Recovery Pack (repair)");
    const repair = runNode(
      path.join(appRoot, "installer/scripts/repair-sci-os.cjs"),
      [],
      appRoot
    );
    recoveryVerdict = parseVerdict(repair.stdout) || (repair.status === 0 ? "DEGRADED" : "NO_GO");
    stages.push({
      stage: "StartupRecoveryPack",
      mode: "repair",
      ok: repair.status === 0,
      verdict: recoveryVerdict,
      exit: repair.status,
    });

    if (recoveryVerdict === "NO_GO" || repair.status !== 0) {
      console.error("[cascade] Startup Recovery Pack (safe-mode)");
      const safe = runNode(
        path.join(appRoot, "installer/scripts/start-sci-os-safe-mode.cjs"),
        [],
        appRoot
      );
      const safeVerdict = parseVerdict(safe.stdout) || (safe.status === 0 ? "DEGRADED" : "NO_GO");
      stages.push({
        stage: "StartupRecoveryPack",
        mode: "safe",
        ok: safe.status === 0,
        verdict: safeVerdict,
        exit: safe.status,
      });
      recoveryVerdict = safeVerdict;
    }
  } else {
    stages.push({
      stage: "StartupRecoveryPack",
      mode: "skipped_normal_ok",
      ok: true,
      verdict: normalVerdict,
    });
  }

  // 4–7. Meta-Recovery Engine (root-cause → transactional repairs → proof → verdict)
  const skipMeta =
    args.skipMetaOnReady &&
    (recoveryVerdict === "READY" || normalVerdict === "READY");
  let metaVerdict = null;
  if (!skipMeta) {
    console.error("[cascade] Meta-Recovery Engine");
    const meta = runPnpm(["sci:meta-recovery"], appRoot);
    metaVerdict =
      parseVerdict(meta.stdout) ||
      (meta.status === 0 ? "SYSTEM_DEGRADED" : "SYSTEM_NO_GO");
    stages.push({
      stage: "MetaRecoveryEngine",
      includes: [
        "RootCauseReasoning",
        "TransactionalRepairs",
        "StartupProof",
      ],
      ok: meta.status === 0 || meta.status === 3,
      verdict: metaVerdict,
      exit: meta.status,
    });
  } else {
    stages.push({
      stage: "MetaRecoveryEngine",
      mode: "skipped_ready",
      ok: true,
      verdict: "SYSTEM_READY",
    });
    metaVerdict = "SYSTEM_READY";
  }

  // Optional proof gate from startup pack
  console.error("[cascade] Startup proof");
  const proof = runNode(
    path.join(appRoot, "installer/scripts/prove-sci-os-startup.cjs"),
    [],
    appRoot
  );
  const proofVerdict = parseVerdict(proof.stdout);
  stages.push({
    stage: "StartupProof",
    ok: proof.status === 0,
    verdict: proofVerdict,
    exit: proof.status,
  });

  const finalVerdict = mapFinal(metaVerdict || recoveryVerdict || normalVerdict);
  const report = {
    at: cascadeAt,
    cascade: [
      "SCI_OS_X10_EXE",
      "BootstrapKernel",
      "NormalStartup",
      "StartupRecoveryPack",
      "MetaRecoveryEngine",
      "RootCauseReasoning",
      "TransactionalRepairs",
      "StartupProof",
      "READY_DEGRADED_OR_EXTERNAL_BLOCKER",
    ],
    stages,
    finalVerdict,
    evidence: {
      bootstrap: path.join(diagDir, "bootstrap-kernel-report.json"),
      startup: path.join(diagDir, "startup-report.json"),
      meta: path.join(diagDir, "meta-recovery", "meta-recovery-proof.json"),
      cascade: path.join(diagDir, "sci-os-x10-cascade-report.json"),
    },
  };
  writeJson(diagDir, "sci-os-x10-cascade-report.json", report);
  console.log(JSON.stringify(report, null, 2));

  if (finalVerdict === "SYSTEM_READY") process.exit(0);
  if (finalVerdict === "SYSTEM_DEGRADED") process.exit(0);
  if (finalVerdict === "EXTERNAL_BLOCKER_PROVEN") process.exit(3);
  process.exit(2);
}

main();
