import assert from "node:assert/strict";
import { test } from "node:test";
import { finiteSeries, calibrationPlotPoints, edgeHistogram, predictionFoundationSeries } from "./sci-charts.js";

test("finiteSeries drops non-numeric and keeps order", () => {
  const s = finiteSeries([1, "x", { y: 2 }, { y: NaN }, 3]);
  assert.deepEqual(
    s.map((p) => p.y),
    [1, 2, 3]
  );
  assert.equal(finiteSeries([]).length, 0);
  assert.equal(finiteSeries(null).length, 0);
});

test("calibrationPlotPoints skip empty bins — not a fake curve", () => {
  const pts = calibrationPlotPoints([
    { n: 0, meanP: 0.1, meanY: 0.9, lo: 0, hi: 0.2 },
    { n: 4, meanP: 0.4, meanY: 0.35, lo: 0.2, hi: 0.5 },
    { n: 2, meanP: 0.8, meanY: 0.7, lo: 0.5, hi: 1 },
  ]);
  assert.equal(pts.length, 2);
  assert.equal(pts[0].x, 0.4);
  assert.equal(pts[0].n, 4);
  assert.equal(calibrationPlotPoints([]).length, 0);
});

test("edgeHistogram buckets finite edges only", () => {
  const h = edgeHistogram([{ edge: { edgeScore: 0.12 } }, { edge: { edgeScore: 0.12 } }, { edge: { edgeScore: -0.04 } }, {}]);
  assert.ok(h.length >= 1);
  assert.ok(h.every((b) => b.y >= 1));
});

test("predictionFoundationSeries never invents a demo curve", () => {
  assert.equal(predictionFoundationSeries(null).length, 0);
  assert.equal(predictionFoundationSeries({}).length, 0);
  const pts = predictionFoundationSeries({ pointEstimate: 0.5, predictionInterval: [0.2, 0.8] });
  assert.equal(pts.length, 3);
  assert.deepEqual(
    pts.map((p) => p.y),
    [0.2, 0.5, 0.8]
  );
});
