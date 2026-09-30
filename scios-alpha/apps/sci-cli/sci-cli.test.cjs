const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

const sci = join(__dirname, "sci.cjs");

function run(args) {
  return spawnSync(process.execPath, [sci, ...args], { encoding: "utf8" });
}

test("SCI_CLI_SUITE_V2 help and validation without Control Plane", () => {
  const help = run(["help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /SCI_CLI_SUITE_V2/);
  assert.match(help.stdout, /autoTrade=false/);
  assert.match(help.stdout, /sci infra/);
  assert.match(help.stdout, /sci explain/);
  assert.match(help.stdout, /sci tail/);
  assert.doesNotMatch(help.stdout, /Trade now/i);

  const missing = run(["audit"]);
  assert.equal(missing.status, 2);
  const body = JSON.parse(missing.stderr || missing.stdout);
  assert.equal(body.autoTrade, false);
  assert.equal(body.ready, false);
  assert.equal(body.preview, true);
  assert.equal(body.error, "size_required");

  const compute = run(["compute"]);
  assert.equal(compute.status, 2);
  const c = JSON.parse(compute.stderr || compute.stdout);
  assert.equal(c.tradingBot, false);
});
