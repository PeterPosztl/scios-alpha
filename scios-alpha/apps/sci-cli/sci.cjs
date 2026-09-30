#!/usr/bin/env node
/**
 * SCI_CLI_SUITE_V2 — Control Plane ops CLI (extends V1).
 * ALPHA ops, not a trading bot. Native fetch. Preview / inspect-only.
 * autoTrade=false. ready=false. Missing riskScore is UNKNOWN, not 0.
 * Compute does not invent dailyLoss/exposure/leverage/drawdown.
 */
"use strict";

const base = process.env.CONTROL_URL || process.env.SCIOS_CONTROL_URL || "http://127.0.0.1:3000";
const argv = process.argv.slice(2);
const compact = argv.includes("--json") || argv.includes("--compact");
const cmd = argv.filter((a) => a !== "--json" && a !== "--compact")[0] || "help";
const rest = argv.filter((a) => a !== "--json" && a !== "--compact");

function flag(name) {
  const i = rest.indexOf(name);
  if (i < 0) return undefined;
  return rest[i + 1];
}

function pos(i) {
  const v = rest[i];
  if (v == null || String(v).startsWith("--")) return undefined;
  return v;
}

function num(v) {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function stamp(extra) {
  return {
    suite: "SCI_CLI_SUITE_V2",
    v1: "SCI_CLI_SUITE_V1",
    label: "ALPHA_NON_PRODUCTION",
    autoTrade: false,
    ready: false,
    preview: true,
    executed: false,
    tradingBot: false,
    control: base,
    ...extra,
  };
}

function out(obj) {
  const payload = stamp(obj);
  console.log(compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2));
}

