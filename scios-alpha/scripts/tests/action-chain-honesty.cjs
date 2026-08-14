/**
 * Assert Closure engine treats demo as non-consequential and local_review honestly.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("fs");
const path = require("path");

const p = path.resolve(
  __dirname,
  "../../packages/system-closure/src/continuous-closure-engine.js"
);
const src = fs.readFileSync(p, "utf8");
const checks = [
  { id: "demoNotConsequential", re: /!\/demo\/i\.test\(id\)/ },
  { id: "localReviewHonest", re: /isLocalReview/ },
  { id: "localReviewNotDecisionAction", re: /not durable DecisionAction/ },
  { id: "isSliceFacts", re: /const isSlice = \/vertical-slice/ },
  { id: "compileGw1SkipDetectors", re: /pat\.id === "compileGw1"/ },
  { id: "approvalCollapseSkipsLocalReview", re: /!\/local_review\/i\.test\(action\)/ },
];
const failed = checks.filter((c) => !c.re.test(src)).map((c) => c.id);
if (failed.length) {
  console.error({ failed });
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checks: checks.map((c) => c.id) }));
