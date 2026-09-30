/**
 * Enrich V1 gap atoms with canonical layer, wave, finishMode, user, risk.
 * ALPHA_NON_PRODUCTION — analysis only.
 */

const LAYERS = {
  SHELL: "Shell / AppHost",
  PRO: "Professional UI",
  TECH: "Technical consoles",
  ENG: "Engines (governance / jobs / observability / model-registry / AI)",
  TOK: "Design-system / tokens",
  SEC: "Security / auth / roles / permissions",
  OPS: "Operations / jobs / queues / scheduler",
  PLAT: "Platform / service registry / env",
};

const SECTION_MAP = {
  "2.concrete files": "2.1",
  "2.typed contracts": "2.2",
  "2.callable APIs": "2.3",
  "2.data models": "2.4",
  "2.error handling": "2.5",
  "2.logging": "2.6",
  "2.metrics": "2.7",
  "2.traces": "2.8",
  "2.security policy": "2.9",
  "2.AI/workflow pipelines": "2.10",
};

const SECTION_TITLE = {
  "1.1": "Strukturális — folderstruktúra (V1 path ≠ élő fa)",
  "1.2": "Strukturális — packages (ui-* / *-engine nevek)",
  "1.3": "Strukturális — apps (8 konzol vs cockpit AppHost)",
  "1.4": "Strukturális — enginek (név vs élő authority)",
  "1.5": "Strukturális — UI rétegek (monolith vs atomic)",
  "1.6": "Strukturális — workflow (GW1 + CF11 vs generic machine)",
  "1.7": "Strukturális — konzolok (Technical workspaces)",
  "1.8": "Strukturális — Shell (nincs második AppHost)",
  "1.9": "Strukturális — observability (health ≠ viewer)",
  "1.10": "Strukturális — security (local-dev ≠ OIDC)",
  "1.11": "Strukturális — AI (panel ≠ agent OS)",
  "1.12": "Strukturális — operations (Job Center ≠ queue/scheduler)",
  "1.13": "Strukturális — platform (registry JSON ≠ env manager)",
  "2.1": "Implementáció — konkrét fájl / forrás",
  "2.2": "Implementáció — interface / szerződés",
  "2.3": "Implementáció — API / endpoint",
  "2.4": "Implementáció — adatmodell",
  "2.5": "Implementáció — error handling",
  "2.6": "Implementáció — logging",
  "2.7": "Implementáció — metrics",
  "2.8": "Implementáció — traces",
  "2.9": "Implementáció — security policy",
  "2.10": "Implementáció — AI / workflow pipeline",
  "3.1": "Rendszer — architektúra diagram / mapping",
  "3.2": "Rendszer — lifecycle (boot már él, V1 nem ismeri)",
  "3.3": "Rendszer — failure-mode",
  "3.4": "Rendszer — observability stratégia",
  "3.5": "Rendszer — security modell",
  "3.6": "Rendszer — AI-integrációs modell",
  "3.7": "Rendszer — operations playbook",
  "3.8": "Rendszer — platform stratégia",
};

function blobMissing(g) {
  return `${g.module || ""} ${g.title || ""} ${g.missing || ""}`;
}

