/**
 * B-010 persistence health — GET /v1/persistence/health authority.
 */
import { resolveSciDataRoot } from "../data-root.js";
import type { PersistenceHealth, RepositoryHealth } from "./contract.js";
import { exportLocalBackup, runConsistencyChecks } from "./consistency.js";
import { localBackupExportPath } from "./local-repository.js";
import {
  getMigrationState,
  getPostgresLastError,
  getPostgresPool,
  isPostgresConfigured,
  runPostgresMigrations,
} from "./postgres-adapter.js";

export async function bootPersistenceLayer(): Promise<Record<string, unknown>> {
  if (!isPostgresConfigured()) {
    return {
      schema: "sci-os-persistence-boot/v1",
      postgres: "BLOCKED_WITH_EXTERNAL_DEPENDENCY",
      local: "PASS",
    };
  }
  const migrations = await runPostgresMigrations();
  return {
    schema: "sci-os-persistence-boot/v1",
    postgres: migrations.error ? "BLOCKED_WITH_EXTERNAL_DEPENDENCY" : "READY",
    local: "PASS",
    migrations,
  };
}

export async function getPersistenceHealth(): Promise<PersistenceHealth> {
  const dataRoot = resolveSciDataRoot();
  let localPrimary = true;

  let postgres: RepositoryHealth = {
    store: "POSTGRES",
    status: "BLOCKED_WITH_EXTERNAL_DEPENDENCY",
    primary: false,
    connectionStringConfigured: false,
    note: "DATABASE_URL unset — FD-002 external dependency",
  };

  if (isPostgresConfigured()) {
    postgres.connectionStringConfigured = true;
    const pool = await getPostgresPool();
    const mig = getMigrationState();
    if (pool) {
      const migResult = await runPostgresMigrations();
      postgres = {
        store: "POSTGRES",
        status: migResult.error ? "DEGRADED" : "READY",
        primary: !migResult.error,
        connectionStringConfigured: true,
        migrationsApplied: mig.migrationsApplied + (migResult.applied?.length || 0),
        lastMigration: mig.lastMigration,
        note: migResult.error
          ? `Migration error: ${migResult.error}`
          : "PostgreSQL adapter READY — PG is runtime authority",
      };
      if (!migResult.error) localPrimary = false;
    } else {
      postgres = {
        store: "POSTGRES",
        status: "BLOCKED_WITH_EXTERNAL_DEPENDENCY",
        primary: false,
        connectionStringConfigured: true,
        note: getPostgresLastError() || "Connection failed",
      };
    }
  }

  const local: RepositoryHealth = {
    store: "LOCAL",
    status: "PASS",
    primary: localPrimary,
    path: dataRoot,
    note: localPrimary
      ? "Local-durable JSON — B-002/B-004 proven truth"
      : "Local-durable backup mirror — PG is primary",
  };

  const consistency = await runConsistencyChecks();
  const backup = exportLocalBackup();
  const postgresReady = postgres.status === "READY";
  const verdict = postgresReady
    ? "B_010_PERSISTENCE_BETA_READY"
    : "B_010_PERSISTENCE_BLOCKED_WITH_EVIDENCE";

  return {
    schema: "sci-os-persistence-health/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    authority: "packages/vertical-slice/src/persistence/health.ts",
    contract: "sci-os-persistence-contract/v1",
    local,
    postgres,
    fallback: {
      mode: postgresReady ? "PG_PRIMARY" : "LOCAL_PRIMARY",
      degraded: postgres.status === "DEGRADED" || postgres.status === "BLOCKED_WITH_EXTERNAL_DEPENDENCY",
      note: postgresReady
        ? "PostgreSQL is runtime authority; local-durable is backup mirror"
        : "Local-durable is sole truth — PG blocked or unavailable",
    },
    consistency,
    backup: {
      localExportPath: backup.path || localBackupExportPath(),
      supported: backup.ok,
    },
    verdict,
    status: postgresReady ? "READY" : local.status === "PASS" ? "BLOCKED" : "DEGRADED",
  };
}
