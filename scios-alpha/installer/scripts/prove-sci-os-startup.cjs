"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const { resolveAppRoot } = require("./startup/resolve-app-root.cjs");

/**
 * Non-interactive startup proof — delegates to canonical start --mode=proof
 * and validates artifacts exist. Never marks PASS without execution.
 */
function main() {
  const rootRes = resolveAppRoot();
  if (!rootRes.ok) {
    console.log(JSON.stringify({ verdict: "NO_GO", error: "ROOT_RESOLUTION_FAILED" }));
    process.exit(1);
  }
  const appRoot = rootRes.appRoot;
  const r = spawnSync(
    process.execPath,
    [path.join(appRoot, "installer/scripts/start-sci-os.cjs"), "--mode=proof", "--no-open"],
    { cwd: appRoot, encoding: "utf8", shell: false }
  );
  console.log(r.stdout || "");
  if (r.stderr) console.error(r.stderr);
  process.exit(r.status === 0 ? 0 : 1);
}

main();
