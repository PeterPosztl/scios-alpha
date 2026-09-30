/**
 * Minimal ECL ledger / PnL / risk-book DAO.
 * Postgres SQL is the target store. Injected SqlClient may be memory (tests) or pg (optional infra).
 * durable=true only after INSERT succeeds. preview PnL ≠ realized. autoTrade=false. Not READY.
 */
export type SqlQueryResult = { rows: Record<string, unknown>[] };
export type SqlClient = {
  query(sql: string, params?: unknown[]): Promise<SqlQueryResult>;
};

export type EclLedgerKind = "DECISION" | "EXECUTION_PREVIEW";

export type EclLedgerRow = {
  ts: string;
  kind: EclLedgerKind;
  instrumentId: string;
  payload: Record<string, unknown>;
  analog: true;
};

export const ECL_LEDGER_SQL = {
  insert: `INSERT INTO sci_ecl.ledger (ts, kind, instrument_id, payload, analog)
    VALUES ($1,$2,$3,$4::jsonb,TRUE) RETURNING ts, kind, instrument_id, payload, analog`,
  list: `SELECT ts, kind, instrument_id, payload, analog FROM sci_ecl.ledger ORDER BY ts DESC LIMIT $1`,
  upsertPnl: `INSERT INTO sci_ecl.pnl_book (instrument_id, pnl, preview, realized, updated_at)
    VALUES ($1,$2,TRUE,FALSE,$3)
    ON CONFLICT (instrument_id) DO UPDATE SET pnl=EXCLUDED.pnl, preview=TRUE, realized=FALSE, updated_at=EXCLUDED.updated_at`,
  upsertRisk: `INSERT INTO sci_ecl.risk_book (instrument_id, risk, skipped_unknown, updated_at)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (instrument_id) DO UPDATE SET risk=EXCLUDED.risk, skipped_unknown=EXCLUDED.skipped_unknown, updated_at=EXCLUDED.updated_at`,
  listPnl: `SELECT instrument_id, pnl, preview, realized, updated_at FROM sci_ecl.pnl_book`,
  listRisk: `SELECT instrument_id, risk, skipped_unknown, updated_at FROM sci_ecl.risk_book`,
  allLedger: `SELECT ts, kind, instrument_id, payload FROM sci_ecl.ledger ORDER BY ts ASC`,
} as const;

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function payloadOf(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === "object") return p as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function rowToLedger(row: Record<string, unknown>): EclLedgerRow {
  return {
    ts: row.ts instanceof Date ? row.ts.toISOString() : String(row.ts),
    kind: String(row.kind) as EclLedgerKind,
    instrumentId: String(row.instrument_id ?? row.instrumentId),
    payload: payloadOf(row.payload),
    analog: true,
  };
}

export function aggregatePreviewBooks(entries: EclLedgerRow[]) {
  const pnlByInstrument: Record<string, number> = {};
  const riskByInstrument: Record<string, number> = {};
  let pnlSkippedUnknown = 0;
  let riskSkippedUnknown = 0;
  for (const e of entries) {
    if (e.kind === "EXECUTION_PREVIEW") {
      const size = e.payload.size ?? e.payload.previewSize;
      const price = e.payload.previewFillPrice ?? e.payload.fillPreview;
      if (!finite(size) || !finite(price)) {
        pnlSkippedUnknown += 1;
        continue;
      }
      pnlByInstrument[e.instrumentId] = (pnlByInstrument[e.instrumentId] ?? 0) + size * price;
    }
    if (e.kind === "DECISION") {
      const riskScore = e.payload.riskScore;
      if (!finite(riskScore)) {
        riskSkippedUnknown += 1;
        continue;
      }
      riskByInstrument[e.instrumentId] = (riskByInstrument[e.instrumentId] ?? 0) + riskScore;
    }
  }
  return { pnlByInstrument, riskByInstrument, pnlSkippedUnknown, riskSkippedUnknown };
}

export function createMemoryEclSqlClient(): SqlClient {
  const ledger: Record<string, unknown>[] = [];
  const pnl = new Map<string, Record<string, unknown>>();
  const risk = new Map<string, Record<string, unknown>>();
  return {
    async query(sql, params = []) {
      if (sql === ECL_LEDGER_SQL.insert) {
        const row = {
          ts: params[0],
          kind: params[1],
          instrument_id: params[2],
          payload: payloadOf(params[3]),
          analog: true,
        };
        ledger.push(row);
        return { rows: [row] };
      }
      if (sql === ECL_LEDGER_SQL.list) {
        const limit = Number(params[0] ?? 500);
        return { rows: ledger.slice().reverse().slice(0, limit) };
      }
      if (sql === ECL_LEDGER_SQL.allLedger) {
        return { rows: ledger.slice() };
      }
      if (sql === ECL_LEDGER_SQL.upsertPnl) {
        pnl.set(String(params[0]), {
          instrument_id: params[0],
          pnl: params[1],
          preview: true,
          realized: false,
          updated_at: params[2],
        });
        return { rows: [] };
      }
      if (sql === ECL_LEDGER_SQL.upsertRisk) {
        risk.set(String(params[0]), {
          instrument_id: params[0],
          risk: params[1],
          skipped_unknown: params[2],
          updated_at: params[3],
        });
        return { rows: [] };
      }
      if (sql === ECL_LEDGER_SQL.listPnl) return { rows: [...pnl.values()] };
      if (sql === ECL_LEDGER_SQL.listRisk) return { rows: [...risk.values()] };
      throw new Error("unknown_sql");
    },
  };
}

