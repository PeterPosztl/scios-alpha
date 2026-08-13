"use strict";

const fs = require("fs");
const path = require("path");

function redactUrl(u) {
  if (!u || typeof u !== "string") return u;
  try {
    const url = new URL(u);
    if (url.password) url.password = "***";
    if (url.username) url.username = "***";
    return url.toString();
  } catch {
    return "[unparseable]";
  }
}

function isBlank(v) {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function loadManifestPorts(appRoot) {
  const manifestPath = path.join(appRoot, "sci-os.manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return m.ports || null;
  } catch {
    return null;
  }
}

/** Load repo .env into process.env without overriding existing vars. Never logs values. */
function loadDotEnv(appRoot) {
  const envPath = path.join(appRoot, ".env");
  if (!fs.existsSync(envPath)) return { loaded: false, keys: 0 };
  const raw = fs.readFileSync(envPath, "utf8");
  let keys = 0;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null || process.env[k] === "") {
      process.env[k] = v;
      keys += 1;
    }
  }
  return { loaded: true, keys };
}

/**
 * Packaged config authority — never load developer .env in PACKAGED mode.
 * Secrets must never be packaged; only non-secret runtime defaults.
 */
function loadPackagedConfig(appRoot) {
  const file = path.join(appRoot, "config", "packaged.json");
  if (!fs.existsSync(file)) {
    const err = new Error("PACKAGED_CONFIG_MISSING");
    err.code = "PACKAGED_CONFIG_MISSING";
    throw err;
  }
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, value] of Object.entries(cfg.env || {})) {
    if (process.env[key] == null && value != null) {
      process.env[key] = String(value);
    }
  }
  process.env.SCIOS_PACKAGED = process.env.SCIOS_PACKAGED || "1";
  process.env.SCIOS_RUNTIME_MODE = process.env.SCIOS_RUNTIME_MODE || "PACKAGED";
  return cfg;
}

function isPackagedMode() {
  return (
    process.env.SCIOS_PACKAGED === "1" ||
    process.env.SCIOS_RUNTIME_MODE === "PACKAGED"
  );
}

/**
 * Validate ALPHA config. Ports default from sci-os.manifest.json (single source).
 * DATABASE_URL / REDIS_URL optional for in-process spine.
 */
