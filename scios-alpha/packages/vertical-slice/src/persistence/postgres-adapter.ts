/**
 * B-010 PostgreSQL adapter — migrations, transactions, repository implementations.
 */
import { createHash } from "node:crypto";
import { MIGRATION_MANIFEST } from "./migration-manifest.js";
import type {
  DomainStateRecord,
  DomainStateRepository,
  EvidenceRecord,
  EvidenceRepository,
  ExperienceSpecRecord,
  ExperienceSpecRepository,
  JobAttemptRecord,
  JobAttemptRepository,
  JobRecord,
  JobRepository,
  LineageRecord,
  LineageRepository,
} from "./repository-types.js";

export const PERSISTENCE_SCHEMA_VERSION = "sci-os-persistence-schema/v1";

type PgPool = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  connect: () => Promise<{
    query: PgPool["query"];
    release: () => void;
  }>;
  end: () => Promise<void>;
};

let pool: PgPool | null = null;
let poolError: string | null = null;
let migrationsApplied = 0;
let lastMigration: string | null = null;

export function isPostgresConfigured(): boolean {
  return Boolean(
    (process.env.SCIOS_PG_URL || process.env.DATABASE_URL || "").trim()
  );
}

export function postgresConnectionString(): string | null {
  const url = (process.env.SCIOS_PG_URL || process.env.DATABASE_URL || "").trim();
  return url || null;
}

export async function getPostgresPool(): Promise<PgPool | null> {
  if (!isPostgresConfigured()) return null;
  if (pool) return pool;
  if (poolError) return null;
  try {
    const pg = await import("pg");
    const Pool = pg.Pool || pg.default?.Pool;
    if (!Pool) throw new Error("pg_pool_unavailable");
    pool = new Pool({
      connectionString: postgresConnectionString()!,
      max: 4,
      connectionTimeoutMillis: 5000,
    }) as PgPool;
    await pool.query("SELECT 1");
    return pool;
  } catch (e) {
    poolError = e instanceof Error ? e.message : String(e);
    pool = null;
    return null;
  }
}

export function getPostgresLastError(): string | null {
  return poolError;
}

