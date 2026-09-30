/**
 * Cockpit birth E2E — targets live packaged Cockpit :4000.
 * Playwright is optional (not in first-release lockfile). If missing, HTTP+script
 * contracts still run; DOM hydration is UNKNOWN_NEEDS_PLAYWRIGHT unless
 * SCIOS_E2E_DOM_PROOF=1 and a prior browser proof exists.
 * ALPHA_NON_PRODUCTION
 */
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "cursor-repair");
const BASE_CP = process.env.SCIOS_E2E_CONTROL_URL || "http://127.0.0.1:3000";
const BASE_UI = process.env.SCIOS_E2E_COCKPIT_URL || "http://127.0.0.1:4000";

function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString("utf8"),
        })
      );
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
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

async function tryPlaywright(proof) {
  let playwright;
  try {
    playwright = require("playwright");
  } catch {
    proof.playwright = {
      status: "NOT_AVAILABLE",
      note: "playwright package not installed — first-release policy uses node HTTP+script tests; do not add a second test stack without founder approval",
    };
    return;
  }
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on("pageerror", (e) => consoleErrors.push(String(e.message || e)));
    const t0 = Date.now();
    await page.goto(BASE_UI + "/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const v = document.getElementById("verdict");
        const h = document.getElementById("homeSub");
        const badge = v && v.textContent.trim();
        const sub = h && h.textContent.trim();
        return (
          badge &&
          badge !== "UNKNOWN" &&
          sub &&
          !/Loading home/i.test(sub)
        );
      },
      { timeout: 5000 }
    );
    const elapsedMs = Date.now() - t0;
    const snap = await page.evaluate(() => {
      const v = document.getElementById("verdict");
      const h = document.getElementById("homeSub");
      const r = document.getElementById("roleSelect");
      return {
        verdict: v && v.textContent.trim(),
        homeSub: h && h.textContent.trim(),
        role: r && r.value,
        roleLabel: r && r.selectedOptions[0] && r.selectedOptions[0].textContent.trim(),
      };
    });
    await page.fill("#globalSearch, input[placeholder*='AAPL']", "AAPL");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
    const hasApple = await page.evaluate(() => /Apple Inc/i.test(document.body.innerText));
    proof.playwright = {
      status:
        consoleErrors.length === 0 &&
        snap.verdict !== "UNKNOWN" &&
        !/Loading home/i.test(snap.homeSub || "") &&
        hasApple
          ? "PASS"
          : "FAIL",
      elapsedMs,
      snap,
      hasApple,
      consoleErrors,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const proof = {
    schema: "sci-os-cockpit-birth-e2e/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    steps: [],
  };
  const push = (name, ok, detail) => proof.steps.push({ name, ok, ...detail });

  const html = await httpGet(BASE_UI + "/");
  push("COCKPIT_HTTP", html.status === 200, { status: html.status });
  let scriptOk = false;
  try {
    const scripts = extractScripts(html.body);
    if (!scripts.length) throw new Error("COCKPIT_INLINE_SCRIPT_MISSING");
    scripts.forEach((s, i) => new vm.Script(s, { filename: `e2e-${i}.js` }));
    scriptOk = true;
  } catch (e) {
    push("GENERATED_SCRIPT", false, { error: String(e.message || e) });
  }
  if (scriptOk) push("GENERATED_SCRIPT", true, {});

  const home = await httpGet(BASE_CP + "/v1/home");
  let homeBody = null;
  try {
    homeBody = JSON.parse(home.body);
  } catch {
    homeBody = null;
  }
  push(
    "HOME_API",
    home.status === 200 && homeBody && (homeBody.attention != null || homeBody.sections != null),
    { status: home.status }
  );

  const ready = await httpGet(BASE_CP + "/readyz");
  push("READYZ", ready.status === 200, { status: ready.status });

  const search = await httpGet(BASE_CP + "/v1/search?q=AAPL");
  let searchBody = null;
  try {
    searchBody = JSON.parse(search.body);
  } catch {
    searchBody = null;
  }
  const entities =
    (searchBody &&
      searchBody.results &&
      (Array.isArray(searchBody.results)
        ? searchBody.results
        : searchBody.results.entities)) ||
    [];
  push("SEARCH_AAPL", search.status === 200 && entities.length > 0, {
    status: search.status,
    hitCount: entities.length,
  });

  await tryPlaywright(proof);

  const required = ["COCKPIT_HTTP", "GENERATED_SCRIPT", "HOME_API", "READYZ", "SEARCH_AAPL"];
  const failed = proof.steps.filter((s) => required.includes(s.name) && !s.ok);
  if (proof.playwright && proof.playwright.status === "FAIL") failed.push({ name: "PLAYWRIGHT_DOM" });
  proof.status = failed.length ? "FAIL" : "PASS";
  proof.failed = failed.map((f) => f.name);
  proof.playwrightStatus = (proof.playwright && proof.playwright.status) || "NOT_AVAILABLE";

  fs.mkdirSync(OUT, { recursive: true });
  const outPath = path.join(OUT, "cockpit-birth-e2e.json");
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ outPath, status: proof.status, playwright: proof.playwrightStatus }, null, 2));
  if (proof.status !== "PASS") process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
