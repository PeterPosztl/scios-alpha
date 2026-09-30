"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { isPackagedLayout } = require("./packaged-mode.cjs");

function readPkgEngines(appRoot) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(appRoot, "package.json"), "utf8")
    );
    return pkg.engines?.node || null;
  } catch {
    return null;
  }
}

function defaultPackagedContract() {
  // Packaged SCI OS runs on bundled Node 20.18.1 only.
  // Node 18 may wrap a thin pkg launcher, never the application runtime.
  return {
    nodeVersion: "20.18.1",
    acceptMajor: [20],
    requireMinor: 18,
    path: "runtime/node/node.exe",
  };
}

function readPackagedRuntimeContract(appRoot) {
  const p = path.join(appRoot, "config", "packaged.json");
  if (!fs.existsSync(p)) return defaultPackagedContract();
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const c = j.bundledRuntime || defaultPackagedContract();
    return {
      ...defaultPackagedContract(),
      ...c,
      acceptMajor: Array.isArray(c.acceptMajor) ? c.acceptMajor.filter((m) => m === 20) : [20],
    };
  } catch {
    return defaultPackagedContract();
  }
}

function parseSemver(version) {
  const m = String(version || "")
    .replace(/^v/, "")
    .match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function packagedVersionOk(version, contract) {
  const v = parseSemver(version);
  if (!v) return { ok: false, reason: "unparseable_version" };
  const majors = contract.acceptMajor || [20];
  if (!majors.includes(v.major) || v.major !== 20) {
    return {
      ok: false,
      reason: `bundled_major_not_accepted got=${version} require=20.18.x`,
    };
  }
  const requireMinor = contract.requireMinor != null ? contract.requireMinor : 18;
  if (v.minor < requireMinor) {
    return {
      ok: false,
      reason: `bundled_minor_too_old got=${version} require=20.${requireMinor}.x`,
    };
  }
  return { ok: true, reason: null };
}

function developmentEnginesStatus(version, enginesRange) {
  const v = parseSemver(version);
  if (!v) return { match: false, warning: "unparseable_version" };
  if (!enginesRange) return { match: true, warning: null };
  // Production/workspace engines: >=20.18.0 <21 (aligned with bundled Node 20.18.1)
  if (/>=\s*20\.18\.0\s*<\s*21/.test(String(enginesRange).replace(/\s+/g, " "))) {
    if (v.major === 20 && (v.minor > 18 || (v.minor === 18 && v.patch >= 0))) {
      return { match: true, warning: null };
    }
    return {
      match: false,
      warning: `outside_workspace_engines ${enginesRange} got=${version}`,
    };
  }
  // Legacy engines string (pre-reconciliation)
  if (/>=\s*18\.20\.0\s*<\s*19/.test(String(enginesRange).replace(/\s+/g, " "))) {
    return {
      match: false,
      warning: `stale_engines_string ${enginesRange} — production is Node 20.18.x; got=${version}`,
    };
  }
  return { match: v.major === 20, warning: null };
}

function tryNode(nodePath, source) {
  if (!nodePath || !fs.existsSync(nodePath)) {
    return {
      path: nodePath || null,
      source,
      version: null,
      usable: false,
      failureReason: "not_found",
    };
  }
  const r = spawnSync(nodePath, ["--version"], { encoding: "utf8" });
  if (r.status !== 0) {
    return {
      path: nodePath,
      source,
      version: null,
      usable: false,
      failureReason: "version_exec_failed",
    };
  }
  const version = String(r.stdout || r.stderr || "").trim().replace(/^v/, "");
  const probe = spawnSync(nodePath, ["-e", "process.exit(0)"], {
    encoding: "utf8",
  });
  if (probe.status !== 0) {
    return {
      path: nodePath,
      source,
      version,
      usable: false,
      failureReason: "child_exec_failed",
    };
  }
  return {
    path: nodePath,
    source,
    version,
    usable: true,
    failureReason: null,
  };
}

function resolveNodeRuntime(appRoot, opts = {}) {
  const packaged =
    opts.packaged === true ||
    process.env.SCIOS_PACKAGED === "1" ||
    process.env.SCIOS_RUNTIME_MODE === "PACKAGED" ||
    isPackagedLayout(appRoot);
  const enginesRange = readPkgEngines(appRoot);
  const packagedContract = readPackagedRuntimeContract(appRoot);
  const searched = [];

  const bundledCandidates = [
    { p: path.join(appRoot, "runtime/node/node.exe"), source: "bundled" },
    {
      p: path.join(appRoot, "runtime/node/win-x64/node.exe"),
      source: "bundled",
    },
    { p: path.join(appRoot, "runtime/node/bin/node"), source: "bundled" },
  ];

  for (const c of bundledCandidates) {
    searched.push(c.p);
    const result = tryNode(c.p, c.source);
    if (!result.usable) continue;
    if (packaged) {
      const ok = packagedVersionOk(result.version, packagedContract);
      if (!ok.ok) {
        return {
          ...result,
          usable: false,
          failureReason: ok.reason,
          failureClass: "RUNTIME_INCOMPATIBLE",
          searched,
          packaged: true,
          profile: "PACKAGED",
          packagedContract,
        };
      }
      return {
        ...result,
        searched,
        packaged: true,
        profile: "PACKAGED",
        contractStatus: "PACKAGED_BUNDLED_OK",
        packagedContract,
        systemNodeAllowed: false,
      };
    }
    // DEVELOPMENT: prefer bundled if present
    const eng = developmentEnginesStatus(result.version, enginesRange);
    return {
      ...result,
      searched,
      packaged: false,
      profile: "DEVELOPMENT",
      contractStatus: eng.match ? "MATCH" : "DEGRADED_OUTSIDE_ENGINES",
      contractWarning: eng.warning,
      enginesRange,
    };
  }

  if (packaged) {
    return {
      path: null,
      source: null,
      version: null,
      usable: false,
      failureReason: "RUNTIME_MISSING",
      failureClass: "RUNTIME_MISSING",
      userMessage:
        "Bundled Node runtime missing. Reinstall SCI OS or run Repair. System Node is not used in PACKAGED mode.",
      searched,
      packaged: true,
      profile: "PACKAGED",
      packagedContract,
    };
  }

  // DEVELOPMENT system Node
  const systemCandidates = [
    {
      p: process.execPath,
      source: process.execPath.includes("electron") ? "electron" : "system",
    },
  ];
  for (const c of systemCandidates) {
    searched.push(c.p);
    if (c.source === "electron") continue;
    const result = tryNode(c.p, c.source);
    if (!result.usable) continue;
    const eng = developmentEnginesStatus(result.version, enginesRange);
    return {
      ...result,
      searched,
      packaged: false,
      profile: "DEVELOPMENT",
      systemNodeAllowed: true,
      contractStatus: eng.match ? "MATCH" : "DEGRADED_OUTSIDE_ENGINES",
      contractWarning: eng.warning,
      enginesRange,
    };
  }

  const which = spawnSync(
    process.platform === "win32" ? "where.exe" : "which",
    ["node"],
    { encoding: "utf8", shell: false, windowsHide: true }
  );
  const first = String(which.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (first) {
    searched.push(first);
    const result = tryNode(first, "system");
    if (result.usable) {
      const eng = developmentEnginesStatus(result.version, enginesRange);
      return {
        ...result,
        searched,
        packaged: false,
        profile: "DEVELOPMENT",
        systemNodeAllowed: true,
        contractStatus: eng.match ? "MATCH" : "DEGRADED_OUTSIDE_ENGINES",
        contractWarning: eng.warning,
        enginesRange,
      };
    }
  }

  return {
    path: null,
    source: null,
    version: null,
    usable: false,
    failureReason: "RUNTIME_MISSING",
    failureClass: "RUNTIME_MISSING",
    searched,
    packaged: false,
    profile: "DEVELOPMENT",
    enginesRange,
  };
}

module.exports = { resolveNodeRuntime, packagedVersionOk, readPackagedRuntimeContract };
