"use strict";

const { redactUrl } = require("./validate-config.cjs");

/**
 * ALPHA: PostgreSQL not required for in-process vertical slice.
 * Returns honest classification — never fake reachable.
 */
function ensurePostgres() {
  const url = process.env.DATABASE_URL;
  if (!url || !String(url).trim()) {
    return {
      configured: false,
      reachable: false,
      authenticated: false,
      databaseExists: false,
      migrationsCurrent: false,
      provisioned: false,
      failureClass: null,
      nextAction: null,
      classification: "NOT_CONFIGURED_OPTIONAL",
      redactedUrl: null,
      note: "ALPHA spine uses in-memory ledger; DATABASE_URL optional",
    };
  }

  // Configured but no driver in ALPHA — do not claim success
  return {
    configured: true,
    reachable: false,
    authenticated: false,
    databaseExists: false,
    migrationsCurrent: false,
    provisioned: false,
    failureClass: "DATABASE_UNREACHABLE",
    nextAction: "Provide reachable Postgres or unset DATABASE_URL for ALPHA mode",
    classification: "CONFIGURED_BUT_UNVERIFIED",
    redactedUrl: redactUrl(url),
    note: "No pg client bundled in ALPHA startup — cannot fake SELECT 1",
  };
}

module.exports = { ensurePostgres };
