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
 * Validate ALPHA config. DATABASE_URL / REDIS_URL optional for in-process spine.
 */
function validateConfig(appRoot) {
  loadDotEnv(appRoot);
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
    // minimal YAML key: value parse (no secrets expected in default.yaml)
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_]+):\s*"(.*)"\s*$/);
      if (m) yaml[m[1]] = m[2];
      const m2 = line.match(/^([A-Za-z0-9_]+):\s*(\S+)\s*$/);
      if (!m && m2 && !m2[2].startsWith("#")) yaml[m2[1]] = m2[2];
    }
  } else {
    warnings.push("default.yaml missing");
  }

  const runtimeMode =
    process.env.SCI_RUNTIME_PROFILE ||
    process.env.SCIOS_RUNTIME_MODE ||
    "local-foundation";
  const apiPort = Number(process.env.PORT || process.env.SCIOS_API_PORT || 5200);
  const cockpitPort = Number(process.env.SCIOS_COCKPIT_PORT || 5230);
  const diagnosticsDir =
    process.env.SCIOS_DIAGNOSTICS_DIR || path.join(appRoot, "diagnostics-export");

  if (!Number.isFinite(apiPort)) requiredMissing.push("API_PORT");
  if (!fs.existsSync(path.dirname(diagnosticsDir)) && diagnosticsDir.includes("..")) {
    blockers.push("diagnostics path invalid");
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
    controlPlaneUrl: yaml.controlPlaneUrl || `http://127.0.0.1:${apiPort}`,
    cockpitUrl: yaml.cockpitUrl || `http://127.0.0.1:${cockpitPort}`,
    predictionUrl: yaml.predictionUrl || process.env.PREDICTION_URL || null,
    DATABASE_URL: databaseUrl ? redactUrl(databaseUrl) : null,
    REDIS_URL: redisUrl ? redactUrl(redisUrl) : null,
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

module.exports = { validateConfig, redactUrl, loadDotEnv };
