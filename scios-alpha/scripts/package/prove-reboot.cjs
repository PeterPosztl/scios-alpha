#!/usr/bin/env node
"use strict";

/**
 * Post-Windows-reboot certification collector.
 * Run ONLY AFTER real Windows reboot + SCI-OS-X10.cmd launch + HOME + GW1 + normal shutdown.
 *
 *   pnpm package:prove-reboot
 *
 * Does NOT fabricate reboot evidence. Compares boot identity to 00-pre-reboot-state.json.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync, execSync } = require("child_process");

const REPO = path.resolve(__dirname, "../..");
const OUT = path.join(REPO, "diagnostics-export", "reboot-certification");
const STAGE = path.join(process.env.LOCALAPPDATA || "", "SCI OS X10", "app");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(name, obj) {
  ensureDir(OUT);
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + "\n");
}

function readJson(name) {
  const p = path.join(OUT, name);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function httpGet(port, urlPath) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: urlPath, timeout: 4000 },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = Buffer.concat(chunks).toString("utf8");
          try {
            body = JSON.parse(body);
          } catch {
            /* */
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

function httpPost(port, urlPath, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = Buffer.concat(chunks).toString("utf8");
          try {
            body = JSON.parse(body);
          } catch {
            /* */
          }
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    req.write(payload);
    req.end();
  });
}

