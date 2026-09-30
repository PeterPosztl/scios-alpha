import assert from "node:assert/strict";
import { test } from "node:test";
import { AUTOMATION_PREP_HOOKS } from "./automation-prep.js";
import {
  AUDIT_LIMIT_HOOKS,
  evaluateAuditLimit,
  parseAuditLimitInput,
} from "./engine-audit.js";
import { createEclDilRuntime } from "./runtime.js";

const known = { maxPositionSize: 5_000, instrumentKnown: true };

test("audit+limit analog eval does not treat missing riskScore as PASS", () => {
  const missing = evaluateAuditLimit(
    { userId: "u1", instrumentId: "inst-pm-fed-cut-oct", action: "BUY", size: 100 },
    known
  );
  assert.equal(missing.allowed, false);
  assert.equal(missing.executed, false);
  assert.equal(missing.autoTrade, false);
  assert.equal(missing.ready, false);
  assert.equal(missing.verdicts.find((v) => v.rule === "maxRiskScore")?.status, "UNKNOWN");
  assert.equal(AUDIT_LIMIT_HOOKS.engine, "audit+limit-analog-v1");
  assert.equal(AUTOMATION_PREP_HOOKS.autoAudit, false);
  assert.equal(AUTOMATION_PREP_HOOKS.autoLimits, false);

  const oversize = evaluateAuditLimit(
    { userId: "u1", instrumentId: "inst-pm-fed-cut-oct", action: "SELL", size: 20_000, riskScore: 0.2 },
    known
  );
  assert.equal(oversize.verdicts.find((v) => v.rule === "maxSize")?.status, "FAIL");
  assert.equal(oversize.allowed, false);
  assert.equal(oversize.freeze, false);

  const hot = evaluateAuditLimit(
    { userId: "u1", instrumentId: "inst-pm-fed-cut-oct", action: "BUY", size: 100, riskScore: 0.91 },
    known
  );
  assert.equal(hot.verdicts.find((v) => v.rule === "maxRiskScore")?.status, "FAIL");
  assert.equal(hot.block, false);

  const ok = evaluateAuditLimit(
    { userId: "u1", instrumentId: "inst-pm-fed-cut-oct", action: "BUY", size: 100, riskScore: 0.4 },
    known
  );
  assert.equal(ok.allowed, true);
  assert.equal(ok.executed, false);
  assert.ok(ok.verdicts.every((v) => v.status === "PASS_CONSTRAINT"));

  const unknownInst = evaluateAuditLimit(
    { userId: "u1", instrumentId: "inst-hospitality-desk", action: "BUY", size: 10, riskScore: 0.1 },
    { maxPositionSize: 5_000, instrumentKnown: false }
  );
  assert.equal(unknownInst.allowed, false);
  assert.equal(unknownInst.verdicts.find((v) => v.rule === "instrument")?.status, "UNKNOWN");

  assert.equal(parseAuditLimitInput({}).ok, false);
  assert.equal(parseAuditLimitInput({ userId: "u", instrumentId: "i", action: "HOLD", size: 1 }).ok, false);

  const rt = createEclDilRuntime();
  const inst = rt.snapshot().instruments[0]?.id;
  assert.ok(inst);
  const tradeN = rt.snapshot().trades.length;
  const wired = rt.evaluateAuditLimit({
    userId: "u1",
    instrumentId: inst,
    action: "BUY",
    size: 50,
    riskScore: 0.3,
  });
  assert.equal(wired.allowed, true);
  assert.equal(wired.executed, false);
  assert.equal(rt.snapshot().trades.length, tradeN);
  assert.equal(rt.audit()[0]?.reason, "audit+limit analog eval");
});
