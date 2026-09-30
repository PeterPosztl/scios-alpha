/**
 * Analysis hydration — GW1 / vertical-slice run state when available.
 * ALPHA_NON_PRODUCTION — no synthetic predictions.
 */
export function hydrateAnalysis(input = {}, deps = {}) {
  const runs = deps.recentRuns || input.recentRuns || [];
  const objectId = input.objectId || null;
  const workflowState = input.workflowState || "ready";
  const missing = [];

  const forObject = objectId
    ? runs.filter(
        (r) =>
          r.instrumentId === objectId ||
          r.objectId === objectId ||
          String(r.runId || "").includes(objectId)
      )
    : runs;

  const latest = forObject[0] || null;

  if (!latest && workflowState === "result") missing.push("analysis_run");
  if (!objectId) missing.push("objectId");

  let status = "UNKNOWN";
  if (latest) status = latest.status === "succeeded" ? "AVAILABLE" : "PARTIAL";
  else if (workflowState === "ready") status = "ABSENT";
  else if (workflowState === "running") status = "PARTIAL";

  return {
    schema: "sci-os-hydration-analysis/v1",
    status,
    modelMaturity: "UNVALIDATED",
    latestRunId: latest?.runId || latest?.id || null,
    latestRunStatus: latest?.status || latest?.state || null,
    predictionAvailable: !!(latest && latest.predictionEnvelope),
    note: latest
      ? "Derived from vertical-slice run record"
      : "No analysis run — deterministic GW1 available via Analyze action",
    missing,
  };
}
