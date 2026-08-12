/**
 * Event System V2 — interface first (Wave 0).
 * In-memory adapter for unit tests. Production transport later (NATS/Kafka).
 */

export interface EventEnvelope<T = unknown> {
  schemaVersion: string;
  eventId: string;
  tenantId: string;
  correlationId: string;
  causationId?: string;
  eventTime: string;
  ingestionTime: string;
  producer: string;
  type: string;
  idempotencyKey: string;
  classification: "public" | "internal" | "confidential" | "restricted";
  payload: T;
}

export interface EventBus {
  publish<T>(event: EventEnvelope<T>): Promise<void>;
  subscribe(
    type: string,
    handler: (event: EventEnvelope) => Promise<void> | void
  ): () => void;
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<
    string,
    Array<(event: EventEnvelope) => Promise<void> | void>
  >();
  readonly deadLetters: EventEnvelope[] = [];

  async publish<T>(event: EventEnvelope<T>): Promise<void> {
    const list = this.handlers.get(event.type) ?? [];
    for (const h of list) {
      try {
        await h(event as EventEnvelope);
      } catch {
        this.deadLetters.push(event as EventEnvelope);
      }
    }
  }

  subscribe(
    type: string,
    handler: (event: EventEnvelope) => Promise<void> | void
  ): () => void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
    return () => {
      const next = (this.handlers.get(type) ?? []).filter((h) => h !== handler);
      this.handlers.set(type, next);
    };
  }
}

export function createEventEnvelope<T>(
  partial: Omit<EventEnvelope<T>, "ingestionTime" | "schemaVersion"> & {
    schemaVersion?: string;
  }
): EventEnvelope<T> {
  return {
    schemaVersion: partial.schemaVersion ?? "1.0.0",
    eventId: partial.eventId,
    tenantId: partial.tenantId,
    correlationId: partial.correlationId,
    causationId: partial.causationId,
    eventTime: partial.eventTime,
    ingestionTime: new Date().toISOString(),
    producer: partial.producer,
    type: partial.type,
    idempotencyKey: partial.idempotencyKey,
    classification: partial.classification,
    payload: partial.payload,
  };
}
