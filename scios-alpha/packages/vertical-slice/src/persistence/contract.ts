/**
 * B-010 persistence Beta contract.
 * ALPHA_NON_PRODUCTION
 */
export const PERSISTENCE_CONTRACT_SCHEMA = "sci-os-persistence-contract/v1";

export type StoreStatus = "PASS" | "READY" | "BLOCKED_WITH_EXTERNAL_DEPENDENCY" | "DEGRADED";

export type PersistenceStoreKind = "LOCAL" | "POSTGRES";

export const PERSISTENCE_TABLES = [
  "sci_migrations",
  "sci_jobs",
  "sci_job_attempts",
  "sci_evidence",
  "sci_lineage",
  "sci_domain_state",
  "sci_experience_specs",
] as const;

export type PersistenceTable = (typeof PERSISTENCE_TABLES)[number];

export interface RepositoryHealth {
  store: PersistenceStoreKind;
  status: StoreStatus;
  primary: boolean;
  path?: string;
  connectionStringConfigured?: boolean;
  migrationsApplied?: number;
  lastMigration?: string | null;
  note?: string;
}

export interface ConsistencyReport {
  ok: boolean;
  checks: Array<{
    name: string;
    local: number | string;
    postgres: number | string | null;
    match: boolean;
  }>;
}

export interface PersistenceHealth {
  schema: "sci-os-persistence-health/v1";
  label: "ALPHA_NON_PRODUCTION";
  at: string;
  authority: string;
  contract: typeof PERSISTENCE_CONTRACT_SCHEMA;
  local: RepositoryHealth;
  postgres: RepositoryHealth;
  fallback: {
    mode: "LOCAL_PRIMARY" | "PG_PRIMARY";
    degraded: boolean;
    note: string;
  };
  consistency: ConsistencyReport;
  backup: {
    localExportPath: string;
    supported: boolean;
  };
  verdict: "B_010_PERSISTENCE_BETA_READY" | "B_010_PERSISTENCE_BLOCKED_WITH_EVIDENCE";
  status: "READY" | "DEGRADED" | "BLOCKED";
}
