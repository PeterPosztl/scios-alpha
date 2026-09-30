/**
 * P0 golden-path latency probe against live packaged CP if present.
 * UNKNOWN if unreachable — never invent PASS.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(
  __dirname,
  "../../diagnostics-export/autonomous-marathon/performance-probe.json"
);

function timed(p) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const u = new URL(p, CP);
    const req = http.get(u, { timeout: 8000 }, (res) => {
      res.resume();
      res.on("end", () =>
        resolve({ path: p, status: res.statusCode, ms: Date.now() - t0 })
      );
    });
    req.on("error", (e) =>
      resolve({ path: p, status: 0, ms: Date.now() - t0, error: e.message })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ path: p, status: 0, ms: Date.now() - t0, error: "timeout" });
    });
  });
}

(async () => {
  const steps = [];
  for (const p of ["/readyz", "/v1/home", "/v1/search?q=AAPL", "/v1/entities/AAPL"]) {
    steps.push(await timed(p));
  }
  const reachable = steps.every((s) => s.status >= 200 && s.status < 500);
  const out = {
    schema: "sci-os-performance-probe/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    cp: CP,
    status: reachable ? "MEASURED" : "UNKNOWN",
    note: "MEASURED != PASS SLO. First-release has no contracted latency SLO.",
    steps,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ status: out.status, steps }, null, 2));
  process.exit(reachable ? 0 : 0);
})();
