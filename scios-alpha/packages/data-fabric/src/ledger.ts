/**
 * Canonical Ledgers — Wave 1 append-only interface + in-memory adapter.
 * Durable hash-chained store: ABSENT.
 */

export type LedgerKind =
  | "events"
  | "features"
  | "decisions"
  | "predictions"
  | "calibrations"
  | "risk_approvals"
  | "orders"
  | "executions"
  | "outcomes"
  | "lineage"
  | "positions"
  | "cash"
  | "settlements"
  | "incidents"
  | "audit"
  | "model_deployments"
  | "policy_decisions";

export interface LedgerEntry<T = unknown> {
  sequence: number;
  entryId: string;
  ledger: LedgerKind;
  at: string;
  actor: string;
  tenantId: string;
  correlationId: string;
  payload: T;
  /** Compensating entries reference prior entryId — never mutate history. */
  compensates?: string;
}

export interface CanonicalLedger {
  append<T>(
    entry: Omit<LedgerEntry<T>, "sequence">
  ): Promise<LedgerEntry<T>>;
  list(ledger: LedgerKind, afterSequence?: number): Promise<LedgerEntry[]>;
  get(entryId: string): Promise<LedgerEntry | undefined>;
}

export class InMemoryCanonicalLedger implements CanonicalLedger {
  private seq = 0;
  private entries: LedgerEntry[] = [];

  async append<T>(
    entry: Omit<LedgerEntry<T>, "sequence">
  ): Promise<LedgerEntry<T>> {
    this.seq += 1;
    const full: LedgerEntry<T> = { ...entry, sequence: this.seq };
    this.entries.push(full as LedgerEntry);
    return full;
  }

  async list(ledger: LedgerKind, afterSequence = 0): Promise<LedgerEntry[]> {
    return this.entries.filter(
      (e) => e.ledger === ledger && e.sequence > afterSequence
    );
  }

  async get(entryId: string): Promise<LedgerEntry | undefined> {
    return this.entries.find((e) => e.entryId === entryId);
  }
}
