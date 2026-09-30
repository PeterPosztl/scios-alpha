import { clearSliceRuns, runVerticalSlice } from "./pipeline";

describe("vertical slice E2E", () => {
  beforeEach(() => clearSliceRuns());

  it("runs full chain with canonical prediction envelope", async () => {
    const a = await runVerticalSlice({
      instrumentId: "aapl",
      size: 10,
      horizonSec: 3600,
      seed: 42,
      eventTime: "2026-07-16T12:00:00.000Z",
      source: "test",
    });
    const b = await runVerticalSlice({
      instrumentId: "aapl",
      size: 10,
      horizonSec: 3600,
      seed: 42,
      eventTime: "2026-07-16T12:00:00.000Z",
      source: "test",
    });

    expect(a.stages).toHaveLength(11);
    expect(a.lineageVerified).toBe(true);
    expect(a.normalizedEvent.instrumentId).toBe("AAPL");
    expect(a.features.pointInTime).toBe(true);

    expect(a.prediction.model).toEqual({
      id: "baseline-logistic",
      version: "1.0.0",
    });
    expect(a.prediction.pointEstimate).toBeGreaterThanOrEqual(0);
    expect(a.prediction.pointEstimate).toBeLessThanOrEqual(1);
    expect(
      a.prediction.distribution.positive + a.prediction.distribution.negative
    ).toBeCloseTo(1, 5);
    expect(a.prediction.predictionInterval).toHaveLength(2);
    expect(a.prediction.calibration.status).toMatch(
      /valid|degraded|invalid|unknown/
    );
    expect(typeof a.prediction.uncertainty.epistemic).toBe("number");
    expect(typeof a.prediction.abstain).toBe("boolean");
    expect(a.prediction.featureSnapshotId).toBe(a.features.featureSetId);

    expect(a.risk.predictionId).toBe(a.prediction.predictionId);
    expect(typeof a.risk.approved).toBe("boolean");
    expect(a.risk.limits.maxPosition).toBe(1000);
    expect(a.risk.limits.maxExposure).toBe(10000);
    expect(a.risk.killSwitchActive).toBe(false);
    expect(a.risk.uncertaintyHaircut).toBeGreaterThanOrEqual(0);
    expect(a.risk.uncertaintyHaircut).toBeLessThanOrEqual(1);
    if (a.risk.approved) {
      expect(a.risk.reason).toBe("within limits");
    }

    expect(a.decision.action).toMatch(/APPROVE|DENY|HOLD/);
    expect(a.decision.role).toBe("arch.market_analyst");
    expect(a.decision.subjectActorId).toBe("actor:arch.market_analyst");
    expect(a.decision.serviceActorId).toBe("svc:vertical-slice-simulator");
    expect(a.actorContext?.actorId).toBe(a.decision.subjectActorId);
    expect(a.actorContext?.roleId).toBe("arch.market_analyst");
    expect(a.execution?.fillPrice).toBe(b.execution?.fillPrice);
    expect(a.outcome.realizedPnl).toBe(b.outcome.realizedPnl);
    expect(a.prediction.pointEstimate).toBe(b.prediction.pointEstimate);
    expect(a.risk.uncertaintyHaircut).toBe(b.risk.uncertaintyHaircut);
    expect(a.lineage.nodes.length).toBeGreaterThanOrEqual(11);
    expect(a.cockpitView.tipHash).toBeTruthy();
  });

  it("blocks oversized orders via independent risk + governance", async () => {
    const r = await runVerticalSlice({
      instrumentId: "MSFT",
      size: 5000,
      seed: 7,
      eventTime: "2026-07-16T12:00:00.000Z",
    });
    expect(r.risk.approved).toBe(false);
    expect(r.risk.reason).toMatch(/max_position_exceeded|max_exposure_exceeded/);
    expect(r.decision.action).toBe("DENY");
    expect(r.execution).toBeNull();
    expect(r.outcome.status).toBe("blocked");
    expect(r.lineageVerified).toBe(true);
  });

  it("fail-closes when kill switch is active", async () => {
    const prev = process.env.SCIOS_KILL_SWITCH;
    process.env.SCIOS_KILL_SWITCH = "1";
    try {
      const r = await runVerticalSlice({
        instrumentId: "AAPL",
        size: 10,
        seed: 42,
        eventTime: "2026-07-16T12:00:00.000Z",
      });
      expect(r.risk.killSwitchActive).toBe(true);
      expect(r.risk.approved).toBe(false);
      expect(r.risk.reason).toMatch(/kill_switch_active/);
      expect(r.decision.action).toBe("DENY");
      expect(r.execution).toBeNull();
    } finally {
      if (prev === undefined) delete process.env.SCIOS_KILL_SWITCH;
      else process.env.SCIOS_KILL_SWITCH = prev;
    }
  });

  it("records end-user actor separately from simulator service actor", async () => {
    const r = await runVerticalSlice({
      instrumentId: "AAPL",
      size: 10,
      seed: 42,
      eventTime: "2026-07-16T12:00:00.000Z",
      roleId: "arch.market_analyst",
      actor: "actor:arch.market_analyst",
    });
    expect(r.decision.role).toBe("arch.market_analyst");
    expect(r.decision.subjectActorId).toBe("actor:arch.market_analyst");
    expect(r.decision.serviceRole).toBe("operator");
    expect(r.decision.subjectActorId).not.toBe(r.decision.serviceActorId);
  });
});