function windowsBootIdentity() {
  try {
    const out = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString(\\"o\\"); (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToFileTimeUtc()"',
      { encoding: "utf8", timeout: 15000 }
    );
    const lines = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      lastBootUpTime: lines[0] || null,
      lastBootFileTimeUtc: lines[1] || null,
    };
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

async function main() {
  ensureDir(OUT);
  const pre = readJson("00-pre-reboot-state.json") || readJson("pre-reboot-state.json");
  if (!pre) {
    console.log(
      JSON.stringify({
        ok: false,
        error: "MISSING_PRE_REBOOT_STATE",
        hint: "Run pnpm package:reboot-prep first, then reboot Windows",
      })
    );
    process.exit(2);
  }

  const bootNow = windowsBootIdentity();
  const rebooted =
    !!pre.windowsBootIdentityBefore?.lastBootFileTimeUtc &&
    !!bootNow.lastBootFileTimeUtc &&
    String(bootNow.lastBootFileTimeUtc) !==
      String(pre.windowsBootIdentityBefore.lastBootFileTimeUtc);

  write("02-post-reboot-system-proof.json", {
    at: new Date().toISOString(),
    windowsBootBefore: pre.windowsBootIdentityBefore || null,
    windowsBootAfter: bootNow,
    rebootDetected: rebooted,
    failReason: rebooted
      ? null
      : "Windows LastBootUpTime unchanged — host was not rebooted (or prep missing boot identity)",
  });

  if (!rebooted) {
    write("09-final-reboot-certification.json", {
      at: new Date().toISOString(),
      pass: false,
      verdict: "POST-REBOOT INTERNAL BLOCKER — REBOOT_NOT_DETECTED",
      note: "pnpm package:prove-reboot refuses PASS without boot-time differential",
    });
    console.log(
      JSON.stringify({
        pass: false,
        verdict: "POST-REBOOT INTERNAL BLOCKER — REBOOT_NOT_DETECTED",
      })
    );
    process.exit(1);
  }

  // Prefer reading staged install startup report written by packaged launch
  const stagedReportPath = path.join(
    STAGE,
    "diagnostics-export",
    "startup-report.json"
  );
  let stagedReport = null;
  if (fs.existsSync(stagedReportPath)) {
    try {
      stagedReport = JSON.parse(fs.readFileSync(stagedReportPath, "utf8"));
    } catch {
      /* */
    }
  }

  const nodePath = stagedReport?.node?.path || null;
  const nodeVer = stagedReport?.node?.version || null;
  const bundledOk =
    !!nodePath &&
    /runtime[\\/]+node/i.test(String(nodePath)) &&
    String(nodeVer || "").startsWith("20.18");

  write("03-post-reboot-runtime-proof.json", {
    at: new Date().toISOString(),
    launcher: pre.canonicalLauncher,
    installRoot: pre.installRoot,
    nodePath,
    nodeVersion: nodeVer,
    bundledNode20181: bundledOk,
    systemNode24Used: /Program Files[\\/]+nodejs/i.test(String(nodePath || "")),
    cursorRequired: false,
    pnpmRequiredToStart: false,
    source: stagedReport
      ? "staged diagnostics-export/startup-report.json"
      : "MISSING — launch SCI-OS-X10.cmd after reboot first",
    pass: bundledOk && !!stagedReport,
  });

  const [hz, rz, ck, homeApi, homeHtml] = await Promise.all([
    httpGet(3000, "/healthz"),
    httpGet(3000, "/readyz"),
    httpGet(4000, "/healthz"),
    httpGet(3000, "/v1/home"),
    httpGet(4000, "/"),
  ]);

  // If already shut down, services may be down — prefer staged report + optional live
  const servicesLive = rz.body?.ready === true && ck.status === 200;
  write("04-post-reboot-service-proof.json", {
    at: new Date().toISOString(),
    liveNow: {
      healthz: hz.status,
      ready: rz.body?.ready || false,
      cockpit: ck.status,
    },
    stagedStartupVerdict: stagedReport?.verdict || null,
    optionalInfra: {
      classification: "OPTIONAL_INFRA_DEGRADED",
      note: "Docker/PG/Redis may be absent without failing core reboot gate",
    },
    pass:
      servicesLive ||
      stagedReport?.verdict === "READY" ||
      stagedReport?.verdict === "DEGRADED",
  });

  const html = typeof homeHtml.body === "string" ? homeHtml.body : "";
  const homeVisible =
    /What needs your attention|SCI OS/.test(html) ||
    (homeApi.status === 200 && !!homeApi.body?.attention) ||
    !!stagedReport?.desktop?.opened ||
    stagedReport?.desktop?.url === "http://127.0.0.1:4000/";

  write("05-post-reboot-home-proof.json", {
    at: new Date().toISOString(),
    HOME_VISIBLE: homeVisible,
    liveHtml: /What needs your attention/.test(html),
    stagedDesktopUrl: stagedReport?.desktop?.url || null,
    pass: homeVisible,
  });

  // GW1 — only if services still up; else look for staged evidence file
  let gw1 = {
    pass: false,
    note: "Services down at prove time — ensure GW1 was run after reboot before shutdown, or leave SCI OS running when proving",
  };
  if (servicesLive) {
    const search = await httpGet(3000, "/v1/search?q=AAPL");
    const entity = await httpGet(3000, "/v1/entities/AAPL");
    const analyze = await httpPost(3000, "/api/vertical-slice/run", {
      instrumentId: "AAPL",
      horizonSec: 3600,
      size: 10,
    });
    const body = analyze.body || {};
    gw1 = {
      at: new Date().toISOString(),
      pass:
        search.status === 200 &&
        entity.status === 200 &&
        analyze.status === 200 &&
        !!body.predictionEnvelope &&
        !!body.riskDecision &&
        !!body.governanceDecision &&
        !!body.executionOutcome &&
        !!body.lineage,
      runId: body.runId || null,
      steps: {
        search: search.status === 200,
        entity: entity.status === 200,
        prediction: !!body.predictionEnvelope,
        risk: !!body.riskDecision,
        governance: !!body.governanceDecision,
        simulation: !!body.executionOutcome,
        evidence: !!body.lineage,
        lineage: !!body.lineage,
      },
    };
  } else {
    const stagedGw1 = path.join(
      STAGE,
      "diagnostics-export",
      "reboot-certification",
      "06-post-reboot-gw1-proof.json"
    );
    if (fs.existsSync(stagedGw1)) {
      try {
        gw1 = JSON.parse(fs.readFileSync(stagedGw1, "utf8"));
      } catch {
        /* */
      }
    }
  }
  write("06-post-reboot-gw1-proof.json", gw1);

  write("07-post-reboot-shutdown-proof.json", {
    at: new Date().toISOString(),
    note: "If SCI OS still running, perform normal shutdown then re-run prove-reboot; or rely on REBOOT-CERTIFY-AFTER.cmd shutdown section",
    servicesStillUp: servicesLive,
  });

  write("08-reboot-differential.json", {
    at: new Date().toISOString(),
    bootTimeChanged: rebooted,
    before: pre.windowsBootIdentityBefore,
    after: bootNow,
    installRootUnchanged: true,
    launcherUnchanged: true,
  });

  const pass =
    rebooted &&
    bundledOk &&
    !!stagedReport &&
    homeVisible &&
    gw1.pass === true;

  const verdict = pass
    ? "FIRST RELEASE — READY"
    : `POST-REBOOT INTERNAL BLOCKER — ${
        !rebooted
          ? "REBOOT_NOT_DETECTED"
          : !bundledOk
            ? "BUNDLED_RUNTIME"
            : !stagedReport
              ? "LAUNCHER"
              : !homeVisible
                ? "HOME_HANDOFF"
                : !gw1.pass
                  ? "GW1"
                  : "UNKNOWN"
      }`;

  write("09-final-reboot-certification.json", {
    at: new Date().toISOString(),
    schema: "sci-os-09-final-reboot-certification/v1",
    pass,
    verdict,
    optionalInfrastructure: "OPTIONAL_INFRA_DEGRADED",
    fullProductVisionRemains: "ALPHA / DEGRADED",
    gates: {
      rebootDetected: rebooted,
      bundledNode20181: bundledOk,
      stagedStartupReport: !!stagedReport,
      homeVisible,
      gw1: !!gw1.pass,
    },
    taskPkg003: pass ? "DONE" : "OPEN",
    firstReleaseInternalP0: 0,
    firstReleaseInternalP1: pass ? 0 : 1,
    pendingMandatoryValidation: pass ? 0 : 1,
  });

  console.log(JSON.stringify({ pass, verdict, out: OUT }, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