function checksum(content: string) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export async function runPostgresMigrations(): Promise<{
  applied: string[];
  skipped: string[];
  error?: string;
}> {
  const p = await getPostgresPool();
  if (!p) {
    return { applied: [], skipped: [], error: poolError || "postgres_not_configured" };
  }

  const applied: string[] = [];
  const skipped: string[] = [];

  const client = await p.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE TABLE IF NOT EXISTS sci_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checksum TEXT NOT NULL
    )`);
    const files = MIGRATION_MANIFEST;
    for (const file of files) {
      const version = file.version;
      const sql = file.sql;
      const sum = checksum(sql);
      const existing = await client.query(
        "SELECT version FROM sci_migrations WHERE version = $1",
        [version]
      );
      if (existing.rows.length > 0) {
        skipped.push(version);
        continue;
      }
      await client.query(sql);
      await client.query(
        "INSERT INTO sci_migrations (version, checksum) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING",
        [version, sum]
      );
      applied.push(version);
    }
    await client.query("COMMIT");
    migrationsApplied = applied.length + skipped.length;
    lastMigration =
      (applied.length ? applied[applied.length - 1] : null) ??
      (skipped.length ? skipped[skipped.length - 1] : null) ??
      null;
    return { applied, skipped };
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : String(e);
    poolError = msg;
    return { applied, skipped, error: msg };
  } finally {
    client.release();
  }
}

export async function withPostgresTransaction<T>(
  fn: (query: PgPool["query"]) => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const p = await getPostgresPool();
  if (!p) return { ok: false, error: poolError || "postgres_unavailable" };
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const value = await fn((text, params) => client.query(text, params));
    await client.query("COMMIT");
    return { ok: true, value };
  } catch (e) {
    await client.query("ROLLBACK");
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    client.release();
  }
}

export function createPostgresJobRepository(): JobRepository {
  return {
    async upsert(job) {
      const p = await getPostgresPool();
      if (!p) throw new Error("postgres_unavailable");
      await p.query(
        `INSERT INTO sci_jobs (job_id, payload, state, lifecycle_state, current_attempt, max_attempts, correlation_id, actor, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT (job_id) DO UPDATE SET
           payload = EXCLUDED.payload,
           state = EXCLUDED.state,
           lifecycle_state = EXCLUDED.lifecycle_state,
           current_attempt = EXCLUDED.current_attempt,
           max_attempts = EXCLUDED.max_attempts,
           correlation_id = EXCLUDED.correlation_id,
           actor = EXCLUDED.actor,
           updated_at = NOW()`,
        [
          job.jobId,
          JSON.stringify(job.payload),
          job.state,
          job.lifecycleState || null,
          job.currentAttempt,
          job.maxAttempts,
          job.correlationId || null,
          job.actor ? JSON.stringify(job.actor) : null,
        ]
      );
    },
    async get(jobId) {
      const p = await getPostgresPool();
      if (!p) return null;
      const r = await p.query("SELECT * FROM sci_jobs WHERE job_id = $1", [jobId]);
      if (!r.rows.length) return null;
      const row = r.rows[0]!;
      return {
        jobId: String(row.job_id),
        payload: row.payload as Record<string, unknown>,
        state: String(row.state),
        lifecycleState: (row.lifecycle_state as string) || null,
        currentAttempt: Number(row.current_attempt),
        maxAttempts: Number(row.max_attempts),
        correlationId: (row.correlation_id as string) || null,
        actor: (row.actor as Record<string, unknown>) || null,
      };
    },
    async count() {
      const p = await getPostgresPool();
      if (!p) return 0;
      const r = await p.query("SELECT COUNT(*)::int AS c FROM sci_jobs");
      return Number(r.rows[0]?.c || 0);
    },
  };
}

export function createPostgresJobAttemptRepository(): JobAttemptRepository {
  return {
    async insert(attempt) {
      const p = await getPostgresPool();
      if (!p) throw new Error("postgres_unavailable");
      await p.query(
        `INSERT INTO sci_job_attempts (attempt_id, job_id, attempt_number, state, error, started_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (attempt_id) DO NOTHING`,
        [
          attempt.attemptId,
          attempt.jobId,
          attempt.attemptNumber,
          attempt.state,
          attempt.error ? JSON.stringify(attempt.error) : null,
          attempt.startedAt || null,
          attempt.completedAt || null,
        ]
      );
    },
    async listForJob(jobId) {
      const p = await getPostgresPool();
      if (!p) return [];
      const r = await p.query(
        "SELECT * FROM sci_job_attempts WHERE job_id = $1 ORDER BY attempt_number",
        [jobId]
      );
      return r.rows.map((row) => ({
        attemptId: String(row.attempt_id),
        jobId: String(row.job_id),
        attemptNumber: Number(row.attempt_number),
        state: String(row.state),
        error: row.error,
        startedAt: (row.started_at as string) || null,
        completedAt: (row.completed_at as string) || null,
      }));
    },
  };
}

export function createPostgresEvidenceRepository(): EvidenceRepository {
  return {
    async insert(evidence) {
      const p = await getPostgresPool();
      if (!p) throw new Error("postgres_unavailable");
      await p.query(
        `INSERT INTO sci_evidence (evidence_id, job_id, run_id, kind, payload)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (evidence_id) DO NOTHING`,
        [
          evidence.evidenceId,
          evidence.jobId || null,
          evidence.runId || null,
          evidence.kind,
          JSON.stringify(evidence.payload),
        ]
      );
    },
    async count() {
      const p = await getPostgresPool();
      if (!p) return 0;
      const r = await p.query("SELECT COUNT(*)::int AS c FROM sci_evidence");
      return Number(r.rows[0]?.c || 0);
    },
  };
}

export function createPostgresLineageRepository(): LineageRepository {
  return {
    async upsert(lineage) {
      const p = await getPostgresPool();
      if (!p) throw new Error("postgres_unavailable");
      await p.query(
        `INSERT INTO sci_lineage (lineage_id, run_id, tip_hash, payload)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (lineage_id) DO UPDATE SET tip_hash = EXCLUDED.tip_hash, payload = EXCLUDED.payload`,
        [lineage.lineageId, lineage.runId, lineage.tipHash || null, JSON.stringify(lineage.payload)]
      );
    },
    async count() {
      const p = await getPostgresPool();
      if (!p) return 0;
      const r = await p.query("SELECT COUNT(*)::int AS c FROM sci_lineage");
      return Number(r.rows[0]?.c || 0);
    },
  };
}

export function createPostgresDomainStateRepository(): DomainStateRepository {
  return {
    async upsert(state) {
      const p = await getPostgresPool();
      if (!p) throw new Error("postgres_unavailable");
      await p.query(
        `INSERT INTO sci_domain_state (domain_key, payload, version, updated_at)
         VALUES ($1,$2,$3,NOW())
         ON CONFLICT (domain_key) DO UPDATE SET payload = EXCLUDED.payload, version = EXCLUDED.version, updated_at = NOW()`,
        [state.domainKey, JSON.stringify(state.payload), state.version]
      );
    },
    async get(domainKey) {
      const p = await getPostgresPool();
      if (!p) return null;
      const r = await p.query("SELECT * FROM sci_domain_state WHERE domain_key = $1", [domainKey]);
      if (!r.rows.length) return null;
      const row = r.rows[0]!;
      return {
        domainKey: String(row.domain_key),
        payload: row.payload as Record<string, unknown>,
        version: Number(row.version),
      };
    },
  };
}

export function createPostgresExperienceSpecRepository(): ExperienceSpecRepository {
  return {
    async upsert(spec) {
      const p = await getPostgresPool();
      if (!p) throw new Error("postgres_unavailable");
      await p.query(
        `INSERT INTO sci_experience_specs (spec_id, object_id, role_id, compiler_version, payload)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (spec_id) DO UPDATE SET payload = EXCLUDED.payload, compiler_version = EXCLUDED.compiler_version`,
        [
          spec.specId,
          spec.objectId || null,
          spec.roleId || null,
          spec.compilerVersion || null,
          JSON.stringify(spec.payload),
        ]
      );
    },
    async count() {
      const p = await getPostgresPool();
      if (!p) return 0;
      const r = await p.query("SELECT COUNT(*)::int AS c FROM sci_experience_specs");
      return Number(r.rows[0]?.c || 0);
    },
  };
}

export function getMigrationState() {
  return { migrationsApplied, lastMigration, poolError };
}

export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
