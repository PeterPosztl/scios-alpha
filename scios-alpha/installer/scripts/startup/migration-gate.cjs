"use strict";

/**
 * ALPHA: no SQL migrations. Gate records N/A honestly.
 */
function migrationGate() {
  return {
    lockAcquired: true,
    expectedVersion: "alpha-inmemory-0",
    installedVersion: "alpha-inmemory-0",
    pending: [],
    destructivePending: [],
    status: "NOT_APPLICABLE",
    ok: true,
    note: "No durable schema migrations in ALPHA vertical slice",
  };
}

module.exports = { migrationGate };
