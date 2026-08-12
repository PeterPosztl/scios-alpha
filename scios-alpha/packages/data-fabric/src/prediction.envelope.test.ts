import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PredictionEnvelopeSchema } from "./pipeline-contracts";

const fixture = JSON.parse(
  readFileSync(
    join(__dirname, "../fixtures/prediction-envelope.normative.json"),
    "utf8"
  )
);

describe("PredictionEnvelopeSchema (canonical)", () => {
  it("parses the normative prediction envelope fixture", () => {
    const parsed = PredictionEnvelopeSchema.parse(fixture);
    expect(parsed.predictionId).toBe("pred_123");
    expect(parsed.model.id).toBe("baseline-logistic");
    expect(parsed.pointEstimate).toBe(0.61);
    expect(parsed.distribution.negative).toBe(0.39);
    expect(parsed.predictionInterval[0]).toBe(0.53);
    expect(parsed.calibration.status).toBe("valid");
    expect(parsed.uncertainty.epistemic).toBe(0.09);
    expect(parsed.abstain).toBe(false);
    expect(parsed.featureSnapshotId).toBe("fs_789");
  });

  it("rejects out-of-range pointEstimate", () => {
    expect(() =>
      PredictionEnvelopeSchema.parse({
        ...fixture,
        pointEstimate: 1.5,
        distribution: { positive: 1.5, negative: -0.5 },
      })
    ).toThrow();
  });
});
