"use strict";

const net = require("net");
const { redactUrl } = require("./validate-config.cjs");

function tcpProbe(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function ensureRedis() {
  const url = process.env.REDIS_URL;
  if (!url || !String(url).trim()) {
    return {
      configured: false,
      reachable: false,
      ping: false,
      bullmqPreflight: false,
      classification: "NOT_CONFIGURED_OPTIONAL",
      failureClass: null,
      nextAction: null,
      redactedUrl: null,
      note: "Queue workers ABSENT in ALPHA; REDIS_URL optional",
    };
  }

  let host = "127.0.0.1";
  let port = 6379;
  try {
    const u = new URL(url);
    host = u.hostname || host;
    port = Number(u.port || 6379);
  } catch {
    return {
      configured: true,
      reachable: false,
      ping: false,
      bullmqPreflight: false,
      classification: "INVALID_URL",
      failureClass: "QUEUE_INVALID",
      nextAction: "Fix REDIS_URL",
      redactedUrl: "[unparseable]",
    };
  }

  const reachable = await tcpProbe(host, port);
  return {
    configured: true,
    reachable,
    ping: false,
    bullmqPreflight: false,
    classification: reachable ? "TCP_OPEN_UNVERIFIED" : "UNREACHABLE",
    failureClass: reachable ? null : "REDIS_UNREACHABLE",
    nextAction: reachable
      ? "Install redis client for PING proof (ALPHA stub)"
      : "Start Redis or unset REDIS_URL",
    redactedUrl: redactUrl(url),
    note: "No ioredis in ALPHA startup — TCP only; PING not claimed PASS",
  };
}

module.exports = { ensureRedis };
