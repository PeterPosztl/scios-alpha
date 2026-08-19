#!/usr/bin/env node
"use strict";
/**
 * Experience Compiler test matrix — A5 gate.
 * ALPHA_NON_PRODUCTION
 */
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");

async function main() {
  const url = pathToFileURL(
    path.join(ROOT, "packages/professional-domain-registry/src/experience-compiler.js")
  ).href;
  const { compileExperience, buildWorkspaceSpec } = await import(url);

  const base = {
    runtimeMount: true,
    userExperienceLevel: "intermediate",
    permission: {
      actionsAllowed: ["entity:read", "analyze"],
      actionsDenied: ["live_execution"],
      source: "matrix-test",
    },
    riskPolicy: {
      policyId: "matrix",
      highRiskActions: ["live_execution"],
      approvalRequired: true,
    },
    availableData: { status: "PARTIAL", bindings: ["vertical-slice.foundation"] },
    sciOsCapabilities: [{ id: "vertical-slice.foundation", proven: true }],
    actor: { actorId: "actor:matrix", roleId: "arch.market_analyst" },
  };

  const market = compileExperience({
    ...base,
    roleId: "arch.market_analyst",
    currentObject: "AAPL",
    workflowState: "ready",
  });
  assert.strictEqual(market.compilerStatus, "RUNTIME_MOUNTED");
  assert.ok(market.workspaceSpec);
  assert.strictEqual(market.workspaceSpec.workspaceId, "market_analysis");
  assert.ok(market.workspaceSpec.panels.some((p) => p.type === "uncertainty"));
  assert.ok(market.workspaceSpec.maturity.modelScience === "UNVALIDATED");
  assert.ok(
    market.workspaceSpec.warnings.some((w) => w.code === "MARKET_DATA_ABSENT" || w.code === "MODEL_UNVALIDATED")
  );

  const missingRole = compileExperience({ ...base, roleId: null });
  assert.ok(missingRole.output.unknowns.includes("roleId"));

  const invalidRole = compileExperience({ ...base, roleId: "arch.not_a_role" });
  assert.ok(invalidRole.output.unknowns.includes("role_not_in_archetypes"));

  const absentData = compileExperience({
    ...base,
    roleId: "arch.market_analyst",
    availableData: { status: "ABSENT" },
  });
  assert.ok(absentData.workspaceSpec.warnings.some((w) => w.code === "MARKET_DATA_ABSENT"));

  const unprovenCap = compileExperience({
    ...base,
    roleId: "arch.market_analyst",
    sciOsCapabilities: [{ id: "vertical-slice.foundation", proven: false }],
  });
  assert.ok(unprovenCap.output.unknowns.some((u) => u.startsWith("capability_unproven:")));

  const denied = compileExperience({
    ...base,
    roleId: "arch.market_analyst",
    permission: {
      ...base.permission,
      actionsDenied: ["live_execution", "analyze"],
    },
  });
  assert.ok(denied.output.disabledActions.some((d) => d.action === "analyze"));

  const a = compileExperience({ ...base, roleId: "arch.market_analyst", currentObject: "AAPL" });
  const b = compileExperience({ ...base, roleId: "arch.market_analyst", currentObject: "AAPL" });
  assert.strictEqual(
    JSON.stringify(a.workspaceSpec.panels.map((p) => p.id)),
    JSON.stringify(b.workspaceSpec.panels.map((p) => p.id))
  );

  const localReview = market.workspaceSpec.actions.find((a) => a.type === "LOCAL_REVIEW");
  assert.ok(localReview);
  assert.strictEqual(localReview.enabled, false);
  assert.strictEqual(localReview.governanceState, "LOCAL_REVIEW");

  console.log(
    JSON.stringify({
      ok: true,
      schema: "sci-os-experience-compiler-matrix/v1",
      tests: 12,
      status: "PASS",
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