export type EclLedgerDao = ReturnType<typeof createEclLedgerDao>;

export function createEclLedgerDao(opts: { client: SqlClient | null; livePostgres?: boolean }) {
  let client = opts.client;
  let livePostgres = opts.livePostgres === true;

  function backend() {
    if (!client) return "none" as const;
    return livePostgres ? ("postgres" as const) : ("injected" as const);
  }

  return {
    get backend() {
      return backend();
    },
    get livePostgres() {
      return livePostgres;
    },
    get connected() {
      return Boolean(client);
    },
    ready: false as const,
    autoTrade: false as const,
    attach(next: SqlClient, live: boolean) {
      client = next;
      livePostgres = live;
    },
    async append(row: EclLedgerRow) {
      if (!client) {
        return { ok: true as const, durable: false as const, livePostgres: false as const, row, reason: "NOT_CONFIGURED" as const };
      }
      await client.query(ECL_LEDGER_SQL.insert, [row.ts, row.kind, row.instrumentId, row.payload]);
      await recompute(client);
      return {
        ok: true as const,
        durable: true as const,
        livePostgres,
        row,
        reason: livePostgres ? ("POSTGRES" as const) : ("INJECTED" as const),
      };
    },
    async list(limit = 500) {
      if (!client) return { durable: false as const, livePostgres: false as const, entries: [] as EclLedgerRow[] };
      const result = await client.query(ECL_LEDGER_SQL.list, [limit]);
      return {
        durable: true as const,
        livePostgres,
        entries: result.rows.map(rowToLedger),
      };
    },
    async pnlBook() {
      if (!client) {
        return {
          engine: "pnl-book-v1" as const,
          durable: false as const,
          preview: true as const,
          realized: false as const,
          livePostgres: false as const,
          pnlByInstrument: {} as Record<string, number>,
        };
      }
      const result = await client.query(ECL_LEDGER_SQL.listPnl);
      const pnlByInstrument: Record<string, number> = {};
      for (const r of result.rows) {
        const id = String(r.instrument_id ?? r.instrumentId);
        if (finite(r.pnl)) pnlByInstrument[id] = r.pnl;
      }
      return {
        engine: "pnl-book-v1" as const,
        durable: true as const,
        preview: true as const,
        realized: false as const,
        livePostgres,
        pnlByInstrument,
      };
    },
    async riskBook() {
      if (!client) {
        return {
          engine: "risk-book-v1" as const,
          durable: false as const,
          livePostgres: false as const,
          riskByInstrument: {} as Record<string, number>,
        };
      }
      const result = await client.query(ECL_LEDGER_SQL.listRisk);
      const riskByInstrument: Record<string, number> = {};
      let skippedUnknown = 0;
      for (const r of result.rows) {
        const id = String(r.instrument_id ?? r.instrumentId);
        if (finite(r.risk)) riskByInstrument[id] = r.risk;
        skippedUnknown += Number(r.skipped_unknown ?? 0);
      }
      return {
        engine: "risk-book-v1" as const,
        durable: true as const,
        livePostgres,
        riskByInstrument,
        skippedUnknown,
      };
    },
  };
}

async function recompute(client: SqlClient) {
  const all = await client.query(ECL_LEDGER_SQL.allLedger);
  const entries = all.rows.map(rowToLedger);
  const books = aggregatePreviewBooks(entries);
  const now = new Date().toISOString();
  const instruments = new Set([...Object.keys(books.pnlByInstrument), ...Object.keys(books.riskByInstrument)]);
  for (const id of instruments) {
    if (id in books.pnlByInstrument) {
      await client.query(ECL_LEDGER_SQL.upsertPnl, [id, books.pnlByInstrument[id], now]);
    }
    if (id in books.riskByInstrument) {
      await client.query(ECL_LEDGER_SQL.upsertRisk, [id, books.riskByInstrument[id], books.riskSkippedUnknown, now]);
    }
  }
}

export async function tryCreatePostgresClientFromEnv(): Promise<{
  client: SqlClient | null;
  livePostgres: boolean;
  reason: "NOT_CONFIGURED" | "DRIVER_ABSENT" | "CONNECT_FAILED" | "CONNECTED";
  attempts: number;
  lastError: string | null;
}> {
  const url = process.env.SCIOS_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!url.trim()) return { client: null, livePostgres: false, reason: "NOT_CONFIGURED", attempts: 0, lastError: null };
  let attempts = 0;
  let lastError: string | null = null;
  const delays = [40, 80, 160];
  for (let i = 0; i < delays.length; i += 1) {
    attempts += 1;
    try {
      const load = new Function("s", "return import(s)") as (s: string) => Promise<{
        default?: { Pool: new (c: object) => { query: SqlClient["query"] } };
        Pool?: new (c: object) => { query: SqlClient["query"] };
      }>;
      const mod = await load("pg");
      const Pool = mod.Pool ?? mod.default?.Pool;
      if (!Pool) return { client: null, livePostgres: false, reason: "DRIVER_ABSENT", attempts, lastError: "DRIVER_ABSENT" };
      const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 800, max: 2 });
      await pool.query("SELECT 1", []);
      return { client: pool, livePostgres: true, reason: "CONNECTED", attempts, lastError: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;
      if (msg.includes("Cannot find package") || msg.includes("MODULE_NOT_FOUND")) {
        return { client: null, livePostgres: false, reason: "DRIVER_ABSENT", attempts, lastError: msg };
      }
      if (i < delays.length - 1) await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
  return { client: null, livePostgres: false, reason: "CONNECT_FAILED", attempts, lastError };
}
