import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RiskDecisionEnvelopeSchema } from "./pipeline-contracts";

const fixture = JSON.parse(
  readFileSync(
    join(__dirname, "../fixtures/risk-decision-envelope.normative.json"),
    "utf8"
  )
);

describe("RiskDecisionEnvelopeSchema (canonical)", () => {
  it("parses the normative risk decision fixture", () => {
    const parsed = RiskDecisionEnvelopeSchema.parse(fixture);
    expect(parsed.riskDecisionId).toBe("risk_456");
    expect(parsed.predictionId).toBe("pred_123");
    expect(parsed.approved).toBe(true);
    expect(parsed.reason).toBe("within limits");
    expect(parsed.limits.maxPosition).toBe(1000);
    expect(parsed.limits.maxExposure).toBe(10000);
    expect(parsed.uncertaintyHaircut).toBe(0.15);
    expect(parsed.killSwitchActive).toBe(false);
  });

  it("rejects uncertaintyHaircut out of range", () => {
    expect(() =>
      RiskDecisionEnvelopeSchema.parse({
        ...fixture,
        uncertaintyHaircut: 1.5,
      })
    ).toThrow();
  });
});
