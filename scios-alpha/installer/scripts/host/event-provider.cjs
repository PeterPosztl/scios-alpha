"use strict";

/**
 * WHI-004 — SCI Host Event Provider: read-only Windows Event Log adapter.
 * Supplies bounded host evidence to SCI. Does NOT become another event
 * authority, recovery authority, or generic event browser.
 * ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const SCHEMA = "sci-os-host-event/v1";
const CANONICAL_SLICE_ID = "WHI-004";

// ─── Source allowlist ───────────────────────────────────────────────────────
const ALLOWED_LOGS = ["Application", "System"];
const ALLOWED_PROVIDERS = [
  "Application Error",
  "Application Hang",
  "Windows Error Reporting",
  ".NET Runtime",
  "Service Control Manager",
  "Microsoft-Windows-Kernel-Power",
  "Microsoft-Windows-Power-Troubleshooter",
  "EventLog",
  "Microsoft-Windows-Kernel-General",
  "Microsoft-Windows-WindowsUpdateClient",
  "Microsoft-Windows-TCPIP",
  "Microsoft-Windows-DNS-Client",
  "Microsoft-Windows-NetworkProfile",
];

// ─── Event categories ───────────────────────────────────────────────────────
const CATEGORIES = {
  APPLICATION_CRASH: { providers: ["Application Error", "Application Hang", "Windows Error Reporting", ".NET Runtime"], eventIds: [1000, 1001, 1002, 1026] },
  PROCESS_FAILURE: { providers: ["Application Error"], eventIds: [1000] },
  SERVICE_RUNTIME_EVENT: { providers: ["Service Control Manager"], eventIds: [7000, 7001, 7009, 7011, 7023, 7024, 7031, 7034, 7036, 7040, 7045] },
  POWER_EVENT: { providers: ["Microsoft-Windows-Kernel-Power", "Microsoft-Windows-Power-Troubleshooter"], eventIds: [1, 12, 41, 42, 107, 109, 131, 506, 507] },
  SYSTEM_SHUTDOWN_EVENT: { providers: ["EventLog", "Microsoft-Windows-Kernel-General"], eventIds: [1074, 6005, 6006, 6008, 6009, 12, 13] },
  SYSTEM_RESUME_EVENT: { providers: ["Microsoft-Windows-Power-Troubleshooter", "Microsoft-Windows-Kernel-Power"], eventIds: [1, 107, 131, 507] },
  NETWORK_RELEVANT_EVENT: { providers: ["Microsoft-Windows-TCPIP", "Microsoft-Windows-DNS-Client", "Microsoft-Windows-NetworkProfile"], eventIds: [] },
  SCI_INSTALL_RUNTIME_EVENT: { providers: ["Application Error", "Windows Error Reporting"], eventIds: [1000, 1001] },
  UNKNOWN_RELEVANT_HOST_EVENT: { providers: [], eventIds: [] },
};

// ─── Query defaults ─────────────────────────────────────────────────────────
const QUERY_DEFAULTS = {
  maxEvents: 50,
  maxAgeMinutes: 60,
  maxMessageLength: 500,
};

// ─── Redaction (reuse observability pattern) ────────────────────────────────
const SECRET_RE = /password|secret|api[_-]?key|token|authorization|credential|connection[_-]?string/i;

function redactMessage(msg) {
  if (!msg || typeof msg !== "string") return "";
  let safe = msg.slice(0, QUERY_DEFAULTS.maxMessageLength);
  safe = safe.replace(SECRET_RE, "[REDACTED]");
  safe = safe.replace(/<[^>]*>/g, "");
  safe = safe.replace(/[^\x20-\x7E\r\n\t]/g, "?");
  return safe;
}

// ─── HostEvent contract ─────────────────────────────────────────────────────
function createHostEvent(opts) {
  return {
    schema: SCHEMA,
    eventId: opts.eventId || `he_${crypto.randomBytes(6).toString("hex")}`,
    schemaVersion: "1",
    eventType: opts.eventType || "UNKNOWN_RELEVANT_HOST_EVENT",
    category: opts.category || "UNKNOWN_RELEVANT_HOST_EVENT",
    provider: "sci-host-event-provider",
    source: "windows-event-log",
    observedAt: opts.observedAt || new Date().toISOString(),
    occurredAt: opts.occurredAt || null,
    severity: opts.severity || "INFO",
    windows: {
      logName: opts.logName || null,
      providerName: opts.providerName || null,
      eventId: opts.windowsEventId != null ? opts.windowsEventId : null,
      recordId: opts.recordId != null ? opts.recordId : null,
    },
    sci: {
      buildId: opts.buildId || null,
      bootId: opts.bootId || null,
      runId: opts.runId || null,
      component: opts.component || null,
      pid: opts.pid || null,
      correlationId: opts.correlationId || null,
    },
    classification: opts.classification || "UNKNOWN",
    messageSafe: opts.messageSafe || "",
    evidenceRefs: opts.evidenceRefs || [],
    relevance: opts.relevance || "UNKNOWN",
  };
}

// ─── Categorize a Windows event ─────────────────────────────────────────────
function categorizeWindowsEvent(providerName, eventId) {
  for (const [cat, spec] of Object.entries(CATEGORIES)) {
    if (cat === "UNKNOWN_RELEVANT_HOST_EVENT") continue;
    const provMatch = spec.providers.length === 0 || spec.providers.includes(providerName);
    const idMatch = spec.eventIds.length === 0 || spec.eventIds.includes(eventId);
    if (provMatch && (idMatch || spec.eventIds.length === 0)) return cat;
  }
  return "UNKNOWN_RELEVANT_HOST_EVENT";
}

// ─── Severity from Windows level ────────────────────────────────────────────
function mapSeverity(level) {
  if (level === 1 || level === "Critical") return "CRITICAL";
  if (level === 2 || level === "Error") return "ERROR";
  if (level === 3 || level === "Warning") return "WARNING";
  return "INFO";
}

// ─── SCI Relevance classifier ───────────────────────────────────────────────
function classifyRelevance(event, sciContext) {
  if (!sciContext) return "UNKNOWN";
  const msg = (event.messageSafe || "").toLowerCase();
  const prov = (event.windows && event.windows.providerName) || "";

  if (sciContext.installRoot && msg.includes(sciContext.installRoot.toLowerCase())) return "PROVEN";
  if (sciContext.exeName && msg.includes(sciContext.exeName.toLowerCase())) return "PROVEN";

  if (sciContext.pids && event.windows && event.windows.eventId === 1000) {
    const pidMatch = msg.match(/faulting process id.*?0x([0-9a-f]+)/i);
    if (pidMatch) {
      const faultPid = parseInt(pidMatch[1], 16);
      if (sciContext.pids.includes(faultPid)) return "PROVEN";
    }
  }

  if (msg.includes("sci") && (msg.includes("os") || msg.includes("x10"))) return "PROBABLE";
  if (msg.includes("node.exe") && sciContext.installRoot) return "PROBABLE";

  if (["Service Control Manager", "Microsoft-Windows-Kernel-Power", "EventLog", "Microsoft-Windows-Kernel-General"].includes(prov)) {
    return "PROBABLE";
  }

  return "IRRELEVANT";
}

// ─── Correlation ────────────────────────────────────────────────────────────
function correlateToRun(event, runContext) {
  if (!runContext || !runContext.startedAt) return { correlated: false };
  const eventTime = event.occurredAt ? new Date(event.occurredAt).getTime() : 0;
  const runStart = new Date(runContext.startedAt).getTime();
  if (eventTime < runStart) return { correlated: false, reason: "HISTORICAL" };
  return {
    correlated: true,
    buildId: runContext.buildId || null,
    bootId: runContext.bootId || null,
    runId: runContext.runId || null,
  };
}

// ─── Deduplication ──────────────────────────────────────────────────────────
function deduplicationKey(event) {
  const w = event.windows || {};
  return `${w.logName || ""}|${w.providerName || ""}|${w.recordId || ""}|${w.eventId || ""}`;
}

// ─── Windows Event Log query ────────────────────────────────────────────────
function queryWindowsEvents(opts = {}) {
  const logName = opts.logName || "Application";
  if (!ALLOWED_LOGS.includes(logName)) {
    return { ok: false, error: "LOG_NOT_ALLOWED", logName };
  }
  const maxEvents = Math.min(opts.maxEvents || QUERY_DEFAULTS.maxEvents, 200);
  const maxAgeMinutes = opts.maxAgeMinutes || QUERY_DEFAULTS.maxAgeMinutes;

  const psScript = `
$ErrorActionPreference = 'Stop'
try {
  $since = (Get-Date).AddMinutes(-${maxAgeMinutes})
  $events = Get-WinEvent -LogName '${logName}' -MaxEvents ${maxEvents} -ErrorAction Stop | Where-Object { $_.TimeCreated -ge $since }
  $out = @()
  foreach ($e in $events) {
    $out += @{
      Id = $e.Id
      ProviderName = $e.ProviderName
      LogName = $e.LogName
      Level = $e.Level
      TimeCreated = $e.TimeCreated.ToUniversalTime().ToString('o')
      RecordId = $e.RecordId
      Message = if ($e.Message.Length -gt ${QUERY_DEFAULTS.maxMessageLength}) { $e.Message.Substring(0, ${QUERY_DEFAULTS.maxMessageLength}) } else { $e.Message }
      ProcessId = $e.ProcessId
    }
  }
  $out | ConvertTo-Json -Depth 3 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

  const startMs = Date.now();
  const r = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 15000,
  });
  const elapsed = Date.now() - startMs;

  if (r.status !== 0 || r.error) {
    return {
      ok: false,
      error: "POWERSHELL_FAILED",
      detail: r.error ? String(r.error) : (r.stderr || "").slice(0, 300),
      elapsed,
    };
  }

  const stdout = (r.stdout || "").trim();
  if (!stdout) {
    return { ok: true, events: [], count: 0, elapsed, empty: true };
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { ok: false, error: "PARSE_FAILED", raw: stdout.slice(0, 300), elapsed };
  }

  if (parsed && parsed.error) {
    return { ok: false, error: "WINEVENT_ERROR", detail: parsed.error, elapsed };
  }

  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return { ok: true, events: arr, count: arr.length, elapsed };
}

// ─── Normalize raw Windows events → HostEvents ─────────────────────────────
function normalizeEvents(rawEvents, sciContext, runContext) {
  const seen = new Set();
  const out = [];
  for (const raw of rawEvents) {
    if (!raw) continue;
    const providerName = raw.ProviderName || "";
    if (ALLOWED_PROVIDERS.length > 0 && !ALLOWED_PROVIDERS.includes(providerName)) continue;

    const windowsEventId = raw.Id != null ? Number(raw.Id) : null;
    const category = categorizeWindowsEvent(providerName, windowsEventId);
    const messageSafe = redactMessage(raw.Message);
    const severity = mapSeverity(raw.Level);

    const event = createHostEvent({
      eventType: category,
      category,
      occurredAt: raw.TimeCreated || null,
      severity,
      logName: raw.LogName || null,
      providerName,
      windowsEventId,
      recordId: raw.RecordId != null ? Number(raw.RecordId) : null,
      messageSafe,
      buildId: runContext && runContext.buildId,
      bootId: runContext && runContext.bootId,
      runId: runContext && runContext.runId,
      pid: raw.ProcessId != null ? Number(raw.ProcessId) : null,
    });

    event.relevance = classifyRelevance(event, sciContext);
    const corr = correlateToRun(event, runContext);
    if (corr.correlated) {
      event.sci.buildId = corr.buildId;
      event.sci.bootId = corr.bootId;
      event.sci.runId = corr.runId;
    }
    event.classification = corr.correlated ? "CURRENT_RUN" : "HISTORICAL";

    const dk = deduplicationKey(event);
    if (seen.has(dk)) continue;
    seen.add(dk);

    out.push(event);
  }
  return out;
}

// ─── High-level provider ────────────────────────────────────────────────────
class HostEventProvider {
  constructor(opts = {}) {
    this.appRoot = opts.appRoot || process.cwd();
    this.sciContext = opts.sciContext || null;
    this.runContext = opts.runContext || null;
    this.cache = { events: null, at: 0 };
    this.cacheTtlMs = opts.cacheTtlMs || 30000;
  }

  /**
   * Query + normalize + filter. Returns bounded HostEvent[].
   */
  query(opts = {}) {
    const now = Date.now();
    if (this.cache.events && (now - this.cache.at) < this.cacheTtlMs && !opts.force) {
      return { ok: true, events: this.cache.events, cached: true, elapsed: 0 };
    }

    const results = [];
    const perf = { queriedLogs: 0, rawScanned: 0, normalized: 0, retained: 0, totalElapsed: 0 };

    for (const logName of ALLOWED_LOGS) {
      perf.queriedLogs++;
      const raw = queryWindowsEvents({ logName, maxEvents: opts.maxEvents, maxAgeMinutes: opts.maxAgeMinutes });
      perf.totalElapsed += raw.elapsed || 0;
      if (!raw.ok) continue;
      perf.rawScanned += raw.count;
      const normalized = normalizeEvents(raw.events, this.sciContext, this.runContext);
      perf.normalized += normalized.length;
      for (const e of normalized) {
        if (opts.relevanceFilter && e.relevance === "IRRELEVANT") continue;
        results.push(e);
      }
    }
    perf.retained = results.length;
    this.cache = { events: results, at: now };
    return { ok: true, events: results, perf };
  }

  /**
   * Current-run events only.
   */
  currentRunEvents(opts = {}) {
    const all = this.query({ ...opts, force: true });
    if (!all.ok) return all;
    return {
      ok: true,
      events: all.events.filter((e) => e.classification === "CURRENT_RUN"),
      perf: all.perf,
    };
  }

  /**
   * Summary for Host Digital Twin enrichment (bounded).
   */
  twinProjection() {
    const result = this.query({ relevanceFilter: true });
    if (!result.ok) return { hostEventSignalState: "UNAVAILABLE" };
    const relevant = result.events.filter((e) => e.relevance === "PROVEN" || e.relevance === "PROBABLE");
    return {
      hostEventSignalState: relevant.length > 0 ? "SIGNALS_PRESENT" : "NO_SIGNALS",
      recentRelevantHostEvents: relevant.length,
      lastRelevantHostEventAt: relevant.length > 0 ? relevant[0].occurredAt : null,
      categories: [...new Set(relevant.map((e) => e.category))],
    };
  }

  /**
   * Test whether provider is available at all.
   */
  static capability() {
    if (process.platform !== "win32") {
      return { available: false, reason: "NOT_WINDOWS", degraded: true };
    }
    const r = spawnSync("powershell", ["-NoProfile", "-Command", "Get-WinEvent -ListLog Application -ErrorAction Stop | Select-Object -First 1 LogName | ConvertTo-Json"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 8000,
    });
    if (r.status !== 0) {
      return { available: false, reason: "GET_WINEVENT_FAILED", detail: (r.stderr || "").slice(0, 200), degraded: true };
    }
    return { available: true, mechanism: "Get-WinEvent", permissions: "standard_user" };
  }
}

module.exports = {
  SCHEMA,
  CANONICAL_SLICE_ID,
  ALLOWED_LOGS,
  ALLOWED_PROVIDERS,
  CATEGORIES,
  QUERY_DEFAULTS,
  HostEventProvider,
  createHostEvent,
  categorizeWindowsEvent,
  mapSeverity,
  classifyRelevance,
  correlateToRun,
  deduplicationKey,
  normalizeEvents,
  queryWindowsEvents,
  redactMessage,
};
