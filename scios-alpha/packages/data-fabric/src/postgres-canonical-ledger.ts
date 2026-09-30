/**
 * Wave-2 CanonicalLedger adapter over optional Postgres.
 * Same append-only semantics as InMemoryCanonicalLedger. durable only if INSERT succeeds.
 * ALPHA_NON_PRODUCTION. autoTrade=false. Not enterprise READY.
 */
import type { CanonicalLedger, LedgerEntry, LedgerKind } from "./ledger.js";
import type { SqlClient } from "./sql-client.js";

export const CANONICAL_LEDGER_SQL = {
  insert: `INSERT INTO sci_ledger.canonical_entries
    (entry_id, ledger, at, actor, tenant_id, correlation_id, payload, compensates)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
    RETURNING sequence, entry_id, ledger, at, actor, tenant_id, correlation_id, payload, compensates`,
  list: `SELECT sequence, entry_id, ledger, at, actor, tenant_id, correlation_id, payload, compensates
    FROM sci_ledger.canonical_entries
    WHERE ledger = $1 AND sequence > $2
    ORDER BY sequence ASC`,
  get: `SELECT sequence, entry_id, ledger, at, actor, tenant_id, correlation_id, payload, compensates
    FROM sci_ledger.canonical_entries WHERE entry_id = $1 LIMIT 1`,
} as const;

function rowToEntry(row: Record<string, unknown>): LedgerEntry {
  return {
    sequence: Number(row.sequence),
    entryId: String(row.entry_id ?? row.entryId),
    ledger: String(row.ledger) as LedgerKind,
    at: row.at instanceof Date ? row.at.toISOString() : String(row.at),
    actor: String(row.actor),
    tenantId: String(row.tenant_id ?? row.tenantId),
    correlationId: String(row.correlation_id ?? row.correlationId),
    payload: row.payload,
    compensates: row.compensates == null ? undefined : String(row.compensates),
  };
}

export class PostgresCanonicalLedger implements CanonicalLedger {
  readonly backend = "postgres-adapter" as const;
  readonly autoTrade = false as const;
  readonly ready = false as const;

  constructor(private readonly client: SqlClient) {}

  async append<T>(entry: Omit<LedgerEntry<T>, "sequence">): Promise<LedgerEntry<T>> {
    const result = await this.client.query(CANONICAL_LEDGER_SQL.insert, [
      entry.entryId,
      entry.ledger,
      entry.at,
      entry.actor,
      entry.tenantId,
      entry.correlationId,
      entry.payload,
      entry.compensates ?? null,
    ]);
    const row = result.rows[0];
    if (!row) throw new Error("canonical_ledger_insert_returned_no_row");
    return rowToEntry(row) as LedgerEntry<T>;
  }

  async list(ledger: LedgerKind, afterSequence = 0): Promise<LedgerEntry[]> {
    const result = await this.client.query(CANONICAL_LEDGER_SQL.list, [ledger, afterSequence]);
    return result.rows.map(rowToEntry);
  }

  async get(entryId: string): Promise<LedgerEntry | undefined> {
    const result = await this.client.query(CANONICAL_LEDGER_SQL.get, [entryId]);
    const row = result.rows[0];
    return row ? rowToEntry(row) : undefined;
  }
}

/** In-process stand-in so tests prove SQL identity without a live cluster. livePostgres=false. */
export function createMemoryCanonicalSqlClient(): SqlClient {
  const rows: Record<string, unknown>[] = [];
  let seq = 0;
  return {
    async query(sql, params = []) {
      if (sql === CANONICAL_LEDGER_SQL.insert) {
        seq += 1;
        const row = {
          sequence: seq,
          entry_id: params[0],
          ledger: params[1],
          at: params[2],
          actor: params[3],
          tenant_id: params[4],
          correlation_id: params[5],
          payload: params[6],
          compensates: params[7],
        };
        rows.push(row);
        return { rows: [row] };
      }
      if (sql === CANONICAL_LEDGER_SQL.list) {
        const ledger = params[0];
        const after = Number(params[1] ?? 0);
        return {
          rows: rows.filter((r) => r.ledger === ledger && Number(r.sequence) > after),
        };
      }
      if (sql === CANONICAL_LEDGER_SQL.get) {
        return { rows: rows.filter((r) => r.entry_id === params[0]).slice(0, 1) };
      }
      throw new Error("unknown_sql");
    },
  };
}