function finishMode(g) {
  const t = blobMissing(g);
  const m = g.module || "";

  if (m === "apps/os-shell") return "do-not-fork";
  if (m === "os-shell") return "compose-in-shell";
  if (m === "integration-existing" || m === "v1-spec-meta") return "lock-existing";
  if (m === "structural" || m === "system") {
    if (/OIDC/.test(t)) return "p2-enterprise";
    if (/OTEL|OTLP|durable|k8s/.test(t)) return "p2-enterprise";
    return "lock-existing";
  }

  if (/UNKNOWN \(no evidence\)|empty state|PARTIAL\/degraded banner|offline/.test(t)) {
    return "unknown-honest";
  }

  if (m === "ui-tokens" || m === "packages/ui-tokens") return "adapter";
  if (/^packages\/(workflow-engine|ai-engine|observability-engine|security-engine|state-engine)/.test(m)) {
    return "adapter";
  }
  if (/^packages\/ui-/.test(m) || m === "packages/routing") return "compose-in-shell";
  if (m === "obs" || m === "ai" || m === "security" || m === "workflow") return "adapter";
  if (/GW1 stage|vertical-slice|TRANSITION_MATRIX|EventEnvelope type/.test(t)) return "adapter";

  if (/^apps\//.test(m) || /admin-console|developer-console|ai-center|observability-console|security-console|operations-console|platform-console/.test(m)) {
    return "compose-in-shell";
  }
  if (["admin", "developer", "ops", "platform"].includes(m)) return "compose-in-shell";

  if (/ui-core|ui-layout|ui-molecules|ui-organisms|ui-navigation|ui-status|ui-error|routing/.test(m)) {
    return "compose-in-shell";
  }

  if (/OIDC provider|production OIDC|OTLP SDK export|durable queue|BullMQ/.test(t)) return "p2-enterprise";

  return "compose-in-shell";
}

function waveOf(g, finish) {
  const t = blobMissing(g);
  const m = g.module || "";

  if (finish === "p2-enterprise") return "W4";
  if (m === "integration-existing" || m === "v1-spec-meta" || m === "structural" || m === "system") {
    if (finish === "p2-enterprise") return "W4";
    return "W0";
  }
  if (finish === "do-not-fork") return "W0";
  if (m === "os-shell") return "W1";
  if (m === "apps/os-shell") return "W0";
  if (finish === "unknown-honest") return "W3";
  if (
    /ui-tokens|ui-core|ui-layout|ui-molecules|ui-organisms|ui-navigation|ui-status|ui-error|^packages\/ui-|routing/.test(
      m
    )
  ) {
    return "W1";
  }

  if (
    /workflow-engine|ai-engine|observability-engine|security-engine|state-engine/.test(m) ||
    m === "obs" ||
    m === "ai" ||
    m === "security" ||
    m === "workflow" ||
    /GW1 stage|EventEnvelope/.test(t)
  ) {
    return "W2";
  }

  if (m === "ops" && /jobs APIs exist|\/v1\/os\/jobs/.test(t)) return "W2";

  if (
    /admin-console|developer-console|ai-center|observability-console|security-console|operations-console|platform-console|^apps\//.test(m) ||
    ["admin", "developer", "platform", "ops"].includes(m)
  ) {
    return "W3";
  }

  if (finish === "adapter") return "W2";
  if (finish === "compose-in-shell") return m.includes("packages/ui") || /ui-/.test(m) ? "W1" : "W3";
  return "W2";
}

function priorityOf(wave, finish) {
  if (wave === "W0" || wave === "W1") return "P0";
  if (wave === "W2") return "P1";
  return "P2";
}

function layerCanon(g) {
  const t = blobMissing(g);
  const m = g.module || "";
  if (/OIDC|auth-events|permission|session inspector|security-engine|security-console|AUTH_MODE|role editor|users/.test(t)) {
    return LAYERS.SEC;
  }
  if (/token|design-system|palette|spacing|typography|elevation|motion|grid\.js|ui-tokens/.test(t)) {
    return LAYERS.TOK;
  }
  if (/job|queue|schedul|operations-console|CF11|Job Center/.test(t) && !/workflow-engine|GW1/.test(t)) {
    return LAYERS.OPS;
  }
  if (/platform-console|deployment map|environment manager|service registry|compose|local-foundation/.test(t)) {
    return LAYERS.PLAT;
  }
  if (
    /workflow-engine|ai-engine|observability-engine|model-registry|governance|vertical-slice|state-engine|EventEnvelope|GW1 stage/.test(
      t
    ) &&
    !/console|ai-center|observability-console/.test(m)
  ) {
    return LAYERS.ENG;
  }
  if (
    /admin-console|developer-console|ai-center|observability-console|security-console|operations-console|platform-console|Technical workspace/.test(
      t
    )
  ) {
    return LAYERS.TECH;
  }
  if (/os-shell|cockpit-ui|showView|History API|sidebar|topbar|breadcrumb|AppHost|routing/.test(t)) {
    return LAYERS.SHELL;
  }
  if (/Professional|pro-card|Home|Entity360|Analyze/.test(t)) return LAYERS.PRO;
  if (/ui-core|ui-layout|ui-molecules|ui-organisms|ui-status|ui-error/.test(m)) return LAYERS.PRO;
  if (m === "obs" || m === "ai") return LAYERS.ENG;
  if (m === "admin" || m === "developer") return LAYERS.TECH;
  if (m === "ops") return LAYERS.OPS;
  if (m === "platform") return LAYERS.PLAT;
  if (m === "security") return LAYERS.SEC;
  if (m === "shell") return LAYERS.SHELL;
  return LAYERS.SHELL;
}

