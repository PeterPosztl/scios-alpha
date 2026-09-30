"use strict";

const net = require("net");
const {
  resolveAppRoot,
  listSciosAlphaProcesses,
  classifyProcess,
  listeningPortsMap,
  writeJson,
  httpGet,
  validateConfig,
} = require("./lib.cjs");

function tcpOpen(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port }, () => {
      s.end();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.setTimeout(timeoutMs, () => {
      s.destroy();
      resolve(false);
    });
  });
}

function redisPing(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port }, () => {
      s.write("*1\r\n$4\r\nPING\r\n");
    });
    let buf = "";
    s.on("data", (d) => {
      buf += d.toString("utf8");
      if (buf.includes("+PONG")) {
        s.end();
        resolve(true);
      }
    });
    s.on("error", () => resolve(false));
    s.setTimeout(timeoutMs, () => {
      s.destroy();
      resolve(false);
    });
  });
}

function pidOnPort(portsMap, port) {
  for (const [pid, ports] of Object.entries(portsMap)) {
    if ((ports || []).includes(port)) return Number(pid);
  }
  return null;
}

function statusOf(pid, healthy) {
  if (!pid) return "STOPPED";
  return healthy ? "RUNNING" : "UNHEALTHY";
}

async function main() {
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) process.exit(1);
  const appRoot = rootRes.appRoot;
  const config = validateConfig(appRoot);
  const apiPort = config.redactedConfig.apiPort;
  const cockpitPort = config.redactedConfig.cockpitPort;
  const portsMap = listeningPortsMap();
  const processes = listSciosAlphaProcesses(appRoot).map((p) =>
    classifyProcess(p, portsMap)
  );

  const healthz = await httpGet(`http://127.0.0.1:${apiPort}/healthz`);
  const readyz = await httpGet(`http://127.0.0.1:${apiPort}/readyz`);
  const cockpitHz = await httpGet(`http://127.0.0.1:${cockpitPort}/healthz`);

  const backendPid =
    pidOnPort(portsMap, apiPort) ||
    processes.find((p) => p.component === "control-plane-api")?.pid ||
    null;
  const cockpitPid =
    pidOnPort(portsMap, cockpitPort) ||
    processes.find((p) => p.component === "cockpit-ui")?.pid ||
    null;

  const readyBody =
    readyz.body && typeof readyz.body === "object" ? readyz.body : {};
  const workerOnline =
    healthz.status === 200 &&
    (readyBody.foundationWorker === true ||
      readyBody.components?.foundationWorker === true);
  const workerPid = workerOnline ? backendPid : null;

  const pgTcp = await tcpOpen("127.0.0.1", 5432);
  const redisOk = await redisPing("127.0.0.1", 6379);

  const out = {
    backend: {
      pid: backendPid,
      status: statusOf(backendPid, healthz.status === 200),
      port: apiPort,
    },
    worker: {
      pid: workerPid,
      status: workerOnline ? "RUNNING" : "STOPPED",
    },
    cockpit: {
      pid: cockpitPid,
      status: statusOf(cockpitPid, cockpitHz.status === 200),
      port: cockpitPort,
    },
    infra: {
      postgres: pgTcp ? "HEALTHY" : "UNHEALTHY",
      redis: redisOk ? "HEALTHY" : "UNHEALTHY",
    },
  };

  writeJson(appRoot, "status-snapshot.json", {
    ...out,
    evidence: {
      at: new Date().toISOString(),
      healthz: healthz.status,
      readyz: readyz.status,
      cockpitHealthz: cockpitHz.status,
      postgresTcp5432: pgTcp,
      redisPing: redisOk,
      note: "Live probes only; Docker inspect skipped to avoid hung engine pipe",
    },
  });
  console.log(JSON.stringify(out, null, 2));
  const coreUp =
    out.backend.status === "RUNNING" && out.cockpit.status === "RUNNING";
  process.exit(coreUp ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
