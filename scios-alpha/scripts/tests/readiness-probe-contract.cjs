"use strict";

/**
 * Targeted readiness probe contract tests (B01).
 * 200 PASS · 404 FAIL · 500 FAIL · refused FAIL · timeout FAIL
 */
const http = require("http");
const path = require("path");
const fs = require("fs");
const {
  acceptedStatus,
  probe,
} = require("../../installer/scripts/startup/desired-state.cjs");

async function run() {
  const results = [];
  function assert(name, cond, detail) {
    results.push({ name, ok: !!cond, detail: detail || null });
  }

  assert("accepted_200", acceptedStatus(200, [200]));
  assert("reject_404", !acceptedStatus(404, [200]));
  assert("reject_500", !acceptedStatus(500, [200]));
  assert("reject_0", !acceptedStatus(0, [200]));

  const server = http.createServer((req, res) => {
    if (req.url === "/ok") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html>SCI OS Home</html>");
      return;
    }
    if (req.url === "/missing") {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    if (req.url === "/boom") {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("error");
      return;
    }
    res.writeHead(200);
    res.end("x");
  });

  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;

  const ok = await probe(`http://127.0.0.1:${port}/ok`, 2000, {
    expected: [200],
    requireHtmlSciOs: true,
  });
  assert("probe_200_html", ok.ok === true, ok);

  const miss = await probe(`http://127.0.0.1:${port}/missing`, 2000, {
    expected: [200],
  });
  assert("probe_404_fail", miss.ok === false && miss.reason === "HTTP_404_NOT_READY", miss);

  const boom = await probe(`http://127.0.0.1:${port}/boom`, 2000, {
    expected: [200],
  });
  assert("probe_500_fail", boom.ok === false, boom);

  server.close();

  const refused = await probe(`http://127.0.0.1:1/`, 500, { expected: [200] });
  assert("probe_refused_fail", refused.ok === false, refused);

  const timeout = await probe(`http://127.0.0.1:${port}/ok`, 1, { expected: [200] });
  // port closed — either timeout or connection error
  assert("probe_timeout_or_error", timeout.ok === false, timeout);

  const failed = results.filter((r) => !r.ok);
  const out = {
    schema: "sci-os-readiness-probe-test/v1",
    at: new Date().toISOString(),
    ok: failed.length === 0,
    results,
  };
  const dir = path.join(__dirname, "../../diagnostics-export/cursor-repair");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "readiness-probe-test.json"),
    JSON.stringify(out, null, 2) + "\n"
  );
  console.log(JSON.stringify(out, null, 2));
  process.exit(failed.length ? 2 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