function userOf(layer, g) {
  if (layer === LAYERS.PRO) return "Professional (analyst / decision path)";
  if (layer === LAYERS.TECH) return "Engineer / operator on Technical view (not Professional default)";
  if (layer === LAYERS.SEC) return "Admin + risk_officer; never anonymous mutation";
  if (layer === LAYERS.OPS) return "Operator (Job Center)";
  if (layer === LAYERS.PLAT) return "Platform operator (local-foundation / packaged)";
  if (layer === LAYERS.TOK || layer === LAYERS.SHELL) return "All roles via AppHost chrome";
  if (layer === LAYERS.ENG) return "Control Plane + Shell consumers; GW1 path must stay green";
  return "All roles";
}

function riskOf(g, finish) {
  if (finish === "do-not-fork") return "Split-brain: second boot/Shell/ports; ONE CANONICAL PRODUCT breaks";
  if (finish === "p2-enterprise") return "False READY if pulled into first-release P0";
  if (finish === "unknown-honest") return "Blank screen or green dashboard without evidence";
  if (finish === "lock-existing") return "V1 shopping list overwrites live authority";
  const t = blobMissing(g);
  if (/agent|AI pipeline|proposal/.test(t)) return "Ungoverned side effect (GOVERNANCE > AGENT)";
  if (/palette|token/.test(t)) return "SCI identity loss / vendor clone (UXD-COLOR-001)";
  if (/auth|permission|401|403/.test(t)) return "Policy bypass on Control Plane mutations";
  if (/log|PII|redact/.test(t)) return "Secret/PII leak in telemetry";
  if (/ILLEGAL_TRANSITION|job/.test(t)) return "Corrupt job state / duplicate side effect";
  if (/JSON|developer-console/.test(t)) return "Developer cockpit as Professional default (UXD-PRO-001)";
  return "Capability hole: must stay UNKNOWN/DEGRADED until proven, never READY";
}

function nearestOf(g) {
  if (g.nearest) return g.nearest;
  const m = g.module || "";
  if (/ui-tokens/.test(m)) return "packages/design-system";
  if (/ui-/.test(m)) return "apps/cockpit-ui/src/components/primitives.js + monolith HTML";
  if (/os-shell/.test(m)) return "apps/cockpit-ui + GET /v1/os/shell";
  if (/workflow/.test(m)) return "packages/vertical-slice + osSession TRANSITION_MATRIX";
  if (/ai-engine|ai-center|ai$/.test(m)) return "packages/model-registry + cockpit AI panel";
  if (/observability/.test(m) || m === "obs") return "packages/observability + otelHealth.ts";
  if (/security/.test(m)) return "packages/governance-engine + AUTH_MODE=local-development";
  if (/operations|ops/.test(m)) return "GET/POST /v1/os/jobs (CF11)";
  if (/platform/.test(m)) return "packages/os-environment service registry";
  if (/admin/.test(m)) return "governance can(manage_users) — no user store";
  if (/developer/.test(m)) return "apps/mock-api + engineering JSON view";
  if (/routing|state-engine/.test(m)) return "cockpit showView() + localStorage session";
  if (m === "integration-existing" || m === "v1-spec-meta" || m === "structural") {
    return "start-sci-os.cjs + cockpit-ui + control-plane-api";
  }
  return "apps/cockpit-ui (AppHost) / apps/control-plane-api";
}

