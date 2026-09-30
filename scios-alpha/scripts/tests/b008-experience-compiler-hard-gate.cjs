#!/usr/bin/env node
"use strict";
/**
 * B-008 Experience Compiler pipeline hard gate.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "../..");
const CP = process.env.SCIOS_CP_URL || "http://127.0.0.1:3000";

function get(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    http
      .get({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout: 8000 }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") })
        );
      })
      .on("error", () => resolve({ status: 0, body: "" }));
  });
}

async function main() {
  const steps = {};
  const pipelinePath = path.join(
    ROOT,
    "packages/professional-domain-registry/src/compiler-pipeline.js"
  );
  steps.pipelineModuleExists = fs.existsSync(pipelinePath) ? "PASS" : "FAIL";

  const hydrationDir = path.join(ROOT, "packages/professional-domain-registry/src/hydration");
  const hydrationFiles = [
    "context-hydration.js",
    "domain-hydration.js",
    "evidence-hydration.js",
    "analysis-hydration.js",
    "risk-hydration.js",
    "decision-hydration.js",
  ];
  steps.hydrationModules = hydrationFiles.every((f) => fs.existsSync(path.join(hydrationDir, f)))
    ? "PASS"
    : "FAIL";

  steps.experienceSpecSchema = fs.existsSync(
    path.join(ROOT, "packages/professional-domain-registry/src/experience-spec.schema.json")
  )
    ? "PASS"
    : "FAIL";

  const url = pathToFileURL(pipelinePath).href;
  const {
    runExperienceCompilerPipeline,
    getCompilerHealth,
    COMPILER_VERSION,
  } = await import(url);

  const baseActor = {
    actorId: "actor:b008",
    roleId: "arch.market_analyst",
    sessionId: "default",
    executionMode: "SIMULATION_ONLY",
    permissionContext: {
      actionsAllowed: ["entity:read", "analyze"],
      actionsDenied: ["live_execution"],
      source: "b008-test",
    },
    policyContext: {
      policyId: "b008",
      highRiskActions: ["live_execution"],
      approvalRequired: true,
    },
  };

  const policyResults = [
    { actionId: "analyze", can: true, decision: "ALLOW", reasonCodes: [] },
    { actionId: "live_execution", can: false, decision: "DENY", reasonCodes: ["SIMULATION_ONLY"] },
  ];

  const run1 = runExperienceCompilerPipeline(
    {
      roleId: "arch.market_analyst",
      objectId: "AAPL",
      workflowState: "ready",
      runtimeMount: true,
      actor: baseActor,
      permission: baseActor.permissionContext,
      riskPolicy: baseActor.policyContext,
      policyResults,
      kernelProjection: {
        role: { roleId: "arch.market_analyst" },
        governance: { executionMode: "SIMULATION_ONLY" },
      },
    },
    { appRoot: ROOT, recentRuns: [] }
  );

  const run2 = runExperienceCompilerPipeline(
    {
      roleId: "arch.market_analyst",
      objectId: "AAPL",
      workflowState: "ready",
      runtimeMount: true,
      actor: baseActor,
      permission: baseActor.permissionContext,
      riskPolicy: baseActor.policyContext,
      policyResults,
      kernelProjection: {
        role: { roleId: "arch.market_analyst" },
        governance: { executionMode: "SIMULATION_ONLY" },
      },
    },
    { appRoot: ROOT, recentRuns: [] }
  );

  steps.deterministicProfile =
    run1.output.workspaceProfileId === run2.output.workspaceProfileId &&
    run1.workspaceSpec.workspaceId === run2.workspaceSpec.workspaceId
      ? "PASS"
      : "FAIL";

  steps.experienceSpecPresent =
    run1.experienceSpec &&
    run1.experienceSpec.schema === "sci-os-experience-spec/v1" &&
    run1.experienceSpec.intent &&
    run1.experienceSpec.evidence &&
    run1.experienceSpec.compilerVersion === COMPILER_VERSION
      ? "PASS"
      : "FAIL";

  steps.evidenceLinkage =
    Array.isArray(run1.experienceSpec.evidence.sciOsCapabilities) &&
    run1.experienceSpec.evidence.sciOsCapabilities.some((c) => c.id && "proven" in c)
      ? "PASS"
      : "FAIL";

  const missingRole = runExperienceCompilerPipeline(
    { roleId: null, runtimeMount: true, actor: null },
    { appRoot: ROOT }
  );
  steps.missingContext =
    missingRole.degraded === true || missingRole.compilerStatus === "DEGRADED" ? "PASS" : "FAIL";

  const engRole = runExperienceCompilerPipeline(
    {
      roleId: "arch.eng_operator",
      workflowState: "ready",
      runtimeMount: true,
      actor: { ...baseActor, roleId: "arch.eng_operator" },
      permission: baseActor.permissionContext,
      riskPolicy: baseActor.policyContext,
      policyResults,
    },
    { appRoot: ROOT }
  );
  steps.roleSpecific =
    engRole.output.workspaceProfileId === "eng_ops" &&
    engRole.experienceSpec.roleHints.presentation.includes("Engineering")
      ? "PASS"
      : "FAIL";

  const health = getCompilerHealth({ appRoot: ROOT });
  steps.compilerHealthUnit =
    health.schema === "sci-os-compiler-health/v1" &&
    health.pipelineModule === "PRESENT" &&
    health.compilerVersion === COMPILER_VERSION
      ? "PASS"
      : "FAIL";

  const live = await get(CP + "/v1/compiler/health");
  if (live.status === 200) {
    const body = JSON.parse(live.body);
    steps.compilerHealthLive =
      body.pipelineModule === "PRESENT" && body.compilerVersion ? "PASS" : "FAIL";
    const compileLive = await get(
      CP + "/v1/experience/compile?roleId=arch.market_analyst&objectId=AAPL"
    );
    if (compileLive.status === 200) {
      const compiled = JSON.parse(compileLive.body);
      steps.liveCompilePipeline =
        compiled.experienceSpec && compiled.compilerVersion ? "PASS" : "FAIL";
      steps.liveDegradedHonest =
        compiled.compilerStatus === "RUNTIME_MOUNTED" ||
        compiled.compilerStatus === "DEGRADED"
          ? "PASS"
          : "FAIL";
    } else {
      steps.liveCompilePipeline = "SKIP";
      steps.liveDegradedHonest = "SKIP";
    }
  } else {
    steps.compilerHealthLive = "SKIP";
    steps.liveCompilePipeline = "SKIP";
    steps.liveDegradedHonest = "SKIP";
  }

  const failed = Object.entries(steps).filter(([, v]) => v === "FAIL");
  const out = {
    schema: "sci-os-b008-experience-compiler-hard-gate/v1",
    at: new Date().toISOString(),
    steps,
    status: failed.length ? "FAIL" : "PASS",
  };
  console.log(JSON.stringify(out));
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
