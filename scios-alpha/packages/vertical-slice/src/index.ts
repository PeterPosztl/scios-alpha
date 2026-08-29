export {
  runVerticalSlice,
  getSliceRun,
  listSliceRuns,
  clearSliceRuns,
  type VerticalSliceResult,
} from "./pipeline.js";
export { ImmutableLineageStore } from "./lineage.js";
export { resolveStateDir, persistRun, loadPersistedRuns } from "./local-durable.js";
export {
  resolveSciDataRoot,
  resolveVerticalSliceStateDir,
  atomicWriteUtf8,
} from "./data-root.js";
export {
  getPersistenceStateMatrix,
  type PersistenceStateMatrix,
  type PersistenceStateEntry,
  type PersistenceClassification,
} from "./persistence-matrix.js";
export { runIdempotentAnalyze, clearActionGate } from "./action-gate.js";
export { toVerticalSliceResponse } from "./view-adapter.js";
export type {
  VerticalSliceRequest,
  VerticalSliceResponse,
  NormalizedEvent as ViewNormalizedEvent,
  PitFeatures,
  PredictionEnvelope as ViewPredictionEnvelope,
  RiskDecision as ViewRiskDecision,
  GovernanceDecision as ViewGovernanceDecision,
  ExecutionOutcome,
  Lineage as ViewLineage,
} from "./types/verticalSlice.js";

