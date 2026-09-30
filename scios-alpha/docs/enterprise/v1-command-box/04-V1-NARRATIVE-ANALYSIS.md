# V1 parancsbox — olvasható mélyelemzés (additive)

**Ez a dokumentum NEM helyettesíti** a `01-GAP-CATALOG.md` (1000 atom) és `completion-work-units.json` (10000 WU) fájlokat.  
**Hozzáadás:** emberi nyelvű 1.x / 2.x / 3.x összegzés, brutális őszinteséggel arról is, **hol sűrű a katalógus kartéziánus bővítés, és hol van a valódi lyuk.**

**Label:** `ALPHA_NON_PRODUCTION` · **Nem READY.**  
**Élő OS:** `start-sci-os.cjs` → CP `:3000` → Shell `apps/cockpit-ui` `:4000`.  
**V1 kért 24 path a lemezen:** **0 / 24**.

---

## Meta-őszinteség a „1000 pontról”

A gépi katalógus **1000 lezárható atom**. Nem 1000 független termékötlet.

| Szekció | Atom | Mi sűríti |
|---------|------|-----------|
| 1.1 | 111 | 24 V1 path × scaffold (package.json/index/test/README/tsconfig) + lock |
| 1.6 | 78 | 11 GW1 stage × 7 szerződés (guard/effect/audit/timeout/span/copy/compensation) |
| 2.1 | 142 | fájlnevek + konzol UI state-ek |
| 2.3 | 169 | ~20 resource × 5 HTTP ige |
| 2.5 | 174 | ugyanaz × 401/403/404/409/429/503 |
| 1.2–1.5, 1.7–1.13, 3.2, 3.4–3.8 | 1–1 | **egy-egy valódi rendszedlyuk**, nem 80 ismétlés |

**Ez nem csalás, ha munkagráfnak nézed** (minden resource-nak tényleg kell GET/POST és 403).  
**Csalás lenne,** ha 174 darab 403-at 174 külön „hiányzó terméknek” hazudnánk. Itt nem tesszük.

Osztály a 1000-en: ABSENT 356 · PARTIAL_NEAR 240 · UNSPECIFIED 199 · UNWIRED 119 · NAME_ONLY 86.

---

# 1. RÉSZ — STRUKTURÁLIS HIÁNYOK

Minden alpont: **MI HIÁNYZIK** · **MIÉRT BAJ** · **MIT KELLENE LÁTNI** · **RÉTEG**.

### 1.1 FOLDERSTRUKTÚRA (111 atom, W0/W1/W3)

**Hiányzik:** A V1 8 `apps/*` + 16 `packages/*` útvonal. Nincs a fán. A hiány **nem** azt jelenti, hogy mkdir-elni kell őket HTTP-appként.

**Miért baj:** Péter a mappaneveket OS-nek hiszi. Ha szó szerint felépül 8 listen(), split-brain: két Shell, két boot, két paletta. User: mindenki. Risk: ONE CANONICAL PRODUCT törik.

**Kellene:** Mapping tábla V1 név → élő authority (`cockpit-ui`, `control-plane-api`, `design-system`, `vertical-slice`, `osSession` jobs). Compose, ne fork.

**Réteg:** Shell / AppHost + Platform.

### 1.2 PACKAGES (1 atom)

**Hiányzik:** `@scios/ui-tokens` … `@scios/routing` mint workspace package. Élő: `design-system`, `observability`, `governance-engine`, `model-registry`, `vertical-slice`, `os-environment`, `product-kernel`.

**Miért baj:** Üres 16 package = hamis `pnpm build` zöld képesség nélkül (NAME_ONLY OS).

**Kellene:** Tokenek = design-system kiterjesztés. UI = inlinable JS a cockpitbe. Engine = adapter.

**Réteg:** Design-system / tokens + Engines.

### 1.3 APPS (1 atom)

**Hiányzik:** 8 konzol-app. Élő 7 más app: cockpit-ui, control-plane-api, prediction-engine, risk-engine, execution-simulator, mock-api, meta-recovery-control-plane.

**Miért baj:** REJ-200-APPS, ADR-SHELL-001. 8 termék ≠ Experience Compiler.

**Kellene:** `?view=console.admin` … a Shellben, egy origin `:4000`.

**Réteg:** Technical consoles.

### 1.4 ENGINEK (1 atom)

**Hiányzik:** V1 `workflow-engine` / `ai-engine` / `observability-engine` / `security-engine` / `state-engine` mint **új authority**.

**Miért baj:** Második GW1, második audit log, második session. GW1 11 stage már kanonikus.

**Kellene:** Façade a meglévő package-ekre. Tilos második `VERTICAL_SLICE_STAGES`.