async function call(path, method, body) {
  const init = {
    method: method || "GET",
    headers: { "content-type": "application/json" },
  };
  if (body != null) init.body = JSON.stringify(body);
  const res = await fetch(base + path, init);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function help() {
  return [
    "SCI_CLI_SUITE_V2 — preview ops (not a trading bot)",
    "  sci audit <size> [riskScore] [--instrument ID]",
    "  sci limit [dailyLoss] [exposure] [leverage]",
    "  sci compute <instrumentId> <size> [price]",
    "  sci ledger",
    "  sci pnl",
    "  sci risk",
    "  sci infra [--live]",
    "  sci explain [--instrument ID]",
    "  sci tail [infra|reporting|pnl|risk] [--n 3] [--ms 2000]",
    "  --json   compact JSON",
    "CONTROL_URL default http://127.0.0.1:3000",
    "Every call: preview, inspect-only, autoTrade=false, ready=false.",
    "Missing riskScore stays UNKNOWN (not 0). Compute does not send invented drawdown/limits.",
    "explain is analog inspect (explain-visibility + evidence-v2), not live causal.",
    "tail polls HTTP; not Kafka/SSE.",
  ].join("\n");
}

async function main() {
  if (cmd === "help" || cmd === "--help" || !cmd) {
    console.log(help());
    return 0;
  }

  if (cmd === "audit") {
    const size = num(flag("--size")) ?? num(pos(1));
    const riskScore = num(flag("--risk")) ?? num(pos(2));
    if (size == null) {
      console.error(JSON.stringify(stamp({ ok: false, error: "size_required" })));
      return 2;
    }
    const body = {
      userId: "sci-cli",
      instrumentId: flag("--instrument") || "inst-pm-fed-cut-oct",
      action: flag("--action") === "SELL" ? "SELL" : "BUY",
      size,
    };
    if (riskScore != null) body.riskScore = riskScore;
    const result = await call("/v1/ecl/engine/audit-eval", "POST", body);
    out({ command: "audit", ...result });
    return result.status === 200 ? 0 : 2;
  }

  if (cmd === "limit") {
    const dailyLoss = num(flag("--dailyLoss")) ?? num(pos(1));
    const exposure = num(flag("--exposure")) ?? num(pos(2));
    const leverage = num(flag("--leverage")) ?? num(pos(3));
    const body = {};
    if (dailyLoss != null) body.dailyLoss = dailyLoss;
    if (exposure != null) body.exposure = exposure;
    if (leverage != null) body.leverage = leverage;
    const result = await call("/v1/ecl/engine/limit-eval", "POST", body);
    out({ command: "limit", ...result });
    return result.status === 200 ? 0 : 2;
  }

  if (cmd === "compute") {
    const instrumentId = flag("--instrument") || pos(1);
    const size = num(flag("--size")) ?? num(pos(2));
    const price = num(flag("--price")) ?? num(pos(3));
    if (!instrumentId || size == null) {
      console.error(JSON.stringify(stamp({ ok: false, error: "instrumentId_and_size_required" })));
      return 2;
    }
    const body = {
      userId: "sci-cli",
      instrumentId,
      action: flag("--action") === "SELL" ? "SELL" : "BUY",
      size,
    };
    if (price != null) body.price = price;
    const horizonDays = num(flag("--horizonDays"));
    if (horizonDays != null) body.horizonDays = horizonDays;
    const result = await call("/v1/ecl/engine/cockpit-compute-v2", "POST", body);
    out({ command: "compute", ...result });
    return result.status === 200 ? 0 : 2;
  }

  if (cmd === "ledger") {
    const result = await call("/v1/ecl/engine/ledger", "GET");
    out({ command: "ledger", ...result });
    return result.status === 200 ? 0 : 2;
  }

  if (cmd === "pnl") {
    const result = await call("/v1/ecl/engine/pnl-book", "GET");
    out({ command: "pnl", realized: false, ...result });
    return result.status === 200 ? 0 : 2;
  }

  if (cmd === "risk") {
    const result = await call("/v1/ecl/engine/risk-book", "GET");
    out({ command: "risk", ...result });
    return result.status === 200 ? 0 : 2;
  }

  if (cmd === "infra") {
    const health = rest.includes("--live") ? await call("/healthz", "GET") : null;
    const infra = await call("/v1/ecl/engine/infra", "GET");
    const build = await call("/v1/ecl/engine/build-v3", "GET");
    out({
      command: "infra",
      live: Boolean(health),
      health: health ? health.data : undefined,
      healthStatus: health ? health.status : undefined,
      infra: infra.data,
      build: build.data,
      status: infra.status,
    });
    return infra.status === 200 ? 0 : 2;
  }

  if (cmd === "explain") {
    const instrumentId = flag("--instrument") || pos(1) || "inst-pm-fed-cut-oct";
    const vis = await call("/v1/ecl/professional/explain-visibility", "GET");
    const ev = await call("/v1/ecl/engine/evidence-v2?instrumentId=" + encodeURIComponent(instrumentId), "GET");
    out({
      command: "explain",
      instrumentId,
      liveCausal: false,
      passGranted: false,
      explainVisibility: vis.data,
      evidence: ev.data,
      status: vis.status,
      note: "Analog inspect. Not live root-cause, not unified explain bus, not DIGITAL_CONTRACT HITL.",
    });
    return vis.status === 200 ? 0 : 2;
  }

  if (cmd === "tail") {
    const target = pos(1) || "infra";
    const n = Math.min(20, Math.max(1, num(flag("--n")) || 3));
    const ms = Math.min(15000, Math.max(200, num(flag("--ms")) || 2000));
    const path =
      target === "reporting"
        ? "/v1/ecl/engine/reporting"
        : target === "pnl"
          ? "/v1/ecl/engine/pnl-book"
          : target === "risk"
            ? "/v1/ecl/engine/risk-book"
            : "/v1/ecl/engine/infra";
    const ticks = [];
    for (let i = 0; i < n; i += 1) {
      const tick = await call(path, "GET");
      ticks.push({ i, status: tick.status, at: new Date().toISOString() });
      if (i < n - 1) await new Promise((r) => setTimeout(r, ms));
    }
    out({
      command: "tail",
      target,
      path,
      polls: n,
      intervalMs: ms,
      sse: false,
      kafka: false,
      ticks,
      last: ticks[ticks.length - 1],
    });
    return ticks.every((t) => t.status === 200) ? 0 : 2;
  }

  console.error(JSON.stringify(stamp({ ok: false, error: "unknown_command", help: help() })));
  return 2;
}

main()
  .catch((err) => {
    console.error(JSON.stringify(stamp({ ok: false, error: String(err && err.message ? err.message : err) })));
    process.exit(2);
  })
  .then((code) => {
    if (typeof code === "number") process.exit(code);
  });
