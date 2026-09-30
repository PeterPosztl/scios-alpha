import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createEclLedgerDao,
  createMemoryEclSqlClient,
  aggregatePreviewBooks,
} from "./ecl-ledger-dao.js";
import { createBuildSuiteV2 } from "./engine-suite-v2.js";
import { CLIENT_SUITE_HOOKS } from "./client-suite.js";

test("ECL ledger DAO durable only after insert; missing riskScore is not 0", async () => {
  const none = createEclLedgerDao({ client: null });
  const skipped = await none.append({
    ts: new Date().toISOString(),
    kind: "DECISION",
    instrumentId: "inst-a",
    payload: { riskScore: 0.4 },
    analog: true,
  });
  assert.equal(skipped.durable, false);
  assert.equal(none.connected, false);

  const dao = createEclLedgerDao({ client: createMemoryEclSqlClient(), livePostgres: false });
  const missing = await dao.append({
    ts: new Date().toISOString(),
    kind: "DECISION",
    instrumentId: "inst-a",
    payload: { decision: "HOLD" },
    analog: true,
  });
  assert.equal(missing.durable, true);
  assert.equal(missing.livePostgres, false);

  await dao.append({
    ts: new Date().toISOString(),
    kind: "DECISION",
    instrumentId: "inst-a",
    payload: { riskScore: 0.4 },
    analog: true,
  });
  await dao.append({
    ts: new Date().toISOString(),
    kind: "EXECUTION_PREVIEW",
    instrumentId: "inst-a",
    payload: { size: 10, previewFillPrice: 0.5 },
    analog: true,
  });
  const pnl = await dao.pnlBook();
  assert.equal(pnl.preview, true);
  assert.equal(pnl.realized, false);
  assert.equal(pnl.pnlByInstrument["inst-a"], 5);
  const risk = await dao.riskBook();
  assert.equal(risk.riskByInstrument["inst-a"], 0.4);

  const books = aggregatePreviewBooks([
    { ts: "t", kind: "DECISION", instrumentId: "x", analog: true, payload: {} },
    { ts: "t", kind: "EXECUTION_PREVIEW", instrumentId: "x", analog: true, payload: { size: 1 } },
  ]);
  assert.equal(books.riskSkippedUnknown, 1);
  assert.equal(books.pnlSkippedUnknown, 1);
  assert.equal(books.riskByInstrument["x"], undefined);

  const v2 = createBuildSuiteV2({
    cockpitComputeV1: () => ({
      decision: { decision: "HOLD" },
      execution: { previewFillPrice: 0.4, previewSize: 2, executed: false },
      risk: { riskScore: 0.2 },
    }),
    dao,
  });
  const appended = await v2.append({
    kind: "EXECUTION_PREVIEW",
    instrumentId: "inst-a",
    payload: { size: 1, previewFillPrice: 1 },
  });
  assert.equal(appended.ok, true);
  assert.equal(appended.durable, true);
  assert.equal(appended.livePostgres, false);
  assert.equal(CLIENT_SUITE_HOOKS.desktop.status, "REFUSED");
  assert.equal(CLIENT_SUITE_HOOKS.mobile.hospitality.status, "SKIPPED_RESEARCH_REQUIRED");
  assert.equal(CLIENT_SUITE_HOOKS.daemon.wiredIntoBoot, false);
  assert.equal(CLIENT_SUITE_HOOKS.autoTrade, false);
});
