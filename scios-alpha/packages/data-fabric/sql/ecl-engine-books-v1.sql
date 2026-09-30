-- SCI OS ×10 — optional Postgres for ECL engine books + CanonicalLedger adapter.
-- ALPHA_NON_PRODUCTION. Not required for first-release boot (OPTIONAL_INFRA_DEGRADED).
-- durable=true only after a successful INSERT. autoTrade stays false. Not product READY.
-- Does not replace packages/data-fabric/src/ledger.ts semantics; this is the Wave-2 adapter store.

CREATE SCHEMA IF NOT EXISTS sci_ecl;
CREATE SCHEMA IF NOT EXISTS sci_ledger;

CREATE TABLE IF NOT EXISTS sci_ecl.ledger (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('DECISION', 'EXECUTION_PREVIEW')),
  instrument_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  analog BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ecl_ledger_instrument_ts
  ON sci_ecl.ledger (instrument_id, ts DESC);

CREATE TABLE IF NOT EXISTS sci_ecl.pnl_book (
  instrument_id TEXT PRIMARY KEY,
  pnl DOUBLE PRECISION NOT NULL,
  preview BOOLEAN NOT NULL DEFAULT TRUE,
  realized BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sci_ecl.risk_book (
  instrument_id TEXT PRIMARY KEY,
  risk DOUBLE PRECISION NOT NULL,
  skipped_unknown INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sci_ledger.canonical_entries (
  sequence BIGSERIAL PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE,
  ledger TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  actor TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  compensates TEXT
);

CREATE INDEX IF NOT EXISTS canonical_ledger_kind_seq
  ON sci_ledger.canonical_entries (ledger, sequence);
