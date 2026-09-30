/**
 * Injected SQL client for optional Postgres adapters.
 * No bundled `pg` driver — first release stays OPTIONAL_INFRA_DEGRADED without DATABASE_URL.
 */
export type SqlQueryResult = { rows: Record<string, unknown>[] };

export type SqlClient = {
  query(sql: string, params?: unknown[]): Promise<SqlQueryResult>;
};

export type SqlBackend = "none" | "injected" | "postgres";
