import assert from "node:assert/strict";
import { test } from "node:test";
import { filterDetectiveEvents, trackEquitySeries } from "./analytics-detective.js";

test("detective filters by user, instrument, risk, time", () => {
  const ev = [
    { time: "2026-09-19T12:00:00.000Z", user: "agent", marketId: "pm-fed", kind: "proposal", reason: "edge", risk: {} },
    { time: "2026-09-19T13:00:00.000Z", user: "human", marketId: "ks-cpi", kind: "decision", reason: "human_review accept", risk: { executed: false } },
  ];
  assert.equal(filterDetectiveEvents(ev, { user: "human" }).length, 1);
  assert.equal(filterDetectiveEvents(ev, { instrument: "pm-fed" }).length, 1);
  assert.equal(filterDetectiveEvents(ev, { risk: "human_review" }).length, 1);
  assert.equal(filterDetectiveEvents(ev, { from: "2026-09-19T12:30:00.000Z" }).length, 1);
  assert.equal(filterDetectiveEvents(ev, { user: "nobody" }).length, 0);
});

test("track equity series stays empty without resolved outcomes", () => {
  assert.equal(trackEquitySeries([]).length, 0);
  assert.equal(trackEquitySeries([{ outcome: null, hypotheticalPnl: 10 }]).length, 0);
  const s = trackEquitySeries([
    { at: "2026-09-19T10:00:00.000Z", outcome: 1, hypotheticalPnl: 50 },
    { at: "2026-09-19T11:00:00.000Z", outcome: 0, hypotheticalPnl: -20 },
  ]);
  assert.equal(s.length, 3);
  assert.equal(s[2].y, 100030);
});
