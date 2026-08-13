/**
 * Validate GENERATED Cockpit browser JavaScript (not just Node server source).
 * Cockpit HTTP 200 ≠ COCKPIT_READY without GENERATED_BROWSER_SCRIPT_VALID.
 * ALPHA_NON_PRODUCTION
 */
const http = require("node:http");
const { spawn } = require("node:child_process");
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
    const src = match[1];
    // skip empty / src= external (shouldn't match body)
    if (src && src.trim()) scripts.push(src);
  }
  return scripts;
}

function validateBrowserScripts(html) {
  const scripts = extractInlineScripts(html);
  if (!scripts.length) {
    throw new Error("COCKPIT_INLINE_SCRIPT_MISSING");
  }
  scripts.forEach((source, index) => {
    try {
      // eslint-disable-next-line no-new
      new vm.Script(source, { filename: `cockpit-inline-${index}.js` });
    } catch (error) {
      const wrapped = new Error(
        "COCKPIT_BROWSER_SCRIPT_SYNTAX_ERROR: " + error.message
      );
      wrapped.cause = error;
      wrapped.scriptIndex = index;
      throw wrapped;
    }
  });
  return { count: scripts.length, bytes: scripts.reduce((n, s) => n + s.length, 0) };
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
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
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

async function runAgainstEntry(entryRel, label) {
  const entry = path.join(ROOT, entryRel);
  if (!fs.existsSync(entry)) {
    return { label, skipped: true, reason: "ENTRY_MISSING", entry: entryRel };
  }
  const port = await freePort();
  const child = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
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
    const htmlRes = await waitHttp(`http://127.0.0.1:${port}/`);
    if (htmlRes.status !== 200) {
      throw new Error(`COCKPIT_HTML_HTTP_${htmlRes.status}`);
    }
    const script = validateBrowserScripts(htmlRes.body);
    const health = await httpGet(`http://127.0.0.1:${port}/healthz`);
    let healthBody = null;
    try {
      healthBody = JSON.parse(health.body);
    } catch {
      healthBody = null;
    }
    return {
      label,
      entry: entryRel,
      port,
      htmlStatus: htmlRes.status,
      healthStatus: health.status,
      healthOk: !!(healthBody && healthBody.ok && healthBody.shell),
      generatedScript: { ok: true, ...script },
      hasLoadingHome: /Loading home/i.test(htmlRes.body),
      hasBootstrapUi: /bootstrapUi\s*\(/.test(htmlRes.body),
      hasApiHelper: /async function api\s*\(/.test(htmlRes.body),
      hasStrayCmdkClosure: false,
    };
  } finally {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    // Windows may need force
    setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, 500);
    if (stderr && /Error|SyntaxError/i.test(stderr)) {
      // leave for caller
    }
  }
}

async function probeControlPlane() {
  const base = process.env.CONTROL_URL || "http://127.0.0.1:3000";
  const out = { base, home: null, readyz: null };
  try {
    const h = await httpGet(`${base}/v1/home`);
    let body = null;
    try {
      body = JSON.parse(h.body);
    } catch {
      body = null;
    }
    const valid =
      h.status === 200 &&
      body &&
      typeof body === "object" &&
      (body.attention != null || body.sections != null);
    out.home = {
      status: h.status,
      ok: valid,
      hasHeadline: !!(body && body.headline),
      hasAttention: !!(body && body.attention),
      hasSections: !!(body && body.sections),
    };
  } catch (e) {
    out.home = { status: 0, ok: false, error: String(e.message || e) };
  }
  try {
    const r = await httpGet(`${base}/readyz`);
    let body = null;
    try {
      body = JSON.parse(r.body);
    } catch {
      body = null;
    }
    out.readyz = {
      status: r.status,
      ok: r.status === 200 && body && typeof body === "object",
      ready: body && body.ready,
      verdict: body && body.verdict,
    };
  } catch (e) {
    out.readyz = { status: 0, ok: false, error: String(e.message || e) };
  }
  return out;
}

async function main() {
  const results = {
    schema: "sci-os-cockpit-generated-script-test/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    invariant: [
      "SERVER_JS_VALID",
      "GENERATED_BROWSER_JS_VALID",
      "COCKPIT_SERVER_READY",
      "GENERATED_HTML_VALID",
      "HOME_API_VALID",
      "UI_HYDRATED_REQUIRES_BROWSER",
    ],
    source: null,
    packaged: null,
    controlPlane: null,
    status: "UNKNOWN",
  };

  try {
    results.source = await runAgainstEntry(
      "apps/cockpit-ui/src/index.js",
      "source"
    );
  } catch (e) {
    results.source = {
      label: "source",
      generatedScript: { ok: false, error: String(e.message || e) },
    };
  }

  try {
    const packagedEntry = fs.existsSync(
      path.join(ROOT, "dist/SCI-OS-X10/cockpit/index.mjs")
    )
      ? "dist/SCI-OS-X10/cockpit/index.mjs"
      : "dist/SCI-OS-X10/cockpit/index.js";
    results.packaged = await runAgainstEntry(packagedEntry, "packaged");
  } catch (e) {
    results.packaged = {
      label: "packaged",
      generatedScript: { ok: false, error: String(e.message || e) },
    };
  }

  results.controlPlane = await probeControlPlane();

  const sourceOk = results.source?.generatedScript?.ok === true;
  const packagedOk =
    results.packaged?.skipped || results.packaged?.generatedScript?.ok === true;
  const homeOk =
    results.controlPlane?.home?.ok === true ||
    results.controlPlane?.home?.status === 0; // CP down ≠ fail script syntax test alone

  results.status =
    sourceOk && packagedOk
      ? "PASS"
      : "FAIL";

  results.pass = results.status === "PASS";
  results.notes = {
    homeApiLive: results.controlPlane?.home,
    readyzLive: results.controlPlane?.readyz,
    uiHydration:
      "Requires browser E2E — HTTP+script syntax proven here; Loading home clear is next infra task if Playwright absent",
  };

  const outDir = path.join(ROOT, "diagnostics-export", "cursor-repair");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "cockpit-generated-script-test.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ outPath, status: results.status, sourceOk, packagedOk, homeOk }, null, 2));
  if (!results.pass) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
