"use strict";

const { spawnSync } = require("child_process");

function classifyDocker() {
  const which = spawnSync(
    process.platform === "win32" ? "where" : "which",
    ["docker"],
    { encoding: "utf8", shell: true }
  );
  if (which.status !== 0 || !String(which.stdout || "").trim()) {
    return {
      status: "CLI_MISSING",
      failureClass: "DOCKER_CLI_MISSING",
      nextAction: "Install Docker Desktop, then Retry or Start Docker Desktop",
      detail: "docker CLI not found on PATH",
    };
  }

  const info = spawnSync("docker", ["info"], { encoding: "utf8", shell: true, timeout: 4000 });
  const out = `${info.stdout || ""}${info.stderr || ""}`;
  if (info.status !== 0) {
    if (/permission denied|Access is denied/i.test(out)) {
      return {
        status: "PERMISSION_DENIED",
        failureClass: "PERMISSION_DENIED",
        nextAction: "Run with Docker permissions / Docker Desktop user access",
        detail: out.slice(0, 400),
      };
    }
    if (/Cannot connect|dockerDesktopLinuxEngine|Is the docker daemon running/i.test(out)) {
      return {
        status: "ENGINE_STOPPED",
        failureClass: "DOCKER_ENGINE_STOPPED",
        nextAction: "Start Docker Desktop",
        detail: out.slice(0, 400),
      };
    }
    return {
      status: "ENGINE_UNREACHABLE",
      failureClass: "DOCKER_ENGINE_STOPPED",
      nextAction: "Start Docker Desktop and Retry",
      detail: out.slice(0, 400),
    };
  }

  return {
    status: "AVAILABLE",
    failureClass: null,
    nextAction: null,
    detail: "docker info ok",
  };
}

module.exports = { classifyDocker };
