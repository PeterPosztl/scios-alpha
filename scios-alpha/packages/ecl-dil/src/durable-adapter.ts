/**
 * Durable adapter status for Control Plane — ALPHA, not BETA fabric.
 * OPTIONAL_INFRA_READY only when live Postgres connect succeeded.
 * Product ready stays false. autoTrade stays false.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { EclLedgerDao } from "./ecl-ledger-dao.js";

export const DURABLE_ADAPTER_HOOKS = {
  schema: "sci-os-durable-adapter/v1" as const,
  label: "ALPHA_NON_PRODUCTION" as const,
  suite: "BUILD_SUITE_V3" as const,
  ready: false as const,
  autoTrade: false as const,
  fabric: "ALPHA_ADAPTER" as const,
  nextFabric: "BETA_FABRIC" as const,
  betaFabric: false as const,
  canonicalAdapter: "packages/data-fabric/adapter/ecl-ledger-adapter.cjs" as const,
  note: "Pool/retry/backoff prepared. durable=true only after INSERT. OPTIONAL_INFRA_READY ≠ product READY.",
};

/** Canonical path of this module, or null when the bundle format hides it. */
function moduleBasis(): string | null {
  try {
    const url = import.meta.url;
    if (typeof url !== "string" || !url.startsWith("file:")) return null;
    const file = fileURLToPath(url);
    try {
      return realpathSync(file);
    } catch {
      return file;
    }
  } catch {
    return null;
  }
}

/**
 * Can a pg driver be loaded, and from where?
 *
 * Anchored to this module's realpath rather than the raw import.meta.url,
 * because a consumer may expose the package through a symlinked path; resolving
 * from that path walks the consumer's dependency tree instead of ours. The same
 * build otherwise reported ABSENT under package tests and PRESENT under the
 * Control Plane. `basis` and `resolvedFrom` are reported so any answer is
 * auditable — dev loaders and the packaged bundle legitimately differ.
 *
 * This is an observation, not a safety invariant: livePostgres, durable and
 * optionalInfra are driven by the DAO, never by driver presence. A probe that
 * cannot complete reports UNKNOWN rather than a definitive ABSENT.
 */
function pgDriverProbe(): {
  state: "PRESENT" | "ABSENT" | "UNKNOWN";
  basis: string;
  resolvedFrom: string | null;
  probeError: string | null;
} {
  // The packaged backend is an esbuild CommonJS bundle, where import.meta.url is
  // empty. Deriving the basis must never throw out of this probe, and when the
  // module identity is unavailable the product root is the honest base to ask
  // "can the running product load pg?" — reported via `basis` either way.
  const basis = moduleBasis() ?? join(process.cwd(), "package.json");
  try {
    return {
      state: "PRESENT",
      basis,
      resolvedFrom: createRequire(basis).resolve("pg"),
      probeError: null,
    };
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
      return { state: "ABSENT", basis, resolvedFrom: null, probeError: null };
    }
    return {
      state: "UNKNOWN",
      basis,
      resolvedFrom: null,
      probeError: String((e as Error | null)?.message ?? e),
    };
  }
}

export function daemonHeartbeatPath() {
  if (process.env.SCIOS_DAEMON_HEARTBEAT) return process.env.SCIOS_DAEMON_HEARTBEAT;
  const local = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  return join(local, "SCI OS X10", "state", "sci-daemon-heartbeat.json");
}

export function readDaemonHeartbeat() {
  const path = daemonHeartbeatPath();
  if (!existsSync(path)) {
    return {
      status: "PREPARED_DISABLED" as const,
      running: false,
      wiredIntoBoot: false as const,
      autoTrade: false as const,
      previewMaintenance: true as const,
      enabledInBoot: false as const,
      ageMs: null as number | null,
      path,
    };
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { ts?: string; autoTrade?: boolean; pid?: number };
    const ts = raw.ts ? Date.parse(raw.ts) : NaN;
    const ageMs = Number.isFinite(ts) ? Date.now() - ts : null;
    const running = ageMs != null && ageMs < 90_000;
    return {
      status: running ? ("RUNNING_PREVIEW" as const) : ("PREPARED_DISABLED" as const),
      running,
      wiredIntoBoot: false as const,
      autoTrade: false as const,
      previewMaintenance: true as const,
      enabledInBoot: false as const,
      ageMs,
      pid: raw.pid ?? null,
      path,
    };
  } catch {
    return {
      status: "PREPARED_DISABLED" as const,
      running: false,
      wiredIntoBoot: false as const,
      autoTrade: false as const,
      previewMaintenance: true as const,
      enabledInBoot: false as const,
      ageMs: null as number | null,
      path,
    };
  }
}

export function buildDurableInfra(dao: EclLedgerDao, extra?: { connectReason?: string; poolAttempts?: number; lastError?: string | null }) {
  const connected = dao.connected === true && dao.livePostgres === true;
  const driver = pgDriverProbe();
  return {
    ...DURABLE_ADAPTER_HOOKS,
    connected: dao.connected,
    livePostgres: dao.livePostgres === true,
    pgDriver: driver.state,
    pgDriverProbe: { basis: driver.basis, resolvedFrom: driver.resolvedFrom, probeError: driver.probeError },
    daoBackend: dao.backend,
    durable: dao.connected,
    durableLineage: false as const,
    durableEvidence: false as const,
    durableKgRegistry: false as const,
    connectReason: extra?.connectReason ?? (dao.connected ? "INJECTED_OR_CONNECTED" : "NOT_CONFIGURED"),
    optionalInfra: connected ? ("OPTIONAL_INFRA_READY" as const) : ("OPTIONAL_INFRA_DEGRADED" as const),
    pool: {
      max: connected ? 2 : 0,
      idle: 0,
      total: connected ? 1 : 0,
      connected,
      attempts: extra?.poolAttempts ?? 0,
      lastError: extra?.lastError ?? null,
    },
    daemon: readDaemonHeartbeat(),
    enterpriseCompute: false as const,
  };
}
