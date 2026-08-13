/**
 * Cockpit birth test — HTTP + generated browser script + Home/readyz contracts.
 * Does not require Postgres/Redis/Docker.
 * UI_HYDRATED full browser E2E recorded as next infra if Playwright absent.
 * ALPHA_NON_PRODUCTION
 */
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const vm = require("node:vm");
const net = require("node:net");

const ROOT = path.resolve(__dirname, "../..");

function extractInlineScripts(html) {
  const scripts = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    if (match[1] && match[1].trim()) scripts.push(match[1]);
  }
  return scripts;
}

function validateBrowserScripts(html) {
  const scripts = extractInlineScripts(html);
  if (!scripts.length) throw new Error("COCKPIT_INLINE_SCRIPT_MISSING");
  for (let i = 0; i < scripts.length; i++) {
    try {
      // eslint-disable-next-line no-new
      new vm.Script(scripts[i], { filename: `cockpit-birth-${i}.js` });
    } catch (error) {
      const e = new Error("COCKPIT_BROWSER_SCRIPT_SYNTAX_ERROR: " + error.message);
      e.cause = error;
      throw e;
    }
  }
  return scripts.length;
}

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

async function waitOk(url, n = 40) {
  let last;
  for (let i = 0; i < n; i++) {
    try {
      const r = await httpGet(url);
      if (r.status === 200) return r;
      last = new Error("HTTP " + r.status);
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw last;
}

async function main() {
  const proof = {
    schema: "sci-os-cockpit-birth-test/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    steps: [],
    status: "UNKNOWN",
  };
  const push = (name, ok, detail) => proof.steps.push({ name, ok, ...detail });

  const cp = process.env.CONTROL_URL || "http://127.0.0.1:3000";

  // 1) Home API
  try {
    const h = await httpGet(cp + "/v1/home");
    let body = null;
    try {
      body = JSON.parse(h.body);
    } catch {
      body = null;
    }
    const ok =
      h.status === 200 &&
      body &&
      typeof body === "object" &&
      (body.attention != null || body.sections != null);
    push("HOME_API", ok, {
      status: h.status,
      hasAttention: !!(body && body.attention),
      hasSections: !!(body && body.sections),
    });
  } catch (e) {
    push("HOME_API", false, { error: String(e.message || e) });
  }

  // 2) readyz
  try {
    const r = await httpGet(cp + "/readyz");
    let body = null;
    try {
      body = JSON.parse(r.body);
    } catch {
      body = null;
    }
    push("READYZ", r.status === 200 && !!body, {
      status: r.status,
      ready: body && body.ready,
      verdict: body && body.verdict,
    });
  } catch (e) {
    push("READYZ", false, { error: String(e.message || e) });
  }

  // 3) Cockpit HTML + generated script (ephemeral server from source)
  const port = await freePort();
  const entry = path.join(ROOT, "apps/cockpit-ui/src/index.js");
  const child = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      PORT: String(port),
      SCIOS_COCKPIT_PORT: String(port),
      CONTROL_URL: cp,
      SCIOS_BIND: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const html = await waitOk(`http://127.0.0.1:${port}/`);
    let scriptOk = false;
    let scriptError = null;
    let scriptCount = 0;
    try {
      scriptCount = validateBrowserScripts(html.body);
      scriptOk = true;
    } catch (e) {
      scriptError = String(e.message || e);
    }
    const health = await httpGet(`http://127.0.0.1:${port}/healthz`);
    let hb = null;
    try {
      hb = JSON.parse(health.body);
    } catch {
      hb = null;
    }
    push("COCKPIT_HTML", html.status === 200, { status: html.status });
    push("GENERATED_BROWSER_SCRIPT", scriptOk, {
      scriptCount,
      error: scriptError,
    });
    push("COCKPIT_HEALTHZ", !!(hb && hb.ok && hb.shell), { body: hb });
    push("BOOTSTRAP_PRESENT", /bootstrapUi\s*\(/.test(html.body), {});
    push("API_HELPER_PRESENT", /async function api\s*\(/.test(html.body), {});
    push("INITIAL_LOADING_MARKER", /Loading home/i.test(html.body), {
      note: "Static HTML may contain Loading home… until JS runs — expected",
    });
  } finally {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }

  // Search smoke (optional if CP up)
  try {
    const s = await httpGet(cp + "/v1/search?q=AAPL");
    push("SEARCH_AAPL", s.status === 200, { status: s.status });
  } catch (e) {
    push("SEARCH_AAPL", false, { error: String(e.message || e) });
  }

  const required = [
    "HOME_API",
    "READYZ",
    "COCKPIT_HTML",
    "GENERATED_BROWSER_SCRIPT",
    "COCKPIT_HEALTHZ",
    "BOOTSTRAP_PRESENT",
    "API_HELPER_PRESENT",
  ];
  const failed = proof.steps.filter((s) => required.includes(s.name) && !s.ok);
  proof.status = failed.length ? "FAIL" : "PASS";
  proof.cockpitReady =
    proof.status === "PASS"
      ? {
          COCKPIT_SERVER_READY: true,
          GENERATED_HTML_VALID: true,
          GENERATED_BROWSER_SCRIPT_VALID: true,
          HOME_API_VALID: true,
          UI_HYDRATED: "UNKNOWN_NEEDS_BROWSER_E2E",
          note: "COCKPIT_READY requires UI_HYDRATED browser proof as next infra",
        }
      : null;
  proof.failed = failed.map((f) => f.name);

  const outDir = path.join(ROOT, "diagnostics-export", "cursor-repair");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "cockpit-birth-test.json");
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ outPath, status: proof.status, failed: proof.failed }, null, 2));
  if (proof.status !== "PASS") process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
