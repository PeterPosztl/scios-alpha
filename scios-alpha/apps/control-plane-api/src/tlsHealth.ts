/**
 * TLS readiness — GET /v1/tls/health authority.
 * Honest: READY when TLS flags + optional cert material are valid.
 */
import { existsSync, readFileSync } from "node:fs";

export type TlsStoreStatus =
  | "READY"
  | "BLOCKED_WITH_EXTERNAL_DEPENDENCY"
  | "DEGRADED";

export type TlsHealth = {
  schema: "sci-os-tls-health/v1";
  label: "ALPHA_NON_PRODUCTION";
  at: string;
  authority: "apps/control-plane-api/src/tlsHealth.ts";
  tls: {
    status: TlsStoreStatus;
    enabled: boolean;
    certPathConfigured: boolean;
    certPresent: boolean;
    certPasswordConfigured: boolean;
    termination: "local_pfx" | "env_flags" | "not_configured";
    note: string;
  };
  verdict: "TLS_READY" | "TLS_BLOCKED_WITH_EVIDENCE" | "TLS_DEGRADED";
  status: "READY" | "BLOCKED" | "DEGRADED";
};

export function isTlsEnabled(): boolean {
  return (
    process.env.TLS_ENABLED === "1" ||
    process.env.SCIOS_TLS === "1" ||
    process.env.SCI_TLS === "1"
  );
}

function tlsCertPath(): string {
  return (
    process.env.SCI_TLS_CERT_PATH ||
    process.env.SCIOS_TLS_CERT_PATH ||
    ""
  ).trim();
}

function tlsCertPasswordConfigured(): boolean {
  return Boolean(
    (process.env.SCI_TLS_CERT_PASSWORD || process.env.SCIOS_TLS_CERT_PASSWORD || "").trim()
  );
}

export function getTlsHealth(): TlsHealth {
  const at = new Date().toISOString();
  const enabled = isTlsEnabled();
  const certPath = tlsCertPath();
  const certPasswordConfigured = tlsCertPasswordConfigured();

  if (!enabled) {
    return {
      schema: "sci-os-tls-health/v1",
      label: "ALPHA_NON_PRODUCTION",
      at,
      authority: "apps/control-plane-api/src/tlsHealth.ts",
      tls: {
        status: "BLOCKED_WITH_EXTERNAL_DEPENDENCY",
        enabled: false,
        certPathConfigured: Boolean(certPath),
        certPresent: false,
        certPasswordConfigured,
        termination: "not_configured",
        note: "Set TLS_ENABLED=1 or SCIOS_TLS=1 — optional SCI_TLS_CERT_PATH for local PFX",
      },
      verdict: "TLS_BLOCKED_WITH_EVIDENCE",
      status: "BLOCKED",
    };
  }

  if (certPath) {
    if (!existsSync(certPath)) {
      return {
        schema: "sci-os-tls-health/v1",
        label: "ALPHA_NON_PRODUCTION",
        at,
        authority: "apps/control-plane-api/src/tlsHealth.ts",
        tls: {
          status: "DEGRADED",
          enabled: true,
          certPathConfigured: true,
          certPresent: false,
          certPasswordConfigured,
          termination: "local_pfx",
          note: `Certificate file not found: ${certPath}`,
        },
        verdict: "TLS_DEGRADED",
        status: "DEGRADED",
      };
    }
    try {
      readFileSync(certPath);
      return {
        schema: "sci-os-tls-health/v1",
        label: "ALPHA_NON_PRODUCTION",
        at,
        authority: "apps/control-plane-api/src/tlsHealth.ts",
        tls: {
          status: "READY",
          enabled: true,
          certPathConfigured: true,
          certPresent: true,
          certPasswordConfigured,
          termination: "local_pfx",
          note: certPasswordConfigured
            ? "TLS enabled with PFX material"
            : "TLS enabled with cert file (password optional for PEM)",
        },
        verdict: "TLS_READY",
        status: "READY",
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        schema: "sci-os-tls-health/v1",
        label: "ALPHA_NON_PRODUCTION",
        at,
        authority: "apps/control-plane-api/src/tlsHealth.ts",
        tls: {
          status: "DEGRADED",
          enabled: true,
          certPathConfigured: true,
          certPresent: false,
          certPasswordConfigured,
          termination: "local_pfx",
          note: `Certificate unreadable: ${msg}`,
        },
        verdict: "TLS_DEGRADED",
        status: "DEGRADED",
      };
    }
  }

  return {
    schema: "sci-os-tls-health/v1",
    label: "ALPHA_NON_PRODUCTION",
    at,
    authority: "apps/control-plane-api/src/tlsHealth.ts",
    tls: {
      status: "READY",
      enabled: true,
      certPathConfigured: false,
      certPresent: false,
      certPasswordConfigured,
      termination: "env_flags",
      note: "TLS flags configured — reverse-proxy or local PFX optional",
    },
    verdict: "TLS_READY",
    status: "READY",
  };
}