**Réteg:** Engines.

### 1.5 UI RÉTEGEK (1 atom)

**Hiányzik:** tokens → core → layout → molecules → organisms lánc. Van: `tokens.js/css` + `primitives.js` (4 helper) + ~1530 sor monolith HTML a cockpitben.

**Miért baj:** Konzolok vagy bemásolják a monolithot, vagy új skin (UXD-COLOR-001 sérül). Professional UI nem komponens.

**Kellene:** Inlinable `CORE_BROWSER_SOURCE` mint a primitives; fokozatos csere, nem Vite-második-shell.

**Réteg:** Professional UI + Design-system.

### 1.6 WORKFLOW (78 atom)

**Hiányzik:** Generic machine (states, guards, effects, audit) **adapterként**. A 78 atom = 11 GW1 lépés × (guard, effect, audit, timeout, compensation, span, Professional copy).

**Miért baj:** V1 „state machine” második pipeline-t sugall. Illegal transition / duplicate action. User: analyst a GW1-en. Risk: ADR-ACTION-001.

**Kellene:** Minden stage a `vertical-slice` + CF11 `TRANSITION_MATRIX` fölött. Nincs második spine.

**Réteg:** Engines (governance / jobs).

### 1.7 KONZOLOK (1 atom)

**Hiányzik:** Admin, Developer, AI Center, Obs, Security, Ops, Platform **nézet** a Shellben.

**Miért baj:** Admin nem lát usert. Engineer nem lát trace-t. Operator nem lát queue depth-et. A Job Center **részben** megvan — a többi ABSENT.

**Kellene:** Technical workspace, Professional default érintetlen (UXD-PRO-001). Empty = UNKNOWN, nem zöld.

**Réteg:** Technical consoles.

### 1.8 SHELL (1 atom)

**Hiányzik:** URL router, sidebar, breadcrumbs. Van: `showView()`, primary nav, Ctrl+K cmdk, `/v1/os/shell`.

**Miért baj:** Deep link nincs. Refresh elveszti a view-t. V1 `os-shell` második AppHost-nak hangzik.

**Kellene:** History API `?view=` a **meglévő** cockpitben. `apps/os-shell` listen() = do-not-fork.

**Réteg:** Shell / AppHost.

### 1.9 OBSERVABILITY (1 atom)

**Hiányzik:** log viewer, metric explorer, trace map, query API. Van: structured logger, in-memory metrics, `EventBus`, `/v1/observability/health`, `otelHealth` **probe**.

**Miért baj:** Health JSON ≠ observatory. Operator vak. OTEL SDK export nincs (W4).

**Kellene:** `GET /v1/obs/logs|metrics|traces` in-memory ALPHA + Technical view. Collector down → UNKNOWN, nem piros total failure.

**Réteg:** Engines + Technical consoles.

### 1.10 SECURITY (1 atom, finish p2-enterprise az OIDC részre)

**Hiányzik:** user store, session inspector UI, OIDC, CSRF cookie session. Van: `AUTH_MODE=local-development`, 4 szerep (`researcher|operator|risk_officer|admin`), `can()`, in-memory audit, `/v1/os/session`.

**Miért baj:** Mindenki operator. Mutáció nincs principalhoz kötve. OIDC-t first-release READY-nek hazudni = REJ-FALSE-READY.

**Kellene:** W2: local session + 403 audit. W4: OIDC — capability ABSENT marad.

**Réteg:** Security / auth / roles / permissions.

### 1.11 AI (1 atom)

**Hiányzik:** agent manager, pipeline execution UI, citation engine. Van: `model-registry` (NON-PRODUCTION), explain panel, GW1 `baseline-logistic`.

**Miért baj:** V1 „agent manager” REJ-AGENT-SWARM. AI panel magyaráz, nem cselekszik — ez **helyes**, de nincs governed Proposal API.

**Kellene:** `POST /v1/ai/proposals` citationnel. Auto-execute tilos. LLM opcionális, GW1-et nem blokkol.

**Réteg:** Engines (AI) + Technical consoles.

### 1.12 OPERATIONS (1 atom)

**Hiányzik:** queue monitor, scheduler UI, durable worker. Van: CF11 job state, `/v1/os/jobs`, Job Center view, in-process smoke worker.

**Miért baj:** Job Center ≠ operations OS. BullMQ/Redis = W4, nem P0.

**Kellene:** Queue depth + in-memory cron ALPHA a meglévő jobs API-ra.

**Réteg:** Operations / jobs / queues / scheduler.

### 1.13 PLATFORM (1 atom)