function validateConfig(appRoot, opts = {}) {
  const packaged = opts.packaged === true || isPackagedMode();
  if (packaged) {
    // PACKAGED: config/packaged.json only — never developer .env
    try {
      loadPackagedConfig(appRoot);
    } catch (e) {
      return {
        valid: false,
        requiredMissing: ["config/packaged.json"],
        optionalMissing: [],
        enabledSubsystems: [],
        disabledSubsystems: [],
        warnings: [],
        blockers: [e.code || "PACKAGED_CONFIG_MISSING"],
        redactedConfig: { runtimeMode: "PACKAGED" },
      };
    }
  } else {
    loadDotEnv(appRoot);
  }
  const requiredMissing = [];
  const optionalMissing = [];
  const warnings = [];
  const blockers = [];
  const enabledSubsystems = [];
  const disabledSubsystems = [];

  const yamlPath = path.join(appRoot, "infra/config/default.yaml");
  const envPath = path.join(appRoot, ".env");
  let yaml = {};
  if (fs.existsSync(yamlPath)) {
    const raw = fs.readFileSync(yamlPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_]+):\s*"(.*)"\s*$/);
      if (m) yaml[m[1]] = m[2];
      const m2 = line.match(/^([A-Za-z0-9_]+):\s*(\S+)\s*$/);
      if (!m && m2 && !m2[2].startsWith("#")) yaml[m2[1]] = m2[2];
    }
  } else if (!packaged) {
    // OPTIONAL DEVELOPMENT CONFIG — ports/env come from sci-os.manifest.json + .env.
    // PACKAGED uses config/packaged.json; do not warn operators on first-release EXE.
    warnings.push("default.yaml missing");
  }

  const manifestPorts = loadManifestPorts(appRoot);
  const defaultApi = manifestPorts?.backend ?? 3000;
  const defaultCockpit = manifestPorts?.cockpit ?? 4000;

  const runtimeMode =
    process.env.SCI_RUNTIME_PROFILE ||
    process.env.SCIOS_RUNTIME_MODE ||
    "local-foundation";
  const apiPort = Number(
    process.env.PORT || process.env.SCIOS_API_PORT || defaultApi
  );
  const cockpitPort = Number(
    process.env.SCIOS_COCKPIT_PORT || defaultCockpit
  );
  const diagnosticsDir =
    process.env.SCIOS_DIAGNOSTICS_DIR || path.join(appRoot, "diagnostics-export");

  if (!Number.isFinite(apiPort)) requiredMissing.push("API_PORT");
  if (!Number.isFinite(cockpitPort)) requiredMissing.push("COCKPIT_PORT");
  if (!fs.existsSync(path.dirname(diagnosticsDir)) && diagnosticsDir.includes("..")) {
    blockers.push("diagnostics path invalid");
  }

  // Detect drift vs manifest when env overrides
  if (manifestPorts) {
    if (apiPort !== manifestPorts.backend) {
      warnings.push(
        `API port ${apiPort} differs from sci-os.manifest.json ports.backend=${manifestPorts.backend}`
      );
    }
    if (cockpitPort !== manifestPorts.cockpit) {
      warnings.push(
        `Cockpit port ${cockpitPort} differs from sci-os.manifest.json ports.cockpit=${manifestPorts.cockpit}`
      );
    }
  }

  enabledSubsystems.push("vertical-slice", "control-plane-api", "cockpit-ui", "boot-modes");

  const databaseUrl = process.env.DATABASE_URL;
  if (isBlank(databaseUrl)) {
    optionalMissing.push("DATABASE_URL");
    disabledSubsystems.push("postgresql");
    warnings.push("DATABASE_URL not set — ALPHA in-process mode (no durable DB)");
  } else {
    enabledSubsystems.push("postgresql");
  }

  const redisUrl = process.env.REDIS_URL;
  if (isBlank(redisUrl)) {
    optionalMissing.push("REDIS_URL");
    disabledSubsystems.push("redis", "bullmq-workers");
    warnings.push("REDIS_URL not set — queue workers disabled");
  } else {
    enabledSubsystems.push("redis");
  }

  disabledSubsystems.push("electron-desktop");
  if (!fs.existsSync(path.join(appRoot, "apps/desktop"))) {
    optionalMissing.push("electron-desktop");
  }

  const redactedConfig = {
    runtimeMode,
    apiPort,
    cockpitPort,
    diagnosticsDir,
    portSource: {
      manifest: manifestPorts,
      envApi: process.env.SCIOS_API_PORT || process.env.PORT || null,
      envCockpit: process.env.SCIOS_COCKPIT_PORT || null,
    },
    controlPlaneUrl: yaml.controlPlaneUrl || `http://127.0.0.1:${apiPort}`,
    cockpitUrl: yaml.cockpitUrl || `http://127.0.0.1:${cockpitPort}`,
    predictionUrl: yaml.predictionUrl || process.env.PREDICTION_URL || null,
    DATABASE_URL: databaseUrl ? redactUrl(databaseUrl) : null,
    REDIS_URL: redisUrl ? redactUrl(redisUrl) : null,
    userFacingUrl: `http://127.0.0.1:${cockpitPort}/`,
    note: "User hand-off MUST open cockpitUrl — never control-plane /",
  };

  const valid = requiredMissing.length === 0 && blockers.length === 0;

  return {
    valid,
    requiredMissing,
    optionalMissing,
    enabledSubsystems,
    disabledSubsystems: [...new Set(disabledSubsystems)],
    warnings,
    blockers,
    redactedConfig,
  };
}

module.exports = {
  validateConfig,
  redactUrl,
  loadDotEnv,
  loadPackagedConfig,
  isPackagedMode,
  loadManifestPorts,
};
