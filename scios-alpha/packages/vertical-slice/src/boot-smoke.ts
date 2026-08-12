/**
 * Boot smoke — run one vertical slice; exit 1 on failure.
 * Invoked by: pnpm --filter @scios/vertical-slice smoke
 */
import { runVerticalSlice } from "./pipeline.js";

const result = await runVerticalSlice({
  instrumentId: "AAPL",
  size: 10,
  seed: 42,
  eventTime: "2026-07-16T12:00:00.000Z",
  source: "boot",
});

if (!result.lineageVerified) {
  console.error(JSON.stringify({ ok: false, error: "lineage_unverified" }));
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    runId: result.runId,
    model: result.prediction.model,
    riskApproved: result.risk.approved,
    decision: result.decision.action,
    tipHash: result.lineage.tipHash,
  })
);
