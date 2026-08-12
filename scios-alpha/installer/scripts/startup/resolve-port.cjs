"use strict";

const net = require("net");
const http = require("http");

function isListening(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function httpGetJson(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body = null;
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on("error", (err) => resolve({ status: 0, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

async function resolvePort(port, healthPath = "/healthz") {
  const listening = await isListening(port);
  if (!listening) {
    return {
      port,
      state: "FREE",
      action: "bind",
      pid: null,
      isSciOs: false,
      health: null,
    };
  }

  const health = await httpGetJson(`http://127.0.0.1:${port}${healthPath}`);
  const isSciOs =
    health.status === 200 &&
    health.body &&
    typeof health.body === "object" &&
    (String(health.body.service || "").includes("@scios") ||
      health.body.ok === true ||
      health.body.verticalSlice === true);

  if (isSciOs) {
    return {
      port,
      state: "SCI_OS_HEALTHY",
      action: "reuse",
      pid: null,
      isSciOs: true,
      health,
    };
  }

  return {
    port,
    state: "OCCUPIED_FOREIGN",
    action: "never_kill_auto",
    pid: null,
    isSciOs: false,
    health,
    failureClass: "PORT_CONFLICT",
    nextAction: `Free port ${port} or set SCIOS_API_PORT / SCIOS_COCKPIT_PORT`,
  };
}

module.exports = { resolvePort, isListening, httpGetJson };
