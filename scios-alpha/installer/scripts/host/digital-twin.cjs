"use strict";

/**
 * WHI-011 — SCI Host Digital Twin projection (OBSERVE-FIRST).
 * Composes desired-state + ProcessSupervisor/WHI-001 ownership.
 * Does not orchestrate, repair, or kill. Product Kernel must not import this for Windows APIs.
 * ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { hostResult } = require("./contract.cjs");
const { buildDesiredState } = require("../startup/desired-state.cjs");
const { lockPath } = require("../startup/process-lock.cjs");
const { isPackagedLayout } = require("../startup/packaged-mode.cjs");
const { httpGetJson } = require("../startup/resolve-port.cjs");
const { snapshotResources } = require("./resource-intelligence.cjs");
const { isProcessAlive } = require("./job-object-provider.cjs");

const CANONICAL_SLICE_ID = "WHI-011";
const SCHEMA = "sci-os-host-digital-twin/v1";

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function hostId() {
  try {
    return crypto.createHash("sha256").update(String(os.hostname() || "unknown")).digest("hex").slice(0, 16);
  } catch {
    return "UNKNOWN";
  }
}

function readBuildIdentity(appRoot) {
  return (
    readJsonSafe(path.join(appRoot, "manifests", "build-identity.json")) ||
    readJsonSafe(path.join(appRoot, "diagnostics-export", "cursor-repair", "build-identity.json")) ||
    null
  );
}

function processAlive(pid) {
  if (!pid) return false;
  try {
    return isProcessAlive(pid);
  } catch {
    return false;
  }
}

function coarseNetwork() {
  try {
    const ifs = os.networkInterfaces() || {};
    let hasLoopback = false;
    let hasExternal = false;
    for (const list of Object.values(ifs)) {
      for (const n of list || []) {
        if (n.internal) hasLoopback = true;
        else hasExternal = true;
      }
    }
    if (hasExternal) return "NETWORK_AVAILABLE";
    if (hasLoopback) return "LOCAL_ONLY";
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function loadJobState(appRoot) {
  return readJsonSafe(path.join(appRoot, "diagnostics-export", "host", "job-object-state.json"));
}

function loadLock(appRoot) {
  const p = lockPath(appRoot);
  if (!fs.existsSync(p)) {
    return { path: p, present: false, ownerPid: null, ownerAlive: false, staleCandidate: false, payload: null };
  }
  const payload = readJsonSafe(p);
  const ownerPid = payload && payload.pid;
  const ownerAlive = processAlive(ownerPid);
  return {
    path: p,
    present: true,
    ownerPid: ownerPid || null,
    ownerAlive,
    startedAt: payload && payload.startedAt,
    staleCandidate: !!(payload && ownerPid && !ownerAlive),
    payload,
  };
}

async function probePort(port, expectedService) {
  const listening = await new Promise((resolve) => {
    const net = require("net");
    const s = net.connect({ host: "127.0.0.1", port }, () => {
      s.end();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.setTimeout(400, () => {
      s.destroy();
      resolve(false);
    });
  });
  const hz = await httpGetJson(`http://127.0.0.1:${port}/healthz`, 1500);
  const service = hz.body && typeof hz.body === "object" ? hz.body.service : null;
  let ownerClass = "unbound";
  if (!listening && hz.status === 0) ownerClass = "unbound";
  else if (hz.status === 200 && expectedService && service === expectedService) ownerClass = "sci";
  else if (hz.status === 200 && service) ownerClass = "sci-other";
  else if (listening) ownerClass = "foreign";
  else ownerClass = "unknown";
  return {
    port,
    bound: listening === true || hz.status > 0,
    ownerClass,
    service: service || null,
    status: hz.status || 0,
  };
}

function driftItem(type, severity, expected, actual, extra = {}) {
  return {
    driftId: `${type}:${crypto.randomBytes(3).toString("hex")}`,
    type,
    severity,
    expected,
    actual,
    observedAt: extra.observedAt || new Date().toISOString(),
    evidence: extra.evidence || null,
    repairAuthority: extra.repairAuthority || "NONE_THIS_SLICE",
    repairAllowed: extra.repairAllowed === true,
  };
}

function buildDesiredHostState(opts = {}) {
  const appRoot = opts.appRoot || process.cwd();
  const packaged = opts.packaged != null ? !!opts.packaged : isPackagedLayout(appRoot);
  const identity = opts.buildIdentity || readBuildIdentity(appRoot);
  const runtimeDesired = buildDesiredState({
    packaged,
    apiPort: opts.apiPort || 3000,
    cockpitPort: opts.cockpitPort || 4000,
    profile: opts.profile || "local-foundation",
  });
  const lifecycle = opts.expectedLifecycle || "RUNNING";
  return {
    lifecycle,
    packaged,
    buildId: (identity && identity.buildId) || opts.expectedBuildId || null,
    gitSha: (identity && identity.gitSha) || opts.expectedGitSha || null,
    nodeRuntime: packaged ? "20.18.1" : (opts.expectedNode || null),
    nodeMajor: 20,
    nodeMinor: 18,
    installRoot: appRoot,
    runtimeMode: packaged ? "packaged" : "development",
    jobContainmentExpected: process.platform === "win32" && lifecycle === "RUNNING",
    components: runtimeDesired.components,
    ports: {
      controlPlane: runtimeDesired.components.ControlPlane.port,
      cockpit: runtimeDesired.components.Shell.port,
      recovery: 5299,
    },
    processes:
      lifecycle === "STOPPED"
        ? {}
        : {
            "control-plane": { expectedRunning: true, expectedPort: runtimeDesired.components.ControlPlane.port },
            cockpit: { expectedRunning: true, expectedPort: runtimeDesired.components.Shell.port },
          },
  };
}

function classifyDrift(desired, actual, opts = {}) {
  const observedAt = actual.observedAt || new Date().toISOString();
  const drift = [];
  const stopped = desired.lifecycle === "STOPPED";

  if (opts.staleRejected) {
    drift.push(
      driftItem(
        "STALE_OBSERVATION_REJECTED",
        "P2",
        { runId: opts.currentRunId },
        { runId: opts.staleRunId },
        { observedAt, evidence: "prior observation runId mismatch — not merged into actual" }
      )
    );
  }

  if (stopped) {
    return drift;
  }

  if (desired.buildId && actual.runtime && actual.runtime.buildId && desired.buildId !== actual.runtime.buildId) {
    drift.push(
      driftItem("BUILD_MISMATCH", "P1", desired.buildId, actual.runtime.buildId, { observedAt })
    );
  }

  const nodeVer = actual.runtime && actual.runtime.nodeVersion;
  if (desired.packaged && nodeVer) {
    const m = String(nodeVer).replace(/^v/, "").match(/^(\d+)\.(\d+)/);
    if (!m || Number(m[1]) !== desired.nodeMajor || Number(m[2]) < desired.nodeMinor) {
      drift.push(
        driftItem("NODE_RUNTIME_MISMATCH", "P1", `v${desired.nodeMajor}.${desired.nodeMinor}.x`, nodeVer, {
          observedAt,
        })
      );
    }
  }

  if (desired.installRoot && actual.runtime && actual.runtime.installRoot && desired.installRoot !== actual.runtime.installRoot) {
    drift.push(
      driftItem("INSTALL_ROOT_MISMATCH", "P2", desired.installRoot, actual.runtime.installRoot, { observedAt })
    );
  }

  const expectedProcs = desired.processes || {};
  const actualProcs = actual.processes || {};
  for (const [role, exp] of Object.entries(expectedProcs)) {
    const got = actualProcs[role];
    if (exp.expectedRunning && (!got || got.actualRunning !== true)) {
      drift.push(
        driftItem("PROCESS_MISSING", "P1", { role, running: true }, got || null, { observedAt })
      );
    } else if (
      got &&
      got.actualRunning &&
      desired.jobContainmentExpected &&
      got.jobAttached !== true &&
      (actual.job && actual.job.status === "JOB_OBJECT_ACTIVE")
    ) {
      drift.push(
        driftItem("PROCESS_NOT_CONTAINED", "P1", { role, jobAttached: true }, { jobAttached: got.jobAttached }, {
          observedAt,
          evidence: "ProcessSupervisor registered but Job Object attach false",
        })
      );
    }
  }
  for (const [role, got] of Object.entries(actualProcs)) {
    if (!expectedProcs[role] && got && got.actualRunning) {
      drift.push(driftItem("PROCESS_UNEXPECTED", "P2", null, { role, pid: got.pid }, { observedAt }));
    }
  }

  const ports = actual.ports || {};
  const cp = ports.controlPlane;
  const ui = ports.cockpit;
  if (cp && !cp.bound) {
    drift.push(driftItem("PORT_MISSING", "P1", { port: desired.ports.controlPlane, owner: "sci" }, cp, { observedAt }));
  } else if (cp && (cp.ownerClass === "foreign" || cp.ownerClass === "unknown") && cp.bound) {
    drift.push(
      driftItem("PORT_FOREIGN_OWNER", "P1", { port: desired.ports.controlPlane, ownerClass: "sci" }, cp, { observedAt })
    );
  }
  if (ui && !ui.bound) {
    drift.push(driftItem("PORT_MISSING", "P1", { port: desired.ports.cockpit, owner: "sci" }, ui, { observedAt }));
  } else if (ui && (ui.ownerClass === "foreign" || ui.ownerClass === "unknown") && ui.bound) {
    drift.push(
      driftItem("PORT_FOREIGN_OWNER", "P1", { port: desired.ports.cockpit, ownerClass: "sci" }, ui, { observedAt })
    );
  }

  if (actual.locks && actual.locks.staleCandidate) {
    drift.push(
      driftItem("LOCK_STALE_CANDIDATE", "P2", { present: true, ownerAlive: true }, actual.locks, {
        observedAt,
        repairAllowed: false,
        evidence: "Observe only — this slice does not delete locks",
      })
    );
  }

  const res = actual.resources || {};
  if (res.disk && res.disk.level === "CRITICAL") {
    drift.push(driftItem("LOW_DISK_OBSERVED", "P2", "HEALTHY", res.disk, { observedAt, repairAllowed: false }));
  }
  if (res.memory && res.memory.level === "PRESSURED") {
    drift.push(driftItem("MEMORY_PRESSURE_OBSERVED", "P2", "HEALTHY", res.memory, { observedAt, repairAllowed: false }));
  }
  if (res.memory && res.memory.level === "UNKNOWN") {
    drift.push(
      driftItem("HOST_SIGNAL_UNAVAILABLE", "P3", "MEASURED", "UNKNOWN", {
        observedAt,
        evidence: "optional memory metric unavailable — not HOST_FAILURE",
      })
    );
  }

  return drift;
}

function supervisorProcesses(supervisorSnap, lifecycle) {
  const services = (supervisorSnap && supervisorSnap.services) || {};
  const out = {};
  for (const [name, rec] of Object.entries(services)) {
    const running = rec.exitCode == null && processAlive(rec.pid);
    out[name] = {
      role: name,
      pid: rec.pid,
      parentPid: rec.ownership && rec.ownership.parentPid,
      jobAttached: rec.jobAttached === true,
      startedAt: rec.startedAt,
      expectedRunning: lifecycle === "RUNNING",
      actualRunning: running,
      source: "process-supervisor",
      executableHint: rec.ownership && rec.ownership.executable ? path.basename(String(rec.ownership.executable)) : null,
    };
  }
  return out;
}

async function observeActual(opts, desired) {
  const appRoot = opts.appRoot;
  const observedAt = new Date().toISOString();
  const identity = opts.buildIdentity || readBuildIdentity(appRoot);
  const packaged = desired.packaged;
  const jobState = opts.jobState || loadJobState(appRoot);
  const supervisor = opts.supervisor || null;
  const lock = opts.lock || loadLock(appRoot);

  let processes = {};
  if (supervisor && supervisor.services) {
    processes = supervisorProcesses(supervisor, desired.lifecycle);
  } else if (jobState && jobState.children && desired.lifecycle === "RUNNING") {
    for (const [name, rec] of Object.entries(jobState.children)) {
      processes[name] = {
        role: name,
        pid: rec.pid,
        parentPid: rec.ownership && rec.ownership.parentPid,
        jobAttached: rec.jobAttached === true,
        startedAt: rec.startedAt,
        expectedRunning: true,
        actualRunning: processAlive(rec.pid),
        source: "job-object-state",
      };
    }
  }

  const ports = opts.ports || {
    controlPlane: await probePort(desired.ports.controlPlane, "@scios/control-plane-api"),
    cockpit: await probePort(desired.ports.cockpit, "@scios/cockpit-ui"),
    recovery: await probePort(desired.ports.recovery, null),
  };

  const resourceResult = snapshotResources({
    root: appRoot,
    synthetic: opts.syntheticResources,
  });
  const resources = (resourceResult && resourceResult.data) || {
    memory: { level: "UNKNOWN" },
    disk: { level: "UNKNOWN" },
    cpu: { level: "UNKNOWN" },
  };

  let nodeVersion = process.version;
  if (packaged) {
    const bundled = path.join(appRoot, "runtime", "node", "node.exe");
    if (fs.existsSync(bundled)) {
      try {
        const { spawnSync } = require("child_process");
        const r = spawnSync(bundled, ["-p", "process.version"], {
          encoding: "utf8",
          windowsHide: true,
          timeout: 4000,
        });
        if (r.status === 0 && r.stdout) nodeVersion = String(r.stdout).trim();
      } catch {
        nodeVersion = (identity && identity.nodeRuntime && `v${identity.nodeRuntime}`) || "UNKNOWN";
      }
    }
  }

  const cpUp = ports.controlPlane && ports.controlPlane.status === 200;
  const uiUp = ports.cockpit && ports.cockpit.status === 200;
  let runtimeStatus = desired.lifecycle;
  if (desired.lifecycle === "STOPPED") {
    runtimeStatus = !cpUp && !uiUp ? "STOPPED" : "RUNNING";
  } else {
    runtimeStatus = cpUp || uiUp ? "RUNNING" : "STOPPED";
  }

  return {
    observedAt,
    runtimeStatus,
    runtime: {
      buildId: (identity && identity.buildId) || opts.buildId || null,
      gitSha: (identity && identity.gitSha) || opts.gitSha || null,
      nodeVersion,
      installRoot: appRoot,
      runtimeMode: packaged ? "packaged" : "development",
      bootId: (opts.runContext && opts.runContext.bootId) || (supervisor && supervisor.runContext && supervisor.runContext.bootId) || (jobState && jobState.runContext && jobState.runContext.bootId) || null,
      runId: (opts.runContext && opts.runContext.runId) || (supervisor && supervisor.runContext && supervisor.runContext.runId) || (jobState && jobState.runContext && jobState.runContext.runId) || null,
      correlationId: opts.correlationId || null,
    },
    processes,
    ports,
    locks: lock,
    resources: {
      memory: resources.memory,
      disk: resources.disk,
      cpu: resources.cpu,
      overall: resources.overall,
    },
    power: { state: opts.powerState || "UNKNOWN" },
    network: { coarse: opts.networkCoarse || coarseNetwork() },
    installation: {
      packaged,
      backendArtifact: fs.existsSync(path.join(appRoot, "backend", "server.cjs")),
      cockpitArtifact: fs.existsSync(path.join(appRoot, "cockpit", "index.mjs")) || fs.existsSync(path.join(appRoot, "cockpit", "index.js")),
    },
    job: (supervisor && supervisor.job) || (jobState && jobState.job) || { status: "UNKNOWN" },
  };
}

function composeSnapshot(desired, actual, drift, opts = {}) {
  return {
    schema: SCHEMA,
    slice: CANONICAL_SLICE_ID,
    label: "ALPHA_NON_PRODUCTION",
    identity: {
      platform: process.platform,
      hostId: hostId(),
      observedAt: actual.observedAt,
    },
    runtime: actual.runtime,
    processes: actual.processes,
    ports: actual.ports,
    locks: actual.locks,
    resources: actual.resources,
    power: actual.power,
    network: actual.network,
    installation: actual.installation,
    desired,
    actual: {
      runtimeStatus: actual.runtimeStatus,
      job: actual.job,
    },
    drift,
    maturity: {
      observeFirst: true,
      repairAllowed: false,
      stoppedIsNotFail: desired.lifecycle === "STOPPED",
      unknownIsNotHealthy: true,
    },
    evidence: {
      composedFrom: ["desired-state.cjs", "process-supervisor", "WHI-001 job-object-state", "sciSystemTwin.host"],
      notAuthorities: ["StartupDigitalTwin"],
      writePath: opts.writePath || null,
    },
  };
}

function writeHostTwinSnapshot(appRoot, snapshot) {
  const dir = path.join(appRoot, "diagnostics-export", "host");
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, "digital-twin.json");
  fs.writeFileSync(p, JSON.stringify(snapshot, null, 2) + "\n");
  return p;
}

async function projectHostTwin(opts = {}) {
  const appRoot = opts.appRoot || process.cwd();
  const desired = opts.desired || buildDesiredHostState(opts);

  let staleRejected = false;
  let staleRunId = null;
  if (opts.priorObservation) {
    const priorRun = opts.priorObservation.runtime && opts.priorObservation.runtime.runId;
    const currentRun =
      (opts.runContext && opts.runContext.runId) ||
      (opts.supervisor && opts.supervisor.runContext && opts.supervisor.runContext.runId);
    if (priorRun && currentRun && priorRun !== currentRun) {
      staleRejected = true;
      staleRunId = priorRun;
    }
  }

  const actual = opts.actual || (await observeActual(opts, desired));
  const drift = classifyDrift(desired, actual, {
    staleRejected,
    staleRunId,
    currentRunId: actual.runtime && actual.runtime.runId,
  });
  const snapshot = composeSnapshot(desired, actual, drift, opts);
  if (opts.write !== false) {
    snapshot.evidence.writePath = writeHostTwinSnapshot(appRoot, snapshot);
  }
  const mandatory = drift.filter((d) => d.severity === "P0" || (d.severity === "P1" && desired.lifecycle === "RUNNING"));
  return hostResult({
    capability: "host-digital-twin",
    mode: "LIVE",
    ok: true,
    degraded: mandatory.length > 0,
    data: snapshot,
  });
}

function attachToSciSystemTwin(dual, hostSnapshot) {
  if (!dual || !dual.sciSystemTwin) return dual;
  dual.sciSystemTwin.host = {
    schema: SCHEMA,
    slice: CANONICAL_SLICE_ID,
    observedAt: hostSnapshot && hostSnapshot.identity && hostSnapshot.identity.observedAt,
    runtimeStatus: hostSnapshot && hostSnapshot.actual && hostSnapshot.actual.runtimeStatus,
    driftCount: hostSnapshot && hostSnapshot.drift ? hostSnapshot.drift.length : 0,
    pointer: "diagnostics-export/host/digital-twin.json",
    note: "View only — process ownership remains ProcessSupervisor",
  };
  return dual;
}

module.exports = {
  CANONICAL_SLICE_ID,
  SCHEMA,
  projectHostTwin,
  buildDesiredHostState,
  classifyDrift,
  writeHostTwinSnapshot,
  attachToSciSystemTwin,
  composeSnapshot,
};
