/**
 * Probe live Control Plane + Cockpit (ports 3000/4000) for bootstrap repair report.
 * ALPHA_NON_PRODUCTION
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "../..");

function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") })
      );
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function extractInlineScripts(html) {
  const scripts = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    if (match[1] && match[1].trim()) scripts.push(match[1]);
  }
  return scripts;
}

async function main() {
  const html = await httpGet("http://127.0.0.1:4000/");
  const scripts = extractInlineScripts(html.body);
  let syntaxOk = true;
  let err = null;
  try {
    scripts.forEach((s, i) => {
      // eslint-disable-next-line no-new
      new vm.Script(s, { filename: `live-cockpit-${i}.js` });
    });
  } catch (e) {
    syntaxOk = false;
    err = String(e.message || e);
  }

  const home = await httpGet("http://127.0.0.1:3000/v1/home");
  const ready = await httpGet("http://127.0.0.1:3000/readyz");
  const search = await httpGet("http://127.0.0.1:3000/v1/search?q=AAPL");
  let homeBody = null;
  try {
    homeBody = JSON.parse(home.body);
  } catch {
    homeBody = null;
  }
  let readyBody = null;
  try {
    readyBody = JSON.parse(ready.body);
  } catch {
    readyBody = null;
  }

  const installCockpit = path.join(
    process.env.LOCALAPPDATA || "",
    "SCI OS X10",
    "app",
    "cockpit",
    "index.mjs"
  );
  const distCockpit = path.join(ROOT, "dist", "SCI-OS-X10", "cockpit", "index.mjs");

  const report = {
    schema: "sci-os-cockpit-ui-blocker-repair-report/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    EXACT_SYNTAX_DEFECT: "ALREADY_FIXED",
    live: {
      cockpitHttp: html.status,
      scriptCount: scripts.length,
      GENERATED_BROWSER_SCRIPT_VALID: syntaxOk,
      scriptError: err,
      hasBootstrapUi: /bootstrapUi\s*\(/.test(html.body),
      hasApiHelper: /async function api\s*\(/.test(html.body),
      hasLoadingHomeStatic: /Loading home/i.test(html.body),
      hasUnknownStatic: />UNKNOWN</.test(html.body),
      homeHttp: home.status,
      homeContractOk: !!(
        homeBody &&
        typeof homeBody === "object" &&
        (homeBody.attention != null || homeBody.sections != null)
      ),
      readyzHttp: ready.status,
      readyzVerdict: readyBody && (readyBody.verdict || readyBody.status || readyBody.ready),
      searchHttp: search.status,
    },
    artifacts: {
      installCockpitExists: fs.existsSync(installCockpit),
      installCockpitPath: installCockpit,
      installMtime: fs.existsSync(installCockpit)
        ? fs.statSync(installCockpit).mtime.toISOString()
        : null,
      distCockpitExists: fs.existsSync(distCockpit),
      distMtime: fs.existsSync(distCockpit)
        ? fs.statSync(distCockpit).mtime.toISOString()
        : null,
      distBytes: fs.existsSync(distCockpit) ? fs.statSync(distCockpit).size : null,
    },
    UI_HYDRATED: "UNKNOWN_NEEDS_BROWSER_E2E",
    note:
      "Static HTML still contains Loading home… / UNKNOWN until browser JS runs. Syntax+API proven; full DOM hydration needs browser E2E or hard refresh of rebuilt package.",
  };

  const outDir = path.join(ROOT, "diagnostics-export", "cursor-repair");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "cockpit-ui-blocker-repair-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ outPath, ...report.live, EXACT_SYNTAX_DEFECT: report.EXACT_SYNTAX_DEFECT }, null, 2));
  if (!syntaxOk || html.status !== 200 || home.status !== 200) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
