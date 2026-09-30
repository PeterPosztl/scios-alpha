/**
 * SCI OS ×10 — optional Postgres ECL ledger adapter (CJS).
 * Pool + retry + backoff. durable=true only after INSERT. autoTrade=false. Not product READY.
 * Boot stays OPTIONAL_INFRA_DEGRADED unless connect() succeeds (then OPTIONAL_INFRA_READY for infra only).
 * ALPHA adapter, not BETA enterprise fabric. pg driver is not bundled.
 */
"use strict";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, opts) {
  const attempts = opts && opts.attempts != null ? opts.attempts : 3;
  const baseMs = opts && opts.baseMs != null ? opts.baseMs : 40;
  const maxMs = opts && opts.maxMs != null ? opts.maxMs : 400;
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn(i);
    } catch (err) {
      last = err;
      if (i === attempts - 1) break;
      const wait = Math.min(maxMs, baseMs * 2 ** i);
      await sleep(wait);
    }
  }
  throw last;
}

function emptyPool() {
  return { max: 0, idle: 0, total: 0, connected: false, attempts: 0, lastError: null };
}

function createEclLedgerAdapter(opts) {
  const options = opts && typeof opts === "object" ? opts : {};
  const url = String(options.connectionString || process.env.SCIOS_DATABASE_URL || process.env.DATABASE_URL || "").trim();
  const retries = options.retries && typeof options.retries === "object" ? options.retries : { attempts: 3, baseMs: 40, maxMs: 400 };
  let pool = null;
  let reason = url ? "DRIVER_ABSENT" : "NOT_CONFIGURED";
  let livePostgres = false;
  const poolState = emptyPool();

  return {
    schema: "sci-os-ecl-ledger-adapter/v1",
    label: "ALPHA_NON_PRODUCTION",
    ready: false,
    autoTrade: false,
    fabric: "ALPHA_ADAPTER",
    nextFabric: "BETA_FABRIC",
    async connect() {
      poolState.attempts += 1;
      if (!url) {
        reason = "NOT_CONFIGURED";
        livePostgres = false;
        return this.status();
      }
      try {
        await withRetry(
          async () => {
            const load = new Function("s", "return import(s)");
            const mod = await load("pg");
            const Pool = mod.Pool || (mod.default && mod.default.Pool);
            if (!Pool) {
              const err = new Error("DRIVER_ABSENT");
              err.code = "DRIVER_ABSENT";
              throw err;
            }
            const next = new Pool({
              connectionString: url,
              connectionTimeoutMillis: 800,
              max: options.max || 2,
              idleTimeoutMillis: 10000,
            });
            await next.query("SELECT 1", []);
            pool = next;
          },
          retries
        );
        livePostgres = true;
        reason = "CONNECTED";
        poolState.max = options.max || 2;
        poolState.connected = true;
        poolState.lastError = null;
        poolState.total = 1;
      } catch (err) {
        const msg = err && err.message ? String(err.message) : String(err);
        livePostgres = false;
        pool = null;
        poolState.connected = false;
        poolState.lastError = msg;
        if (msg.includes("Cannot find package") || msg.includes("MODULE_NOT_FOUND") || msg === "DRIVER_ABSENT") {
          reason = "DRIVER_ABSENT";
        } else {
          reason = "CONNECT_FAILED";
        }
      }
      return this.status();
    },
    async query(sql, params) {
      if (!pool) {
        const err = new Error("NOT_CONNECTED");
        err.durable = false;
        throw err;
      }
      return withRetry(() => pool.query(sql, params || []), retries);
    },
    async insertLedger(row) {
      if (!pool) {
        return { ok: true, durable: false, livePostgres: false, reason, autoTrade: false, ready: false };
      }
      try {
        await this.query(
          "INSERT INTO sci_ecl.ledger (ts, kind, instrument_id, payload, analog) VALUES ($1,$2,$3,$4::jsonb,TRUE)",
          [row.ts, row.kind, row.instrumentId, row.payload]
        );
        return { ok: true, durable: true, livePostgres, reason: "POSTGRES", autoTrade: false, ready: false };
      } catch (err) {
        return {
          ok: false,
          durable: false,
          livePostgres,
          reason: "INSERT_FAILED",
          error: err && err.message ? String(err.message) : String(err),
          autoTrade: false,
          ready: false,
        };
      }
    },
    status() {
      const connected = Boolean(pool) && livePostgres;
      return {
        schema: "sci-os-ecl-ledger-adapter/v1",
        label: "ALPHA_NON_PRODUCTION",
        ready: false,
        autoTrade: false,
        fabric: "ALPHA_ADAPTER",
        nextFabric: "BETA_FABRIC",
        betaFabric: false,
        connected,
        livePostgres,
        reason,
        durableDefault: connected,
        optionalInfra: connected ? "OPTIONAL_INFRA_READY" : "OPTIONAL_INFRA_DEGRADED",
        pool: { ...poolState, connected },
        note: "durable=true only after INSERT. OPTIONAL_INFRA_READY is connectivity, not product READY. Not a trading daemon.",
      };
    },
  };
}

module.exports = {
  createEclLedgerAdapter,
  withRetry,
  sleep,
};