**Hiányzik:** deployment map, environment manager UI. Van: `os-environment` service registry JSON, `infra/docker` compose, `local-foundation` profil.

**Miért baj:** V1 nem ismerte a kanonikus runtime-ot. Env write / multi-region = W4.

**Kellene:** Read-only env/service view a Shellben (W3).

**Réteg:** Platform / service registry / env.

---

# 2. RÉSZ — IMPLEMENTÁCIÓS HIÁNYOK

A V1 **egyetlen** OpenAPI path-t, Zod sémát, HTTP hibakódot, log mezőt, span nevet, RBAC policy-t vagy AI-pipeline lépést **nem** írt le. Ez UNSPECIFIED, nem „majd a kód kitalálja”.

### 2.1 NINCS KONKRÉT KÓD / FÁJL (142)

**Hiányzik:** `button.js`, `modal.js`, `sidebar.js`, `store.js`, `route-map.js`, konzol `render.js`, stb. a cockpit/CP fán (nem a V1 üres mappában).

**Miért baj:** Monolith HTML-ben ad hoc gombok. Constitution: consequential control `actionId` nélkül tilos.

**Kellene:** Fájlok a B.1–B.21 listán (`03-COMPLETION-ARCHITECTURE.md`). Inlinable, bundler nélkül.

**Réteg:** Professional UI + Shell.

### 2.2 NINCS KONKRÉT INTERFACE (97)

**Hiányzik:** `SciTokenContract`, `ButtonProps`, `StateMachine`, `Proposal`, `Session`, `FormSchema`, `EventEnvelope` típuskatalógus (az EventBus interface **létezik**, az event **típusnevek** nem).

**Miért baj:** Adapter nélkül minden konzol saját JSON-t talál ki.

**Kellene:** JSDoc/TS export a live package-ből. Adapter nevezi a delegált engine-t.

**Réteg:** Engines + UI.

### 2.3 NINCS KONKRÉT API (169)

**Hiányzik:** `/v1/admin/users`, `/v1/obs/logs`, `/v1/sec/sessions`, `/v1/ai/proposals`, `/v1/ops/queues`, `/v1/dev/openapi`, `/v1/plat/services` (console API).  
**Van:** `/v1/home`, `/v1/search`, `/v1/slice/run`, `/v1/os/jobs`, `/v1/os/session`, `/v1/models`, `/v1/governance/can`, `/v1/observability/health`.

**Miért baj:** Konzolnak nincs mivel beszélnie. 169 atom = resource × ige — a **lyukak** ~20 resource, nem 169 termék.

**Kellene:** Control Plane a termék API. Új port tilos.

**Réteg:** Engines + Technical consoles.

### 2.4 NINCS KONKRÉT ADATMODELL (54)

**Hiányzik:** `User`, `RoleAssignment`, `AuthEvent`, `LogHit`, `SpanNode`, `QueueDepth`, `CronSpec`, `Citation`, `WorkflowInstance` mint Zod a CP-n.  
**Van:** data-fabric envelopes (Prediction, Risk), Job schema CF11, ModelMeta.

**Miért baj:** UI és API szétesik. SCI object model (Entity, Case, Evidence) a V1-ben **nincs használva**.

**Kellene:** Új modell a kernel típusaira épül, ne párhuzamos ontológia.

**Réteg:** Engines + Platform.

### 2.5 NINCS KONKRÉT ERROR HANDLING (174)

**Hiányzik:** egységes `{ error, code, correlationId, retryable, evidence }` 401/403/404/409/429/503-ra. Cockpit: banner + `createErrorState`. Nincs global unhandledrejection overlay.

**Miért baj:** 174 atom = 20 resource × 6 kód. A **minta** hiányzik egyszer; a kódok minden route-on kellenek.

**Kellene:** Dimensional status. UNKNOWN ≠ 500. 409 illegal job transition (mátrix már van, envelope nem egységes).

**Réteg:** Shell + Security + Operations.

### 2.6 NINCS KONKRÉT LOGGING (35)

**Hiányzik:** eseménykatalógus (`sci.ui.view.changed`, `sci.wf.transitioned`, `sci.ai.proposal.created`, `sci.sec.auth.failed`, …). Van: JSON logger + `redactLogMeta`.

**Miért baj:** Konzol nem tud query-zni. PII risk, ha dump.

**Kellene:** Típusos event + retention ALPHA (in-memory ring).

**Réteg:** Engines (observability).

### 2.7 NINCS KONKRÉT METRICS (31)

**Hiányzik:** névkonvenció, cardinality szabály, query. Van: in-memory `inc`/`timing`/`snapshot`. Health akkor is „metrics enabled”, ha üres — **őszintétlen READY szag**.

