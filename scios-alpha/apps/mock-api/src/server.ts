/**
 * Developer mock API — Express-shaped composition without Express.
 * Default port 5230. Runs real @scios/vertical-slice; live system probes.
 * Label: ALPHA / NON-PRODUCTION — not the canonical sci:start backend (:3000).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { verticalSliceRouter } from "./routes/verticalSlice.js";
import { systemRouter } from "./routes/system.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5230;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return;
  }

  void (async () => {
    if (method === "GET" && path === "/healthz") {
      sendJson(res, 200, {
        ok: true,
        service: "@scios/mock-api",
        port: PORT,
        label: "DEV_MOCK_NON_PRODUCTION",
        note: "Canonical production path remains pnpm sci:start (control-plane :3000)",
      });
      return;
    }

    if (
      await verticalSliceRouter({
        method,
        path,
        url,
        req,
        res,
        sendJson,
      })
    ) {
      return;
    }

    if (await systemRouter({ method, path, res, sendJson })) {
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  })().catch((err) => {
    sendJson(res, 500, {
      error: "internal_error",
      detail: err instanceof Error ? err.message : String(err),
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: "@scios/mock-api",
      message: `Mock API server listening on http://localhost:${PORT}`,
      endpoints: [
        "POST /api/vertical-slice/run",
        "GET /api/system/health",
        "GET /api/system/startup-readiness",
      ],
      label: "DEV_MOCK_NON_PRODUCTION",
    })
  );
});
