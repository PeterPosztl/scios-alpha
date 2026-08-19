/**
 * Execution observability — one executionId correlating the professional chain.
 * ALPHA_NON_PRODUCTION
 */

import { randomUUID } from "node:crypto";

export function createExecutionTrace(partial = {}) {
  const executionId = partial.executionId || `exec_${randomUUID()}`;
  return {
    schema: "sci-os-execution-trace/v1",
    executionId,
    chain: {
      user: partial.user || "local-dev",
      role: partial.role || "arch.market_analyst",
      workspace: partial.workspace || "ws.analysis_gw1",
      experience: partial.experience || "compile:gw1",
      action: partial.action || "analyze",
      workflow: partial.workflow || "gw1.market_prediction_analysis",
      agentOrEngine: partial.agentOrEngine || "vertical-slice",
      tool: partial.tool || "tool.vertical-slice-run",
      modelProvider: partial.modelProvider || "baseline-logistic@local",
      risk: partial.risk || null,
      policy: partial.policy || "embedded-foundation/v1",
      result: partial.result || null,
      evidence: partial.evidence || null,
    },
    professionalExplanation:
      partial.professionalExplanation ||
      "Analysis ran under simulation policy. Risk and governance reviewed the prediction. Evidence is available in Evidence view.",
    technical: {
      metrics: partial.metrics || {},
      logsRef: partial.logsRef || null,
      historyRef: partial.historyRef || null,
    },
    at: new Date().toISOString(),
  };
}

export function buildExecutionObservabilityProof(sampleTrace) {
  return {
    schema: "sci-os-execution-observability-proof/v1",
    label: "ALPHA_NON_PRODUCTION",
    requiredChain: [
      "USER",
      "ROLE",
      "WORKSPACE",
      "EXPERIENCE",
      "ACTION",
      "WORKFLOW",
      "AGENT_ENGINE",
      "TOOL",
      "MODEL_PROVIDER",
      "RISK",
      "POLICY",
      "RESULT",
      "EVIDENCE",
    ],
    sample: sampleTrace,
    professionalView: "explanation string only",
    technicalView: "full chain + metrics/logs refs",
    status: sampleTrace?.executionId ? "PARTIAL" : "ABSENT",
  };
}
