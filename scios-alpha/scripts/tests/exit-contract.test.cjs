/**
 * Exit contract unit tests — ALPHA_NON_PRODUCTION
 */
const {
  exitCodeForVerdict,
  SHUTDOWN_REASONS,
} = require("../../installer/scripts/startup/exit-contract.cjs");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const cases = [
  {
    name: "READY + [] → 0",
    input: { verdict: "READY", blockers: [] },
    expect: 0,
  },
  {
    name: "DEGRADED + [] + optional warnings → 0",
    input: { verdict: "DEGRADED", blockers: [] },
    expect: 0,
  },
  {
    name: "NO_GO + internal blocker → 2",
    input: { verdict: "NO_GO", blockers: ["CONFIG_INVALID"] },
    expect: 2,
  },
  {
    name: "NO_GO + external blocker → 3",
    input: { verdict: "NO_GO", blockers: ["PORT_CONFLICT"] },
    expect: 3,
  },
  {
    name: "ROOT_RESOLUTION_FAILED → 3",
    input: { verdict: "NO_GO", blockers: ["ROOT_RESOLUTION_FAILED"] },
    expect: 3,
  },
  {
    name: "CONVERGENCE_STOP after DEGRADED → 0",
    input: {
      verdict: "DEGRADED",
      blockers: [],
      shutdownReason: SHUTDOWN_REASONS.CONVERGENCE_STOP,
    },
    expect: 0,
  },
  {
    name: "SIGNAL_SHUTDOWN after READY → 0",
    input: {
      verdict: "READY",
      blockers: [],
      shutdownReason: SHUTDOWN_REASONS.SIGNAL_SHUTDOWN,
    },
    expect: 0,
  },
];

let failed = 0;
for (const c of cases) {
  const got = exitCodeForVerdict(c.input);
  if (got !== c.expect) {
    console.error(`FAIL ${c.name}: got=${got} expect=${c.expect}`);
    failed++;
  } else {
    console.log(`PASS ${c.name}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "PASS", cases: cases.length }, null, 2));
}
