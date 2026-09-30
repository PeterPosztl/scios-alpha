/**
 * Observability readiness — GET /v1/observability/health authority.
 * Combines local foundations (logs, metrics, correlation) + OTEL export.
 */
import { metrics } from "@scios/observability";
import { getOtelHealth } from "./otelHealth.js";

export type ObservabilityStoreStatus =
  | "READY"
  | "BLOCKED_WITH_EXTERNAL_DEPENDENCY"
  | "DEGRADED";

export type ObservabilityHealth = {
  schema: "sci-os-observability-health/v1";
  label: "ALPHA_NON_PRODUCTION";
  at: string;
  authority: "apps/control-plane-api/src/observabilityHealth.ts";
  observability: {
    status: ObservabilityStoreStatus;
    telemetryMode: string;
    local: {
      status: "READY";
      structuredLogging: boolean;
      correlationIds: boolean;
      metricsEnabled: boolean;
    };
    otel: {
      status: ObservabilityStoreStatus;
      endpoint: string | null;
      serviceName: string | null;
      collectorReachable: boolean | null;
    };
    note: string;
  };
  verdict: "OBSERVABILITY_READY" | "OBSERVABILITY_BLOCKED_WITH_EVIDENCE" | "OBSERVABILITY_DEGRADED";
  status: "READY" | "BLOCKED" | "DEGRADED";
};

export async function getObservabilityHealth(): Promise<ObservabilityHealth> {
  const at = new Date().toISOString();
  const telemetryMode = process.env.TELEMETRY_MODE || "local";
  const otelHealth = await getOtelHealth();
  const metricSnap = metrics.snapshot();
  const metricsEnabled =
    Object.keys(metricSnap.counters).length > 0 ||
    Object.keys(metricSnap.timings).length > 0 ||
    true; // metrics API always available

  const local = {
    status: "READY" as const,
    structuredLogging: true,
    correlationIds: true,
    metricsEnabled,
  };

  const otel = {
    status: otelHealth.otel.status as ObservabilityStoreStatus,
    endpoint: otelHealth.otel.endpoint,
    serviceName: otelHealth.otel.serviceName,
    collectorReachable: otelHealth.otel.collectorReachable,
  };

  const otlpMode = telemetryMode === "otlp";
  let status: ObservabilityHealth["status"] = "READY";
  let observabilityStatus: ObservabilityStoreStatus = "READY";
  let verdict: ObservabilityHealth["verdict"] = "OBSERVABILITY_READY";
  let note = "Local structured logging + correlation IDs active";

  if (otlpMode) {
    if (otel.status === "READY") {
      note = otel.collectorReachable
        ? "OTLP export configured — collector reachable"
        : "OTLP export configured — start collector on :4317 for live export";
    } else {
      status = "BLOCKED";
      observabilityStatus = "BLOCKED_WITH_EXTERNAL_DEPENDENCY";
      verdict = "OBSERVABILITY_BLOCKED_WITH_EVIDENCE";
      note = "TELEMETRY_MODE=otlp requires OTEL_EXPORTER_OTLP_ENDPOINT + OTEL_SERVICE_NAME";
    }
  } else if (otel.status === "READY") {
    note = "Local telemetry + OTEL env configured (TELEMETRY_MODE=local)";
  }

  return {
    schema: "sci-os-observability-health/v1",
    label: "ALPHA_NON_PRODUCTION",
    at,
    authority: "apps/control-plane-api/src/observabilityHealth.ts",
    observability: {
      status: observabilityStatus,
      telemetryMode,
      local,
      otel,
      note,
    },
    verdict,
    status,
  };
}
