import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerticalSlice } from "../../packages/vertical-slice/dist/index.js";
import { buildActorContext } from "../../packages/product-kernel/src/actor-context.js";
import { can } from "../../packages/governance-engine/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "diagnostics-export", "closure", "batch_001_P1");

function matrixRoleFor(professionalRoleId) {
  const id = String(professionalRoleId).toLowerCase();
  if (id.includes("risk")) return "risk_officer";
  if (id.includes("admin")) return "admin";
  if (id.includes("operator")) return "operator";
  if (["researcher", "operator", "risk_officer", "admin"].includes(professionalRoleId)) {
    return professionalRoleId;
  }
  return "researcher";
}

const uiRoleId = "arch.market_analyst";
const actor = buildActorContext({
  userId: "local-dev-user",
  roleId: uiRoleId,
  sessionId: "default",
  objectId: "Entity:AAPL",
});

const result = await runVerticalSlice({
  instrumentId: "AAPL",
  horizonSec: 3600,
  size: 10,
  roleId: uiRoleId,
  actor: actor.actorId,
  sessionId: "default",
  actorContext: actor,
  idempotencyKey: "p1-inprocess-" + Date.now(),
});

const gov = result.decision;
const envelope = result.actorContext;
const consistent =
  actor.roleId === uiRoleId &&
  actor.actorId === envelope?.actorId &&
  gov.subjectActorId === actor.actorId &&
  gov.role === uiRoleId &&
  gov.serviceActorId === "svc:vertical-slice-simulator" &&
  gov.subjectActorId !== gov.serviceActorId;

mkdirSync(OUT, { recursive: true });
const proof = {
  schema: "sci-os-actor-context-proof/v1",
  label: "ALPHA_NON_PRODUCTION",
  at: new Date().toISOString(),
  status: consistent ? "PASS" : "FAIL",
  surface: "in-process @scios/vertical-slice after tsc (packaged :3000 left running)",
  uiRoleId,
  actionActorId: envelope?.actorId,
  governanceSubject: gov.subjectActorId,
  governanceServiceActor: gov.serviceActorId,
  evidenceActorId: envelope?.actorId,
  lineageActorReference: gov.subjectActorId,
  consistent,
  matrixRoleForAnalyst: matrixRoleFor(uiRoleId),
  analystDirectExecutionSubmit: can(matrixRoleFor(uiRoleId), "execution:submit"),
  note: "Market Analyst is not silently operator. Simulator service actor holds execution:submit for SIMULATION_ONLY paper fills.",
  runId: result.runId,
  governanceAction: gov.action,
  actor,
  decision: gov,
};
writeFileSync(join(OUT, "actor-context-proof.json"), JSON.stringify(proof, null, 2));
if (!consistent) {
  console.error(JSON.stringify(proof, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, runId: result.runId, actorId: actor.actorId }, null, 2));