**Miért baj:** Nincs RED/USE, nincs SLO a first-release-en (enterprise.discipline READY false — helyes).

**Kellene:** Néhány bounded counter (nav, job fail, deny). Nem Prometheus-fork P0.

**Réteg:** Engines + Operations.

### 2.8 NINCS KONKRÉT TRACE (26)

**Hiányzik:** span API, parent/child, sampling. Van: `x-request-id`, otel **health probe**, nincs SDK export.

**Miért baj:** Trace map üres. OTLP SDK = W4 (2 atom a katalógusban — kevés, mert kevés a valódi lyuk).

**Kellene:** No-op span W2; export W4 UNKNOWN.

**Réteg:** Engines.

### 2.9 NINCS KONKRÉT SECURITY POLICY (26)

**Hiányzik:** route-level `can(role, action)` a legtöbb `/v1/*` mutáción; user CRUD policy; Technical console gate. Van: 9 action × 4 role mátrix, nem a konzol resource-okra.

**Miért baj:** `manage_users` létezik, user store nincs — policy levegőbe mutat.

**Kellene:** Minden új POST a mátrixba + audit. OIDC W4.

**Réteg:** Security.

### 2.10 NINCS KONKRÉT AI-PIPELINE (26)

**Hiányzik:** prompt, grounding, citation schema, abstain, proposal ≠ execute. Van: GW1 in-process modell, honesty banner, AI context lista.

**Miért baj:** „Pipeline manager” szó = autonóm swarm illúzió.

**Kellene:** Egy ALPHA pipeline: explain-with-citations. GW1 nem LLM.

**Réteg:** Engines (AI).

---

# 3. RÉSZ — RENDSZERSZINTŰ HIÁNYOK

A V1 **rendszerképet nem adott**. Az élő OS **adott** (boot, port, GW1) — a V1 ezt ignorálta. A lyuk: a V1 spec és a truth **nincs összekötve**, nem az, hogy nincs boot.

### 3.1 NINCS TELJES OS-SZINTŰ ARCHITEKTÚRA DIAGRAM (3 atom)

**Hiányzik:** A V1-ben layer/sequence/deployment ábra. A termékben van truth doc, nincs egyetlen V1-kompatibilis ábra a parancsboxban.

**Miért baj:** Építés irány nélkül → párhuzamos OS.

**Kellene:** A `03` A.1 diagram: capsule → start-sci-os → :3000 + :4000 → composed consoles.

**Réteg:** Platform + Shell.

### 3.2 NINCS TELJES OS-SZINTŰ LIFECYCLE (1)

**Hiányzik:** V1 install/boot/ready/degraded/shutdown. **Élő:** bootstrap-capsule, transactional boot, VERIFY_HOME, sci:stop, packaged reboot proof (részben).

**Miért baj:** Új lifecycle = ADR-BOOT-001 sértés.

**Kellene:** Lock a kanonikus boot. V1 ne vezessen be `pnpm os:start`-ot.

**Réteg:** Platform.

### 3.3 NINCS TELJES OS-SZINTŰ FAILURE-MODE (11)

**Hiányzik:** V1 mátrix. Részben élő: OPTIONAL_INFRA_DEGRADED vs NO_GO. A 11 atom: CP down, PG absent, OTEL down, session expiry, illegal job, agent deny, palette drift, second boot, unvalidated model, lineage mismatch, stb.

**Miért baj:** Hamis total failure vagy hamis READY.

**Kellene:** Dimensional status (BOOT/CORE/CAPABILITY/…). REJ-FALSE-READY.

**Réteg:** Shell + Platform.

### 3.4 NINCS TELJES OS-SZINTŰ OBSERVABILITY STRATÉGIA (1)

**Hiányzik:** store, retention, PII, SLO, dashboard authority. Van: local JSON + correlation + optional OTLP **konfig**.

**Miért baj:** „logs/metrics/traces/dashboards” szó Grafana-klónt sugall.

**Kellene:** Local-first. OTLP W4. Konzol UNKNOWN ha nincs store.

**Réteg:** Engines.

### 3.5 NINCS TELJES OS-SZINTŰ SECURITY MODELL (1)

**Hiányzik:** threat model, tenancy, secrets, OIDC. Van: loopback bind, local-dev auth, 4 role.

**Miért baj:** Enterprise security színház first-release-en.

**Kellene:** AUTH_MODE létra: local-development → session ALPHA → OIDC P2.

**Réteg:** Security.

### 3.6 NINCS TELJES OS-SZINTŰ AI-INTEGRÁCIÓS MODELL (1)

