/** Telemetry for meta-recovery — correlation-scoped spans (ALPHA) */
export class MetaRecoveryTelemetry {
  constructor(private correlationId: string) {}

  span(name: string, data: Record<string, unknown> = {}) {
    return {
      correlationId: this.correlationId,
      name,
      at: new Date().toISOString(),
      ...data,
    };
  }
}

export function healthCheck(): { ok: true; service: string } {
  return { ok: true, service: "@scios/meta-recovery" };
}