function rewriteHonestMissing(g) {
  const miss = String(g.missing || "");
  if (/missing package\.json|missing src\/index|missing README|jsconfig\/tsconfig|targeted proof/.test(miss) &&
      /^(apps|packages)\//.test(g.module || miss)) {
    const p = g.module || miss.split(" ")[0];
    g.missing = `${p} MUST NOT be a new HTTP app/package boot. Live hole: compose this capability into cockpit-ui + Control Plane; V1 named a folder instead of a contract.`;
    g.shouldSee = `Registry entry in os-environment + cockpit view or CP route. Label ALPHA_NON_PRODUCTION. No listen() on a new port.`;
    g.why = `Creating ${p} as a second product splits AppHost/boot (ADR-SHELL-001 / ADR-BOOT-001). The user-facing hole is the missing composed module, not the missing directory.`;
  }
}

function normalizeSection(g) {
  if (SECTION_MAP[g.section]) g.section = SECTION_MAP[g.section];
}

function enrichGaps(gaps) {
  for (const g of gaps) {
    normalizeSection(g);
    rewriteHonestMissing(g);
    const finish = finishMode(g);
    const wave = waveOf(g, finish);
    const layer = layerCanon(g);
    g.finishMode = finish;
    g.wave = wave;
    g.priority = priorityOf(wave, finish);
    g.layer = layer;
    g.user = userOf(layer, g);
    g.risk = riskOf(g, finish);
    g.nearest = nearestOf(g);
    g.sectionTitle = SECTION_TITLE[g.section] || g.section;
  }
  return gaps;
}

const UNIT_HELP = {
  U1: "SPEC — one contract sentence at the live authority (README or product-memory if protected). State finishMode. No second OS.",
  U2: "FILE — create or lock a file on the live tree (cockpit-ui / control-plane / existing package). If finishMode is do-not-fork or lock-existing: assertion/test file only.",
  U3: "INTERFACE — export typed or JSDoc public contract. Name the existing engine if this is an adapter.",
  U4: "IMPLEMENT — ALPHA behavior. UNKNOWN/DEGRADED when evidence is missing. Never paint READY.",
  U5: "WIRE — bind to cockpit AppHost :4000 and/or Control Plane :3000. No new listen port.",
  U6: "ERROR — typed failure + UI/API path (401/403/404/409/503/UNKNOWN). Retry only when user-facing and safe.",
  U7: "O11Y — structured log + metric and/or span; redact secrets; correlation id.",
  U8: "TEST — targeted unit/contract test; fail closed if evidence missing.",
  U9: "PROOF — diagnostics-export artifact. Catalog id in the proof. No false READY.",
  U10: "GATE — existing gate or scoped proof script. GW1/boot must stay green.",
};

function unitStep(g, uid, name, genericDesc) {
  const mode = g.finishMode;
  if (mode === "do-not-fork" || mode === "lock-existing") {
    if (uid === "U2") {
      return `${name}: add lock/assertion (test or mapping JSON) that ${g.missing} is NOT implemented as a parallel app`;
    }
    if (uid === "U4") {
      return `${name}: verify live authority still owns this (${g.nearest}); do not add a second implementation`;
    }
    if (uid === "U5") {
      return `${name}: document mapping V1 name → ${g.nearest} in v1-command-box + os-environment if needed`;
    }
  }
  if (mode === "p2-enterprise" && (uid === "U4" || uid === "U5")) {
    return `${name}: keep ABSENT/UNKNOWN on first-release path; implement only behind P2 flag — ${g.missing}`;
  }
  if (mode === "unknown-honest" && uid === "U4") {
    return `${name}: render UNKNOWN/empty/degraded for ${g.missing}; never a fake-success dashboard`;
  }
  if (mode === "adapter" && uid === "U3") {
    return `${name}: adapter interface that delegates to ${g.nearest} — ${g.missing}`;
  }
  return `${name}: ${genericDesc} — [${g.id} ${g.wave}/${g.priority} ${mode}] ${g.missing}`;
}

module.exports = {
  LAYERS,
  SECTION_TITLE,
  enrichGaps,
  unitStep,
  UNIT_HELP,
};
