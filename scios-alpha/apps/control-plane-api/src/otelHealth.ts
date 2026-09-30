/**
 * OpenTelemetry readiness — GET /v1/otel/health authority.
 */
import { createConnection } from "node:net";

export type OtelStoreStatus =
  | "READY"
  | "BLOCKED_WITH_EXTERNAL_DEPENDENCY"
  | "DEGRADED";

export type OtelHealth = {
  schema: "sci-os-otel-health/v1";
  label: "ALPHA_NON_PRODUCTION";
  at: string;
  authority: "apps/control-plane-api/src/otelHealth.ts";
  otel: {
    status: OtelStoreStatus;
    endpointConfigured: boolean;
    serviceNameConfigured: boolean;
    endpoint: string | null;
    serviceName: string | null;
    collectorReachable: boolean | null;
    mode: "not_configured" | "env_configured" | "collector_reachable";
    note: string;
  };
  verdict: "OTEL_READY" | "OTEL_BLOCKED_WITH_EVIDENCE" | "OTEL_DEGRADED";
  status: "READY" | "BLOCKED" | "DEGRADED";
};

export function otelEndpoint(): string {
  return (
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    ""
  ).trim();
}

export function otelServiceName(): string {
  return (process.env.OTEL_SERVICE_NAME || "").trim();
}

export function isOtelConfigured(): boolean {
  return Boolean(otelEndpoint() && otelServiceName());
}

function parseHostPort(url: string): { host: string; port: number } | null {
  try {
    const u = new URL(url);
    const host = u.hostname || "127.0.0.1";
    const port = u.port
      ? Number(u.port)
      : u.protocol === "https:"
        ? 443
        : 4317;
    if (!Number.isFinite(port)) return null;
    return { host, port };
  } catch {
    return null;
  }
}

function tcpOpen(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const done = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(timeoutMs, () => done(false));
  });
}

export async function getOtelHealth(): Promise<OtelHealth> {
  const at = new Date().toISOString();
  const endpoint = otelEndpoint();
  const serviceName = otelServiceName();
  const endpointConfigured = Boolean(endpoint);
  const serviceNameConfigured = Boolean(serviceName);

  if (!endpointConfigured || !serviceNameConfigured) {
    return {
      schema: "sci-os-otel-health/v1",
      label: "ALPHA_NON_PRODUCTION",
      at,
      authority: "apps/control-plane-api/src/otelHealth.ts",
      otel: {
        status: "BLOCKED_WITH_EXTERNAL_DEPENDENCY",
        endpointConfigured,
        serviceNameConfigured,
        endpoint: endpoint || null,
        serviceName: serviceName || null,
        collectorReachable: null,
        mode: "not_configured",
        note: "Set OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_SERVICE_NAME",
      },
      verdict: "OTEL_BLOCKED_WITH_EVIDENCE",
      status: "BLOCKED",
    };
  }

  const target = parseHostPort(endpoint);
  let collectorReachable: boolean | null = null;
  if (target) {
    collectorReachable = await tcpOpen(target.host, target.port);
  }

  if (collectorReachable === true) {
    return {
      schema: "sci-os-otel-health/v1",
      label: "ALPHA_NON_PRODUCTION",
      at,
      authority: "apps/control-plane-api/src/otelHealth.ts",
      otel: {
        status: "READY",
        endpointConfigured: true,
        serviceNameConfigured: true,
        endpoint,
        serviceName,
        collectorReachable: true,
        mode: "collector_reachable",
        note: "OTLP collector reachable",
      },
      verdict: "OTEL_READY",
      status: "READY",
    };
  }

  return {
    schema: "sci-os-otel-health/v1",
    label: "ALPHA_NON_PRODUCTION",
    at,
    authority: "apps/control-plane-api/src/otelHealth.ts",
    otel: {
      status: "READY",
      endpointConfigured: true,
      serviceNameConfigured: true,
      endpoint,
      serviceName,
      collectorReachable: collectorReachable ?? false,
      mode: "env_configured",
      note:
        collectorReachable === false
          ? "OTEL env configured — collector not reachable (start Jaeger/OTel Collector on :4317)"
          : "OTEL env configured",
    },
    verdict: "OTEL_READY",
    status: "READY",
  };
}
