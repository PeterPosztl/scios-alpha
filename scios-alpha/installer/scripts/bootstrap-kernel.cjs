"use strict";

/**
 * SCI OS ×10 — Bootstrap Kernel (Level 1)
 * Minimal dependencies: no PostgreSQL, Redis, backend, or full desktop.
 * Resolves app root, Node runtime, diagnostics writability; hands off to cascade.
 */

const fs = require("fs");
const path = require("path");
const { resolveAppRoot } = require("./startup/resolve-app-root.cjs");
const { resolveNodeRuntime } = require("./startup/resolve-node-runtime.cjs");
const { writeJson } = require("./startup/startup-report.cjs");

function bootstrapKernel(opts = {}) {
  const startedAt = new Date().toISOString();
  const rootRes = resolveAppRoot({ cliRoot: opts.cliRoot });
  if (!rootRes.ok) {
    return {
      ok: false,
      stage: "BootstrapKernel",
      failureClass: "ROOT_RESOLUTION_FAILED",
      detail: rootRes,
      next: null,
    };
  }

  const appRoot = rootRes.appRoot;
  const diagDir = path.join(appRoot, "diagnostics-export");
  try {
    fs.mkdirSync(diagDir, { recursive: true });
    fs.writeFileSync(path.join(diagDir, ".bootstrap-write-probe"), startedAt);
  } catch (e) {
    return {
      ok: false,
      stage: "BootstrapKernel",
      failureClass: "DIAGNOSTICS_NOT_WRITABLE",
      detail: String(e),
      appRoot,
      next: null,
    };
  }

  const node = resolveNodeRuntime(appRoot);
  if (!node.usable) {
    writeJson(diagDir, "bootstrap-kernel-report.json", {
      at: startedAt,
      ok: false,
      stage: "BootstrapKernel",
      failureClass: "NODE_RUNTIME_MISSING",
      node,
    });
    return {
      ok: false,
      stage: "BootstrapKernel",
      failureClass: "NODE_RUNTIME_MISSING",
      detail: node,
      appRoot,
      next: null,
    };
  }

  const report = {
    at: startedAt,
    ok: true,
    stage: "BootstrapKernel",
    appRoot,
    node: { version: node.version, path: node.nodePath },
    diagnosticsWritable: true,
    dependencies: {
      postgresql: false,
      redis: false,
      backend: false,
      fullDesktop: false,
    },
    nextStage: "NormalStartup",
  };
  writeJson(diagDir, "bootstrap-kernel-report.json", report);
  return { ok: true, stage: "BootstrapKernel", appRoot, node, report };
}

module.exports = { bootstrapKernel };

if (require.main === module) {
  const result = bootstrapKernel();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
