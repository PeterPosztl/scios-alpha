#!/usr/bin/env node
"use strict";
/**
 * Targeted Work / Intelligence DOM-id uniqueness and navigation proof.
 * ALPHA_NON_PRODUCTION — does not replace B-006 or installed E2E as a product gate.
 *
 * Boots the source cockpit on an ephemeral port (same pattern as
 * cockpit-generated-script.cjs) so uniqueness and showView resolution are
 * proven against served HTML, not only the repository template.
 */
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const INDEX = path.join(ROOT, "apps/cockpit-ui/src/index.js");
const OUT_DIR = path.join(ROOT, "diagnostics-export", "architecture-integrity", "ui-wiring-repair");

function countAttr(src, id) {
  const re = new RegExp('id="' + id + '"', "g");
  return (src.match(re) || []).length;
}

function viewSlice(src, id) {
  const needles = ['<div class="view" id="' + id + '"', '<div class="view on" id="' + id + '"'];
  let start = -1;
  for (const n of needles) {
    start = src.indexOf(n);
    if (start >= 0) break;
  }
  if (start < 0) return "";
  const from = src.indexOf(">", start) + 1;
  const next = src.indexOf('<div class="view', from);
  return next < 0 ? src.slice(from) : src.slice(from, next);
}

function firstIdIndex(src, id) {
  return src.indexOf('id="' + id + '"');
}

function showViewResolves(html, id) {
  const n = countAttr(html, id);
  if (!id) return { ok: false, reason: "empty_id", count: 0, resolvedViewId: null };
  if (n === 0) return { ok: false, reason: "unresolved", count: 0, resolvedViewId: null };
  const slice = viewSlice(html, id);
  const isWork = /data-i18n="work\.headline"|My Work/.test(slice);
  const isDil = /data-i18n="dil\.headline"|Decision Intelligence/.test(slice);
  return {
    ok: n === 1,
    reason: n === 1 ? "unique_first_match" : "duplicate_first_wins",
    count: n,
    resolvedViewId: id,
    resolvedIsMyWork: isWork,
    resolvedIsIntelligence: isDil,
  };
}

function simulateShowView(html, id) {
  const resolve = showViewResolves(html, id);
  const slice = viewSlice(html, id);
  return {
    navigationId: id,
    getElementByIdFound: resolve.count > 0,
    unique: resolve.count === 1,
    noOp: resolve.count === 0,
    activeViewId: resolve.count > 0 ? id : null,
    headlineMyWork: /data-i18n="work\.headline"|My Work/.test(slice),
    headlineIntelligence: /data-i18n="dil\.headline"|Decision Intelligence/.test(slice),
    resolve,
  };
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.get(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () =>
          resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") })
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function waitHttp(url, attempts = 40) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await httpGet(url);
      if (r.status > 0) return r;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw last || new Error("cockpit_not_up");
}

async function serveSourceHtml() {
  const port = await freePort();
  const child = spawn(process.execPath, [INDEX], {
    cwd: path.dirname(INDEX),
    env: {
      ...process.env,
      PORT: String(port),
      SCIOS_COCKPIT_PORT: String(port),
      CONTROL_URL: process.env.CONTROL_URL || "http://127.0.0.1:3000",
      SCIOS_BIND: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += d.toString("utf8");
  });
  try {
    const htmlRes = await waitHttp("http://127.0.0.1:" + port + "/");
    return { port, status: htmlRes.status, body: htmlRes.body, stderr };
  } finally {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, 500);
  }
}

async function main() {
  const src = fs.readFileSync(INDEX, "utf8");
  const sourceWorkCount = countAttr(src, "work");
  const sourceDilCount = countAttr(src, "dil");
  const workNav = /<button data-v="work"/.test(src);
  const dilNav = /<button data-v="dil"/.test(src);
  const showViewUsesGetElementById = /function showView\(id,\s*source\)\s*\{[\s\S]*?getElementById\(id\)/.test(src);
  const navWiresDatasetV = /b\.onclick = \(\) => showView\(b\.dataset\.v\)/.test(src);

  let served = { status: 0, body: "", port: 0, error: null };
  try {
    served = await serveSourceHtml();
  } catch (e) {
    served.error = String(e && e.message ? e.message : e);
  }

  const html = served.body || src;
  const htmlWorkCount = countAttr(html, "work");
  const htmlDilCount = countAttr(html, "dil");

  const workProof = simulateShowView(html, "work");
  const intelProof = simulateShowView(html, "dil");

  const uniqueness =
    sourceWorkCount === 1 && sourceDilCount === 1 && htmlWorkCount === 1 && htmlDilCount === 1
      ? "PASS"
      : "FAIL";

  const workNavPass =
    workNav &&
    showViewUsesGetElementById &&
    navWiresDatasetV &&
    workProof.getElementByIdFound &&
    workProof.unique &&
    workProof.headlineMyWork &&
    !workProof.headlineIntelligence &&
    workProof.activeViewId === "work";

  const intelNavPass =
    dilNav &&
    showViewUsesGetElementById &&
    navWiresDatasetV &&
    intelProof.getElementByIdFound &&
    intelProof.unique &&
    intelProof.headlineIntelligence &&
    !intelProof.headlineMyWork &&
    intelProof.activeViewId === "dil";

  const report = {
    schema: "sci-os-ui-wiring-repair-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    file: "apps/cockpit-ui/src/index.js",
    source: {
      workIdCount: sourceWorkCount,
      dilIdCount: sourceDilCount,
      workNavButton: workNav,
      intelligenceNavButton: dilNav,
      showViewUsesGetElementById,
      navWiresDatasetV,
      workIdBeforeDilId: firstIdIndex(src, "work") >= 0 && firstIdIndex(src, "work") < firstIdIndex(src, "dil"),
    },
    runtime: {
      mechanism: "ephemeral_source_cockpit_http",
      port: served.port || null,
      http: served.status,
      error: served.error,
      workIdCount: htmlWorkCount,
      dilIdCount: htmlDilCount,
    },
    workNavigation: {
      independentOfIntelligence: true,
      ...workProof,
      expected: "WORK_NAVIGATION_PASS",
      result: workNavPass ? "WORK_NAVIGATION_PASS" : "WORK_NAVIGATION_FAIL",
    },
    intelligenceNavigation: {
      independentOfWork: true,
      ...intelProof,
      expected: "INTELLIGENCE_NAVIGATION_PASS",
      result: intelNavPass ? "INTELLIGENCE_NAVIGATION_PASS" : "INTELLIGENCE_NAVIGATION_FAIL",
    },
    tokens: {
      WORK_NAVIGATION: workNavPass ? "WORK_NAVIGATION_PASS" : "WORK_NAVIGATION_FAIL",
      INTELLIGENCE_NAVIGATION: intelNavPass ? "INTELLIGENCE_NAVIGATION_PASS" : "INTELLIGENCE_NAVIGATION_FAIL",
      DOM_ID_UNIQUENESS: uniqueness === "PASS" ? "DOM_ID_UNIQUENESS_PASS" : "DOM_ID_UNIQUENESS_FAIL",
    },
    status:
      uniqueness === "PASS" && workNavPass && intelNavPass && !served.error && served.status === 200
        ? "PASS"
        : "FAIL",
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "ui-wiring-proof.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      ok: report.status === "PASS",
      work: report.tokens.WORK_NAVIGATION,
      intelligence: report.tokens.INTELLIGENCE_NAVIGATION,
      uniqueness: report.tokens.DOM_ID_UNIQUENESS,
      runtime: report.runtime,
    })
  );
  process.exit(report.status === "PASS" ? 0 : 1);
}

main();
