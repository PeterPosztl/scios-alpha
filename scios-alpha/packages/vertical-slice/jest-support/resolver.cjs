const path = require("path");
const fs = require("fs");

/**
 * Jest resolver: absolute mapped paths, ESM .js → .ts, extensionless.
 */
module.exports = (request, options) => {
  const { basedir, defaultResolver } = options;

  if (path.isAbsolute(request) && fs.existsSync(request)) {
    return request;
  }

  if (request.startsWith(".") && request.endsWith(".js")) {
    const ts = path.resolve(basedir, request.replace(/\.js$/, ".ts"));
    if (fs.existsSync(ts)) return ts;
  }

  if (request.startsWith(".") && !path.extname(request)) {
    const absBase = path.resolve(basedir, request);
    for (const ext of [".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]) {
      const candidate = absBase + ext;
      if (fs.existsSync(candidate)) return candidate;
      const indexCandidate = path.join(absBase, "index" + ext);
      if (fs.existsSync(indexCandidate)) return indexCandidate;
    }
  }

  return defaultResolver(request, options);
};
