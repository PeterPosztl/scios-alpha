/**
 * Compare LOCALAPPDATA install cockpit vs repo dist generated browser JS.
 * ALPHA_NON_PRODUCTION
 */
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const net = require("node:net");

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

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 8000 }, (res) => {
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

async function waitOk(url) {
  let last;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await httpGet(url);
      if (r.status === 200) return r;
      last = new Error("HTTP " + r.status);
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw last;
}

function validate(html) {
  const scripts = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    if (match[1] && match[1].trim()) scripts.push(match[1]);
  }
  if (!scripts.length) throw new Error("COCKPIT_INLINE_SCRIPT_MISSING");
  scripts.forEach((source, index) => {
    // eslint-disable-next-line no-new
    new vm.Script(source, { filename: `cmp-${index}.js` });
  });
  return scripts.length;
}

async function probe(entry) {
  if (!fs.existsSync(entry)) {
    return { entry, missing: true };
  }
  const port = await freePort();
  const child = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      PORT: String(port),
      SCIOS_COCKPIT_PORT: String(port),
      CONTROL_URL: "http://127.0.0.1:3000",
      SCIOS_BIND: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const html = await waitOk(`http://127.0.0.1:${port}/`);
    let scriptOk = true;
    let err = null;
    let count = 0;
    try {
      count = validate(html.body);
    } catch (e) {
      scriptOk = false;
      err = String(e.message || e);
    }
    return {
      entry,
      bytes: fs.statSync(entry).size,
      mtime: fs.statSync(entry).mtime.toISOString(),
      scriptOk,
      err,
      scriptCount: count,
      hasBootstrapUi: /bootstrapUi\s*\(/.test(html.body),
      hasApiHelper: /async function api\s*\(/.test(html.body),
    };
  } finally {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  const install = path.join(
    process.env.LOCALAPPDATA || "",
    "SCI OS X10",
    "app",
    "cockpit",
    "index.mjs"
  );
  const dist = path.join(
    path.resolve(__dirname, "../.."),
    "dist",
    "SCI-OS-X10",
    "cockpit",
    "index.mjs"
  );
  const results = {
    install: await probe(install),
    dist: await probe(dist),
  };
  console.log(JSON.stringify(results, null, 2));
  if (
    (results.install.missing !== true && !results.install.scriptOk) ||
    !results.dist.scriptOk
  ) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
