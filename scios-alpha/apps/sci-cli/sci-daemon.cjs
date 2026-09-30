#!/usr/bin/env node
/**
 * SCI OS ×10 preview book daemon — HTTP recompute only. Not a trading bot.
 * PREPARED_DISABLED unless --service or SCIOS_DAEMON=1.
 * Not started by start-sci-os / SCI-OS-Start.bat. autoTrade=false. ready=false.
 */
"use strict";

const { mkdirSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { homedir } = require("node:os");

const base = process.env.CONTROL_URL || process.env.SCIOS_CONTROL_URL || "http://127.0.0.1:3000";
const service = process.argv.includes("--service") || process.env.SCIOS_DAEMON === "1";
const once = process.argv.includes("--once") || process.env.SCIOS_DAEMON_ONCE === "1";
const pnlMs = Number(process.env.SCI_DAEMON_PNL_MS || 30000);
const riskMs = Number(process.env.SCI_DAEMON_RISK_MS || 30000);
const archiveMs = Number(process.env.SCI_DAEMON_ARCHIVE_MS || 60000);

async function getJson(path) {
  const res = await fetch(base + path);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function heartbeatPath() {
  if (process.env.SCIOS_DAEMON_HEARTBEAT) return process.env.SCIOS_DAEMON_HEARTBEAT;
  const local = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  return join(local, "SCI OS X10", "state", "sci-daemon-heartbeat.json");
}

function writeHeartbeat() {
  const path = heartbeatPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify({
      ts: new Date().toISOString(),
      pid: process.pid,
      autoTrade: false,
      ready: false,
      preview: true,
      wiredIntoBoot: false,
      note: "Preview maintenance heartbeat. Not a trade executor.",
    })
  );
}

async function tick(kind) {
  const path =
    kind === "pnl" ? "/v1/pnl-book" : kind === "risk" ? "/v1/risk-book" : kind === "archive" ? "/v1/ledger" : "/v1/ecl/engine/reporting";
  const out = await getJson(path);
  writeHeartbeat();
  return {
    kind,
    ok: out.status === 200,
    status: out.status,
    autoTrade: false,
    executed: false,
    ready: false,
    preview: true,
    ledgerSize: out.body && out.body.data && typeof out.body.data.ledgerSize === "number" ? out.body.data.ledgerSize : undefined,
    note: kind === "archive" ? "Rotate hint only. Append-only ledger is not deleted." : "Preview recompute. No trade.",
  };
}

async function main() {
  if (!service && !once) {
    console.log(
      JSON.stringify({
        schema: "sci-os-daemon/v1",
        status: "PREPARED_DISABLED",
        wiredIntoBoot: false,
        autoTrade: false,
        ready: false,
        note: "Pass --service or SCIOS_DAEMON=1 to loop. --once for a single tick. Does not execute trades.",
      })
    );
    return 0;
  }
  const pnl = await tick("pnl");
  const risk = await tick("risk");
  const archive = await tick("archive");
  const reporting = await tick("reporting");
  const snapshot = { autoTrade: false, ready: false, executed: false, pnl, risk, archive, reporting };
  console.log(JSON.stringify(snapshot));
  if (once) return pnl.ok && risk.ok ? 0 : 2;
  setInterval(() => {
    void tick("pnl").then((row) => console.log(JSON.stringify(row)));
  }, Number.isFinite(pnlMs) ? pnlMs : 30000);
  setInterval(() => {
    void tick("risk").then((row) => console.log(JSON.stringify(row)));
  }, Number.isFinite(riskMs) ? riskMs : 30000);
  setInterval(() => {
    void tick("archive").then((row) => console.log(JSON.stringify(row)));
  }, Number.isFinite(archiveMs) ? archiveMs : 60000);
  return undefined;
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, autoTrade: false, error: String(err && err.message ? err.message : err) }));
  process.exit(2);
}).then((code) => {
  if (typeof code === "number") process.exit(code);
});
