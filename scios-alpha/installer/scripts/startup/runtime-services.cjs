"use strict";

/**
 * Canonical runtime service ports/URLs — Control Plane :3000, Shell :4000, Recovery :5299.
 * ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const path = require("path");

function readManifest(appRoot) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(appRoot, "sci-os.manifest.json"), "utf8")
    );
  } catch {
    return {};
  }
}

function runtimeServices(appRoot) {
  const manifest = readManifest(appRoot || process.cwd());
  const ports = manifest.ports || {};
  return {
    controlPlane: {
      port: Number(ports.backend || 3000),
      healthPath: "/healthz",
    },
    cockpit: {
      port: Number(ports.cockpit || 4000),
      healthPath: "/healthz",
      homePath: "/",
    },
    recovery: {
      port: Number(ports.recoveryShell || 5299),
      healthPath: "/healthz",
    },
  };
}

function portsFrom(config = {}) {
  const services =
    config.appRoot != null ? runtimeServices(config.appRoot) : null;
  const api =
    Number(config.apiPort) ||
    Number(config.backend) ||
    Number(process.env.SCIOS_API_PORT) ||
    Number(process.env.PORT) ||
    (services && services.controlPlane.port) ||
    3000;
  const shell =
    Number(config.cockpitPort) ||
    Number(config.shell) ||
    Number(process.env.SCIOS_COCKPIT_PORT) ||
    (services && services.cockpit.port) ||
    4000;
  const recovery =
    Number(config.recoveryPort) ||
    Number(process.env.SCIOS_RECOVERY_PORT) ||
    (services && services.recovery.port) ||
    5299;
  return { api, shell, recovery };
}

function controlPlaneUrl(config = {}) {
  const { api } = portsFrom(config);
  return `http://127.0.0.1:${api}`;
}

function shellEntryUrl(config = {}) {
  const { shell } = portsFrom(config);
  return `http://127.0.0.1:${shell}/`;
}

function recoveryUrl(config = {}) {
  const { recovery } = portsFrom(config);
  return `http://127.0.0.1:${recovery}/`;
}

/**
 * @param {"control-plane"|"shell"|"recovery"} service
 * @param {object} config
 * @param {string} [pathName]
 */
function urlFor(service, config = {}, pathName = "/") {
  let base;
  if (service === "control-plane") base = controlPlaneUrl(config);
  else if (service === "shell") base = shellEntryUrl(config).replace(/\/$/, "");
  else if (service === "recovery") base = recoveryUrl(config).replace(/\/$/, "");
  else throw new Error(`unknown service: ${service}`);
  const p = pathName.startsWith("/") ? pathName : `/${pathName}`;
  return `${base}${p}`;
}

module.exports = {
  readManifest,
  runtimeServices,
  portsFrom,
  controlPlaneUrl,
  shellEntryUrl,
  recoveryUrl,
  urlFor,
};
