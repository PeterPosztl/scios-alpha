"use strict";

const fs = require("fs");
const path = require("path");

function createStartupLogger(appRoot, correlationId) {
  const diagDir = path.join(appRoot, "diagnostics-export");
  fs.mkdirSync(diagDir, { recursive: true });
  const logFile = path.join(diagDir, "startup.log");

  function write(level, message, meta) {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      correlationId,
      level,
      message,
      ...(meta && Object.keys(meta).length ? { meta } : {}),
    });
    fs.appendFileSync(logFile, line + "\n");
    return line;
  }

  return {
    logFile,
    diagDir,
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  };
}

module.exports = { createStartupLogger };
