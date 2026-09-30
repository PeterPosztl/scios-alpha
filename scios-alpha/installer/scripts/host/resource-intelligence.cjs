"use strict";

/**
 * SCI Resource Intelligence — AUGMENT /readyz.dependencyMetrics.
 * Conservative thresholds. Not a dashboard island. ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const os = require("os");
const { hostResult } = require("./contract.cjs");

const DEFAULTS = {
  memPressured: 0.12,
  memCritical: 0.04,
  diskPressuredBytes: 2 * 1024 * 1024 * 1024,
  diskCriticalBytes: 256 * 1024 * 1024,
  cpuPressured: 0.85,
  cpuCritical: 0.97,
};

function classifyLevel(opts) {
  if (opts.unknown) return "UNKNOWN";
  if (opts.critical) return "CRITICAL";
  if (opts.pressured) return "PRESSURED";
  return "HEALTHY";
}

function snapshotResources(opts = {}) {
  const t = { ...DEFAULTS, ...(opts.thresholds || {}) };
  const synthetic = opts.synthetic || {};
  const total = synthetic.totalMem != null ? synthetic.totalMem : os.totalmem();
  const free = synthetic.freeMem != null ? synthetic.freeMem : os.freemem();
  const memRatio = total ? free / total : null;
  let diskFree = synthetic.diskFree;
  if (diskFree == null) {
    try {
      if (typeof fs.statfsSync === "function") {
        const s = fs.statfsSync(opts.root || process.cwd());
        diskFree = Number(s.bavail) * Number(s.bsize);
      }
    } catch {
      diskFree = null;
    }
  }
  const load = os.loadavg && os.loadavg()[0];
  const cpuCount = os.cpus().length || 1;
  const cpu = synthetic.cpu != null ? synthetic.cpu : load != null ? Math.min(1, load / cpuCount) : null;

  const memLevel = classifyLevel({
    unknown: memRatio == null,
    critical: memRatio != null && memRatio < t.memCritical,
    pressured: memRatio != null && memRatio < t.memPressured,
  });
  const diskLevel = classifyLevel({
    unknown: diskFree == null,
    critical: diskFree != null && diskFree < t.diskCriticalBytes,
    pressured: diskFree != null && diskFree < t.diskPressuredBytes,
  });
  const cpuLevel = classifyLevel({
    unknown: cpu == null,
    critical: cpu != null && cpu >= t.cpuCritical,
    pressured: cpu != null && cpu >= t.cpuPressured,
  });

  const worst = [memLevel, diskLevel, cpuLevel].includes("CRITICAL")
    ? "CRITICAL"
    : [memLevel, diskLevel, cpuLevel].includes("PRESSURED")
      ? "PRESSURED"
      : [memLevel, diskLevel, cpuLevel].includes("UNKNOWN")
        ? "UNKNOWN"
        : "HEALTHY";

  const canRunHeavyBackgroundWork = worst === "HEALTHY";
  const canRunNormalBackgroundWork = worst !== "CRITICAL";
  const resourcePressure = worst === "PRESSURED" || worst === "CRITICAL";

  return hostResult({
    capability: "resource-intelligence",
    mode: "SHADOW",
    ok: true,
    data: {
      schema: "sci-os-resource-intelligence/v1",
      thresholds: t,
      note: "Conservative ALPHA thresholds — not production SLOs",
      memory: { total, free, freeRatio: memRatio, level: memLevel },
      disk: { freeBytes: diskFree, level: diskLevel },
      cpu: { estimate: cpu, level: cpuLevel, note: "loadavg/ncpus on win may be 0 — UNKNOWN not FAIL" },
      process: {
        rss: process.memoryUsage().rss,
        pid: process.pid,
      },
      overall: worst,
      schedulerInputs: {
        canRunHeavyBackgroundWork,
        canRunNormalBackgroundWork,
        resourcePressure,
      },
      readinessNote:
        "PRESSURED must not equal NOT READY; CRITICAL disk may degrade optional update only",
    },
  });
}

module.exports = { snapshotResources, classifyLevel, DEFAULTS };
