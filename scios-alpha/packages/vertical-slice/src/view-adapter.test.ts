import { clearSliceRuns, runVerticalSlice } from "./pipeline";
import { toVerticalSliceResponse } from "./view-adapter";

describe("toVerticalSliceResponse", () => {
  beforeEach(() => clearSliceRuns());

  it("maps canonical pipeline result to cockpit view shape", async () => {
    const internal = await runVerticalSlice({
      instrumentId: "aapl",
      size: 10,
      horizonSec: 3600,
      seed: 42,
      eventTime: "2026-07-16T12:00:00.000Z",
      source: "test",
    });
    const view = toVerticalSliceResponse(internal);

    expect(view.runId).toBe(internal.runId);
    expect(view.normalizedEvent?.instrumentId).toBe("AAPL");
    expect(view.pitFeatures?.asof).toBe(internal.features.asOf);
    expect(view.predictionEnvelope?.predictionId).toBe(
      internal.prediction.predictionId
    );
    expect(view.riskDecision?.decisionId).toBe(internal.risk.riskDecisionId);
    expect(view.governanceDecision?.verdict).toMatch(
      /APPROVE|REJECT|ESCALATE/
    );
    expect(view.lineage?.lineageId).toBe(`lin_${internal.runId}`);
    expect(view.lineage?.nodes.length).toBeGreaterThanOrEqual(11);
    expect(view.predictionEnvelope?.validationStatus).toBe("UNVALIDATED");
    expect(view.predictionEnvelope?.provenance?.modelId).toBe("baseline-logistic");
    expect(view.predictionEnvelope?.provenance?.maturityLabel).toBe("NON-PRODUCTION");
  });

  it("marks oversized orders as REJECT", async () => {
    const internal = await runVerticalSlice({
      instrumentId: "MSFT",
      size: 5000,
      seed: 7,
      eventTime: "2026-07-16T12:00:00.000Z",
    });
    const view = toVerticalSliceResponse(internal);

    expect(view.status).toBe("REJECT");
    expect(view.riskDecision?.verdict).toBe("REJECT");
    expect(view.governanceDecision?.verdict).toBe("REJECT");
    expect(view.executionOutcome?.outcome).toBe("NO_ACTION");
  });
});