**Hiányzik:** Swiss Evidence Protocol a V1-ben, grounding, human approval. Van: proposal badge a GW1 approval cardon (session-only, nem durable DecisionAction — a UI **őszintén** kiírja).

**Miért baj:** Agent control UI durable governance-nek **hazudhatná**.

**Kellene:** GOVERNANCE > AGENT. Proposal ≠ done.

**Réteg:** Engines + Professional UI.

### 3.7 NINCS TELJES OS-SZINTŰ OPERATIONS PLAYBOOK (1)

**Hiányzik:** on-call, runbook, backup a V1-ben. Van: repair/safe boot, job reconcile, meta-recovery csomag.

**Miért baj:** Új ops console második incident-OS.

**Kellene:** Playbook a meglévő `sci:repair` / jobs / diagnostics-export fölé.

**Réteg:** Operations.

### 3.8 NINCS TELJES OS-SZINTŰ PLATFORM STRATÉGIA (1)

**Hiányzik:** k8s/multi-env a V1-ben. Van: local-foundation, packaged LOCALAPPDATA, docker compose optional.

**Miért baj:** „environment manager” write = production pretence.

**Kellene:** Read-only env W3. Write/multi-env W4 ABSENT.

**Réteg:** Platform.

---

# 2) BEFEJEZÉSI TERV — hol van a 10 000 pont

**Nem másolom ide a 10000 sort** (az `completion-work-units.json`). Összekötés:

Minden GAP × 10: SPEC → FILE → INTERFACE → IMPLEMENT → WIRE → ERROR → O11Y → TEST → PROOF → GATE.

| Hullám | GAP | WU | Mit csinál |
|--------|-----|----|------------|
| W0 | 84 | 840 | Lock élő boot/Shell/GW1; tilos fork |
| W1 | 278 | 2780 | P0 UI/Shell a cockpitben |
| W2 | 333 | 3330 | P1 adapter + `/v1/obs` `/v1/sec` + jobs; GW1 zöld |
| W3 | 303 | 3030 | Konzolok composed, UNKNOWN-honest |
| W4 | 2 | 20 | OIDC/OTLP/durable — ABSENT, nem READY |

P0 3620 · P1 3330 · P2 3050.

**A. OS-kép, rétegek, failure, obs/sec/AI/ops/platform:** `03-COMPLETION-ARCHITECTURE.md` A.1–A.9 — **már megvan, nem írjuk felül.**

**B.1–B.21 fájl / komponens / API / modell / error / o11y / security / pipeline / lépés / P0–P2 / dependencia:** ugyanott B fejezet — **már megvan.**

Dependencia-lánc (ismét, hogy itt is álljon):

**B.1 tokens → B.2 core → B.3 layout → B.4 molecules → B.5 organisms → B.6 nav + B.7 status + B.13 routing + B.12 state → B.8…B.11 engine adapterek → B.14 shell chrome → B.15…B.21 konzolok.**

Tiltások a tervben: nincs 8 HTTP-app, nincs második workflow-engine a GW1 mellett, nincs hamis READY.

---

# 3) RENDSZER ÉBRESZTÉSI JELENTÉS (emberi)

A V1 parancsbox **bevásárlólista** volt: mappák és szavak (button, agent, log viewer). Nem volt benne boot, port, API, hiba, governance, sem a már futó SCI OS.

A lyuk nem az, hogy „nincs OS”. Van OS: egy kattintásos boot, Control Plane, Professional Home, Analyze (GW1), Evidence, Job Center. A lyuk az, hogy a V1 **másik OS-t képzelt**, és a konzolok / atomic UI / query-obs / user-admin **nincsenek rákötve** erre.

**Hibák:** 0/24 V1 path; 8-app tiltott; tokeneket nem szabad cserélni; OIDC/enterprise **nincs** és **nem** first-release; a 1000-es lista egy része munkagráf-bővítés (HTTP ige × resource) — ezt ki kell mondani.

**Befejezés:** ne építs új OS-t. W1 a cockpit chrome és a design-system kiterjesztés. W2 adapter. W3 Technical view UNKNOWN-nal. W4 maradjon vékony és ABSENT.

**Célállapot:** ALPHA, egy termék, egy boot, egy Shell. Professional döntési gerinc (DATA→…→LINEAGE) megmarad. Konzolok mérnöki lencsék, nem 8 startup. Enterprise-grade **irány**, nem mai READY pecsét.

Részletes atomok: `01-GAP-CATALOG.md`.  
Munkagráf: `completion-work-units.json`.  
Architektúra: `03-COMPLETION-ARCHITECTURE.md`.  
Rövid verdict: `00-AWAKENING-REPORT.md`.
