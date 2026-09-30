-- SCI OS persistence Beta schema (FD-002)
-- sci-os-persistence-schema/v1

CREATE TABLE IF NOT EXISTS sci_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sci_jobs (
  job_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  state TEXT NOT NULL,
  lifecycle_state TEXT,
  current_attempt INT NOT NULL DEFAULT 1,
  max_attempts INT NOT NULL DEFAULT 3,
  correlation_id TEXT,
  actor JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sci_job_attempts (
  attempt_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES sci_jobs(job_id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  state TEXT NOT NULL,
  error JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sci_job_attempts_job_id ON sci_job_attempts(job_id);

CREATE TABLE IF NOT EXISTS sci_evidence (
  evidence_id TEXT PRIMARY KEY,
  job_id TEXT,
  run_id TEXT,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sci_evidence_job_id ON sci_evidence(job_id);
CREATE INDEX IF NOT EXISTS idx_sci_evidence_run_id ON sci_evidence(run_id);

CREATE TABLE IF NOT EXISTS sci_lineage (
  lineage_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tip_hash TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sci_lineage_run_id ON sci_lineage(run_id);

CREATE TABLE IF NOT EXISTS sci_domain_state (
  domain_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sci_experience_specs (
  spec_id TEXT PRIMARY KEY,
  object_id TEXT,
  role_id TEXT,
  compiler_version TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sci_experience_specs_object ON sci_experience_specs(object_id);
