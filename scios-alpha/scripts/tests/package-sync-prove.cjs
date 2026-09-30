/**
 * Package-sync golden path against the CURRENT installed LOCALAPPDATA runtime.
 * Does not start repo/pnpm/system Node as the product. ALPHA_NON_PRODUCTION.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const vm = require("vm");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const INSTALL = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");
const BACKUP = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app.backup.last");
const OUT = path.join(ROOT, "diagnostics-export", "package-sync");
const EXPECTED = "pkg_1787074480539";
const OLD = "pkg_1786656680759";
const CP = "http://127.0.0.1:3000";
const UI = "http://127.0.0.1:4000";

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function httpReq(method, url, body, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const payload = body != null ? Buffer.from(JSON.stringify(body), "utf8") : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        timeout: timeoutMs,
        headers: payload
          ? { "content-type": "application/json", "content-length": payload.length }
          : {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode || 0, raw, body: parsed });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: String(e.message || e), raw: "", body: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout", raw: "", body: null });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function extractScripts(html) {
  const scripts = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[1] && m[1].trim()) scripts.push(m[1]);
  }
  return scripts;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const steps = [];
  const push = (name, ok, detail) => steps.push({ name, ok: !!ok, ...detail });

  const distId = readJson(path.join(ROOT, "dist", "SCI-OS-X10", "manifests", "build-identity.json"));
  const installedId = readJson(path.join(INSTALL, "manifests", "build-identity.json"));
  const backupId = fs.existsSync(path.join(BACKUP, "manifests", "build-identity.json"))
    ? readJson(path.join(BACKUP, "manifests", "build-identity.json"))
    : null;
  const startup = fs.existsSync(path.join(INSTALL, "diagnostics-export", "startup-report.json"))
    ? readJson(path.join(INSTALL, "diagnostics-export", "startup-report.json"))
    : null;

  const nodeExe = path.join(INSTALL, "runtime", "node", "node.exe");
  const nv = spawnSync(nodeExe, ["-p", "process.version"], { encoding: "utf8", windowsHide: true });
  const bundledNode = String(nv.stdout || "").trim();

  const git = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: path.join(ROOT, ".."),
    encoding: "utf8",
    windowsHide: true,
  });
  const gitSha = String(git.stdout || "").trim() || installedId.gitSha;

  const identityMatch =
    distId.buildId === EXPECTED &&
    installedId.buildId === EXPECTED &&
    distId.buildId === installedId.buildId &&
    installedId.buildId !== OLD &&
    installedId.gitSha === "8a0125a18bd017abaf3206f075713bccc28f01e7";

  push("IDENTITY_SOURCE_PACKAGE_INSTALL", identityMatch, {
    distBuildId: distId.buildId,
    installedBuildId: installedId.buildId,
    gitSha: installedId.gitSha,
    oldActive: installedId.buildId === OLD,
  });

  push("BUNDLED_NODE", bundledNode === "v20.18.1" && startup && startup.node && startup.node.source === "bundled", {
    bundledNode,
    startupNode: startup && startup.node,
  });

  push("WINDOWS_ENTRY_EXE", fs.existsSync(path.join(INSTALL, "SCI-OS-X10.exe")), {
    exe: path.join(INSTALL, "SCI-OS-X10.exe"),
    cmd: fs.existsSync(path.join(INSTALL, "SCI-OS-X10.cmd")),
  });

  push(
    "RUNTIME_APPROOT",
    !!(startup && /appdata\\local\\sci os x10\\app/i.test(String(startup.appRoot).replace(/\//g, "\\"))),
    { appRoot: startup && startup.appRoot, verdict: startup && startup.verdict }
  );

  const health = await httpReq("GET", CP + "/healthz");
  push("CP_HEALTH", health.status === 200 && health.body && health.body.ok, {
    status: health.status,
    service: health.body && health.body.service,
    profile: health.body && health.body.profile,
  });

  const cockH = await httpReq("GET", UI + "/healthz");
  push("COCKPIT_HEALTH", cockH.status === 200 && cockH.body && cockH.body.ok, {
    status: cockH.status,
    shell: cockH.body && cockH.body.shell,
  });

  const home = await httpReq("GET", CP + "/v1/home");
  const homeOk =
    home.status === 200 &&
    home.body &&
    (home.body.attention != null || home.body.sections != null || home.body.headline);
  const badge =
    (home.body && (home.body.verdict || home.body.status || (home.body.attention && home.body.attention.verdict))) ||
    null;
  push("HOME", homeOk && String(badge || "ok") !== "UNKNOWN", {
    status: home.status,
    headline: home.body && home.body.headline,
    badge: badge || (homeOk ? "HYDRATED_API" : "UNKNOWN"),
    hasAttention: !!(home.body && home.body.attention),
  });

  const ready = await httpReq("GET", CP + "/readyz");
  push(
    "READYZ_DEPENDENCY_METRICS",
    ready.status === 200 &&
      ready.body &&
      ready.body.dependencyMetrics &&
      ready.body.dependencyMetrics.node &&
      ready.body.dependencyMetrics.node.version,
    {
      status: ready.status,
      nodeVersion: ready.body && ready.body.dependencyMetrics && ready.body.dependencyMetrics.node && ready.body.dependencyMetrics.node.version,
      ready: ready.body && ready.body.ready,
    }
  );

  const models = await httpReq("GET", CP + "/v1/models");
  push("MODELS_ENDPOINT", models.status === 200 && models.body && Array.isArray(models.body.models) && models.body.models.length > 0, {
    status: models.status,
    count: models.body && models.body.models && models.body.models.length,
    first: models.body && models.body.models && models.body.models[0] && models.body.models[0].modelId,
  });

  const search = await httpReq("GET", CP + "/v1/search?q=AAPL");
  const resultsObj = (search.body && search.body.results) || {};
  const hits = Array.isArray(search.body && search.body.results)
    ? search.body.results
    : Array.isArray(resultsObj.entities)
      ? resultsObj.entities
      : Array.isArray(search.body && search.body.hits)
        ? search.body.hits
        : [];
  push("SEARCH", search.status === 200 && hits.length > 0, {
    status: search.status,
    hitCount: hits.length,
    first: hits[0] && (hits[0].id || hits[0].entityId || hits[0].title),
  });

  let entityId = "AAPL";
  const entity = await httpReq("GET", CP + "/v1/entities/" + encodeURIComponent(entityId));
  if (entity.body && entity.body.entity && entity.body.entity.id) entityId = entity.body.entity.id;
  push("ENTITY", entity.status === 200 && !!(entity.body && entity.body.entity), {
    status: entity.status,
    entityId,
    title: entity.body && entity.body.entity && entity.body.entity.title,
  });

  const exp = await httpReq(
    "GET",
    CP + "/v1/experience/compile?roleId=arch.market_analyst&workflowState=ready"
  );
  const actionsList = (exp.body && (exp.body.actions || exp.body.disabledActions || [])) || [];
  const disabled = exp.body && exp.body.disabledActions;
  const actPrefixLeak = Array.isArray(disabled)
    ? disabled.some((a) => typeof a === "string" && a.startsWith("act."))
    : false;
  push(
    "EXPERIENCE",
    exp.status === 200 && exp.body && exp.body.compilerStatus === "RUNTIME_MOUNTED" && !actPrefixLeak,
    {
      status: exp.status,
      compilerStatus: exp.body && exp.body.compilerStatus,
      disabledActions: disabled,
      actPrefixLeak,
    }
  );

  const analyze = await httpReq("POST", CP + "/api/vertical-slice/run", {
    instrumentId: "AAPL",
    horizonSec: 3600,
    size: 10,
    actor: "actor:arch.market_analyst",
    role: "arch.market_analyst",
    idempotencyKey: "package-sync-gw1-" + Date.now(),
  });
  const run = analyze.body || {};
  push("GW1", analyze.status === 200 && !!run.runId, {
    status: analyze.status,
    runId: run.runId,
    decision: run.status,
    executionMode: run.executionOutcome && run.executionOutcome.mode,
    simulated: !!(run.executionOutcome && run.executionOutcome.simulated),
  });

  const pred = run.predictionEnvelope || run.prediction || {};
  const science =
    pred.scienceStatus || pred.maturity || pred.modelTruth || pred.label || run.modelTruth || null;
  const provenance = pred.provenance || run.provenance || null;
  push(
    "UNCERTAINTY",
    !!run.runId &&
      (science == null ||
        /UNKNOWN|UNVALIDATED|FOUNDATION|ALPHA|NON.?PRODUCTION/i.test(String(science))) &&
      !/PRODUCTION_VALIDATED|CERTIFIED/i.test(String(science || "")),
    { scienceStatus: science, provenance }
  );
  push("PROVENANCE", !!(provenance && (provenance.modelId || provenance.runId)), { provenance });

  const risk = run.riskDecision || {};
  const gov = run.governanceDecision || {};
  push(
    "RISK_GOVERNANCE",
    !!(risk.decision || risk.status || risk.action || gov.decision || gov.status || gov.action || run.status),
    {
      risk: risk.decision || risk.status || risk.action || null,
      governance: gov.decision || gov.status || gov.action || null,
      pipelineStatus: run.status,
    }
  );

  let evidenceOk = false;
  let lineageOk = false;
  if (run.runId) {
    const lin = await httpReq("GET", CP + "/v1/lineage/" + encodeURIComponent(run.runId));
    lineageOk =
      lin.status === 200 &&
      !!(lin.body && (lin.body.verified === true || lin.body.nodes || lin.body.lineage));
    push("LINEAGE", lineageOk, {
      status: lin.status,
      verified: lin.body && lin.body.verified,
      nodeCount: lin.body && (lin.body.nodes || []).length,
    });
    const ev = await httpReq("GET", CP + "/v1/runs/" + encodeURIComponent(run.runId) + "/professional");
    evidenceOk =
      ev.status === 200 &&
      !!(ev.body && (ev.body.evidence || ev.body.evidenceIds || ev.body.runId || ev.body.sections));
    push("EVIDENCE", evidenceOk || !!run.evidence || !!run.lineageVerified, {
      status: ev.status,
      runId: run.runId,
      lineageVerifiedOnRun: run.lineageVerified,
    });
  } else {
    push("LINEAGE", false, { error: "no_run" });
    push("EVIDENCE", false, { error: "no_run" });
  }

  const html = await httpReq("GET", UI + "/");
  let scriptOk = false;
  let scriptError = null;
  try {
    const scripts = extractScripts(html.raw || "");
    if (!scripts.length) throw new Error("COCKPIT_INLINE_SCRIPT_MISSING");
    scripts.forEach((s, i) => new vm.Script(s, { filename: `installed-cockpit-${i}.js` }));
    scriptOk = true;
  } catch (e) {
    scriptError = String(e.message || e);
  }
  const htmlText = html.raw || "";
  push("UI_E2E", html.status === 200 && scriptOk && /bootstrapUi\s*\(/.test(htmlText) && homeOk && hits.length > 0, {
    status: html.status,
    scriptOk,
    scriptError,
    hasBootstrapUi: /bootstrapUi\s*\(/.test(htmlText),
    hasApiHelper: /async function api\s*\(/.test(htmlText),
    note: "HTTP 200 insufficient; VM syntax + bootstrapUi + Home/Search contracts required",
  });

  const backend = fs.readFileSync(path.join(INSTALL, "backend", "server.cjs"), "utf8");
  push(
    "COMPLETION_SWEEP_IN_INSTALL",
    backend.includes("provenance:") &&
      backend.includes("redactLogMeta") &&
      backend.includes("dependencyMetrics") &&
      backend.includes("/v1/models"),
    {
      provenance: backend.includes("provenance:"),
      redactLogMeta: backend.includes("redactLogMeta"),
      dependencyMetrics: backend.includes("dependencyMetrics"),
      modelsRoute: backend.includes("/v1/models"),
      repoPathLeak: (backend.match(/C:\\\\Users\\\\peter\\\\Desktop\\\\SCI/g) || []).length,
    }
  );

  const backupOk =
    !!backupId &&
    backupId.buildId === OLD &&
    fs.existsSync(path.join(BACKUP, "SCI-OS-X10.cmd")) &&
    fs.existsSync(path.join(BACKUP, "backend", "server.cjs"));
  push("APP_BACKUP_LAST", backupOk, {
    backupBuildId: backupId && backupId.buildId,
    backupDir: BACKUP,
  });

  const recoveryPath = path.join(INSTALL, "recovery", "server.cjs");
  push("RECOVERY_PACKAGE", fs.existsSync(recoveryPath), { recoveryPath });

  const failed = steps.filter((s) => !s.ok);
  const proof = {
    schema: "sci-os-package-sync-golden-path/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    expectedBuildId: EXPECTED,
    oldBuildId: OLD,
    dist: distId,
    installed: installedId,
    backup: backupId,
    gitSha,
    bundledNode,
    startup: startup && {
      appRoot: startup.appRoot,
      verdict: startup.verdict,
      node: startup.node,
      runtimeMode: startup.runtimeMode,
    },
    runId: run.runId || null,
    steps,
    status: failed.length ? "FAIL" : "PASS",
    failed: failed.map((f) => f.name),
  };

  const identityOut = {
    schema: "sci-os-package-sync-current-build-identity/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    sourceGitSha: gitSha,
    sourceCheckpoint: "8a0125a1",
    package: distId,
    installed: installedId,
    runtime: {
      appRoot: startup && startup.appRoot,
      bundledNode,
      nodePath: startup && startup.node && startup.node.path,
      nodeSource: startup && startup.node && startup.node.source,
      runtimeMode: startup && startup.runtimeMode,
      buildId: installedId.buildId,
    },
    sameBuild:
      distId.buildId === installedId.buildId &&
      installedId.buildId === EXPECTED &&
      installedId.buildId !== OLD,
    oldInstalledBuildId: OLD,
    oldNoLongerActive: installedId.buildId !== OLD,
  };

  fs.writeFileSync(path.join(OUT, "current-build-identity.json"), JSON.stringify(identityOut, null, 2));
  fs.writeFileSync(path.join(OUT, "golden-path-proof.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ status: proof.status, failed: proof.failed, buildId: installedId.buildId, runId: run.runId }, null, 2));
  if (proof.status !== "PASS") process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
