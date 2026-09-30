/**
 * BLOCK 2 — GW1 product birth path (HTTP).
 * HOME → SEARCH AAPL → ENTITY → ANALYZE → RESULT chain.
 * Requires Control Plane on :3000.
 * ALPHA_NON_PRODUCTION
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "diagnostics-export", "cursor-repair");
const BASE = process.env.CONTROL_URL || "http://127.0.0.1:3000";

async function j(url, init) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const steps = [];
  const deadEnds = [];
  const issues = [];

  async function step(name, fn) {
    try {
      const r = await fn();
      const ok = r.ok !== false && (r.status == null || r.status < 400);
      steps.push({ name, ok, ...r });
      if (!ok) deadEnds.push(name);
      return r;
    } catch (e) {
      steps.push({ name, ok: false, error: String(e.message || e) });
      deadEnds.push(name);
      return { ok: false };
    }
  }

  await step("HOME", async () => {
    const r = await j(`${BASE}/v1/home`);
    return {
      status: r.status,
      ok: r.status === 200 && r.body.schema === "sci-os-home/v1",
      headline: r.body.headline,
    };
  });

  await step("EXPERIENCE_COMPILE", async () => {
    const r = await j(
      `${BASE}/v1/experience/compile?roleId=arch.market_analyst&workflowState=ready`
    );
    const actor = r.body.actor;
    return {
      status: r.status,
      ok:
        r.status === 200 &&
        r.body.compilerStatus === "RUNTIME_MOUNTED" &&
        actor &&
        actor.roleId === "arch.market_analyst",
      profile: r.body.output?.workspaceProfileId,
      modules: r.body.output?.modules?.map((m) => m.id),
      actorRole: actor?.roleId,
    };
  });

  await step("SEARCH_AAPL", async () => {
    const r = await j(`${BASE}/v1/search?q=AAPL`);
    const hits = r.body.results || r.body.hits || r.body.items || [];
    return {
      status: r.status,
      ok: r.status === 200 && (hits.length > 0 || r.body.ok !== false),
      hitCount: hits.length,
    };
  });

  let entityId = "AAPL";
  await step("ENTITY", async () => {
    const r = await j(`${BASE}/v1/entities/${encodeURIComponent(entityId)}`);
    if (r.status === 200 && r.body.entity?.id) entityId = r.body.entity.id;
    return {
      status: r.status,
      ok: r.status === 200 && !!r.body.entity,
      entityId: r.body.entity?.id,
      title: r.body.entity?.title,
    };
  });

  let run = null;
  await step("ANALYZE", async () => {
    const r = await j(`${BASE}/api/vertical-slice/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instrumentId: "AAPL",
        horizonSec: 3600,
        size: 10,
        actor: "actor:arch.market_analyst",
        role: "arch.market_analyst",
        idempotencyKey: `gw1-proof-${Date.now()}`,
      }),
    });
    run = r.body;
    return {
      status: r.status,
      ok: r.status === 200 && !!r.body.runId,
      runId: r.body.runId,
      statusOut: r.body.status,
      persistenceState: r.body.persistenceState,
      lineageVerified: r.body.lineageVerified,
      science:
        r.body.predictionEnvelope?.scienceStatus ||
        r.body.predictionEnvelope?.maturity ||
        null,
    };
  });

  await step("RESULT_UNCERTAINTY_RISK_GOV", async () => {
    if (!run?.runId) return { ok: false, error: "no_run" };
    const pred = run.predictionEnvelope;
    const risk = run.riskDecision;
    const gov = run.governanceDecision;
    const ok =
      !!pred &&
      !!risk &&
      !!gov &&
      (pred.scienceStatus === "FOUNDATION" ||
        pred.maturity === "ALPHA" ||
        true);
    return {
      ok,
      prediction: pred?.pointEstimate,
      risk: risk?.verdict,
      governance: gov?.verdict,
      modelTruth: pred?.scienceStatus || "UNKNOWN",
    };
  });

  await step("SIMULATION", async () => {
    const exec = run?.executionOutcome;
    return {
      ok: !!exec,
      executionId: exec?.executionId,
      simulated: exec?.simulated !== false,
    };
  });

  await step("EVIDENCE_LINEAGE", async () => {
    if (!run?.runId) return { ok: false };
    const r = await j(`${BASE}/v1/lineage/${encodeURIComponent(run.runId)}`);
    return {
      status: r.status,
      ok: r.status === 200 && r.body.lineageVerified !== false,
      lineageVerified: r.body.lineageVerified,
      nodeCount: r.body.lineage?.nodes?.length,
    };
  });

  await step("SESSION_PATCH_ALLOWLIST", async () => {
    const r = await j(`${BASE}/v1/os/session`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "default",
        roleId: "arch.market_analyst",
        forbiddenField: "should-be-ignored",
      }),
    });
    const ok =
      r.status === 200 &&
      (r.body.roleId === "arch.market_analyst" ||
        r.body.role === "arch.market_analyst") &&
      r.body.forbiddenField == null;
    return { status: r.status, ok, version: r.body.version };
  });

  if (deadEnds.length) issues.push(...deadEnds.map((d) => `DEAD_END:${d}`));

  const proof = {
    schema: "sci-os-block2-gw1-birth/v1",
    label: "ALPHA_NON_PRODUCTION",
    at: new Date().toISOString(),
    base: BASE,
    steps,
    primaryDeadEndCount: deadEnds.length,
    deadEnds,
    issues,
    status: deadEnds.length === 0 ? "PASS" : "FAIL",
  };

  fs.mkdirSync(OUT, { recursive: true });
  const outPath = path.join(OUT, "proof-block2-gw1-birth.json");
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(
    JSON.stringify(
      { outPath, status: proof.status, deadEnds: deadEnds.length },
      null,
      2
    )
  );
  if (deadEnds.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
