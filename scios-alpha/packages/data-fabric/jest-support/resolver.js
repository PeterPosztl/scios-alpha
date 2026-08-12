const path = require("path");
const fs = require("fs");

/**
 * Jest resolver for "type": "module" packages: allow extensionless .ts imports.
 */
module.exports = (request, options) => {
  const { basedir, defaultResolver } = options;

  if (request.startsWith(".") && !path.extname(request)) {
    const absBase = path.resolve(basedir, request);
    for (const ext of [".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]) {
      const candidate = absBase + ext;
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      const indexCandidate = path.join(absBase, "index" + ext);
      if (fs.existsSync(indexCandidate)) {
        return indexCandidate;
      }
    }
  }

  return defaultResolver(request, options);
};
