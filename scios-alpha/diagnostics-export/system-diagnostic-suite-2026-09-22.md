# SCI OS ×10 — System Diagnostic Suite

**Dátum:** 2026-09-22  
**Forrás:** Control Plane / Shell kód, `packages/ecl-dil`, Sep 20 session logok  
**Címke:** `ALPHA_NON_PRODUCTION`  
**Live pár a vizsgálatkor:** DOWN (`:3000` / `:4000` connection refused)

---

## Verdikt

A termék **nem üres díszlet**, de a kért engine-eket **pecséttel (`apply*Seal` / `ULTIMATE_MASTER`) nem lehet bekapcsolni**.

Van: Control Plane + Shell + in-memory ECL/DIL + HITL + GW1 vertical slice — ezek wired-ek.

Nincs (ABSENT, nem futtatható modul): folyamatos audit / limit / scenario engine, causal / national KG, hospitality / healthcare desk, Cockpit COMPUTE.

A `apply*Seal` route-ok **inspect-only scorerek**. Helyes válaszuk: `REFUSED` / `ANALOG_CONTRACT`. `persisted=false`.

Következő lépés: first-release boot proof, **vagy** a hiányzó engine-ek megírása — **nem** újabb pecsét.

---

## Gyors számok

| Mutató | Érték |
|--------|--------|
| Live CP :3000 / Shell :4000 | DOWN |
| OpenAPI / Swagger fájl | 0 |
| Professional GET inspect route | 20 (mind GET, `persisted:false`) |
| HITL mutation endpoint | 1 (`POST /v1/ai/proposals/:id/review`) |
| OpenAPI `GET /v1/dev/openapi` | ABSENT |
| `GET /v1/kg` | ABSENT |
| `GET /v1/cockpit` API | ABSENT (a Shell külön app: `apps/cockpit-ui`) |

### Control Plane route osztályok (~116 distinct method+path, alias nélkül)

| Osztály | Darab |
|---------|------:|
| WORKING | 72 |
| INSPECT_ONLY | 31 |
| PARTIAL | 12 |
| STUB | 1 |

### Capability registry (`docs/enterprise/CAPABILITY_REGISTRY.json`)

| Státusz | Darab |
|---------|------:|
| ALPHA | 11 |
| STUB | 3 (prediction-engine, risk-engine, execution-simulator FastAPI) |
| ABSENT | 1 (`enterprise.modules.sections-49-83`) |
| **Összesen** | **15** |

A termékút **beágyazott GW1 risk/governance**-t használ, nem a FastAPI stubokat.

---

## Ami él (WIRED) — nem pecsét, kód

- Boot: `start-sci-os.cjs` → Control Plane `:3000` + Shell `:4000`
- `GET /healthz` liveness (`ok:true` ≠ product READY); `GET /readyz` külön
- HITL: `POST /v1/ai/proposals/:id/review` (non-executable)
- Governance PEP: `GET /v1/governance/can`, `POST /v1/governance/evaluate`, `POST /v1/governance/action`
- GW1 vertical slice + run lineage (in-memory)
- ECL/DIL simulated book, audit log, DIL decide
- Home / Search / Entity / jobs / session
- Cyber + investment analog panelek **egy** Shellen

## Ami hiányzik (ABSENT) — pecsét nem kapcsolja be

- `GET /v1/kg` — nincs Control Plane route
- `GET /v1/cockpit` — a Shell UI, nem HTTP API
- OpenAPI / `GET /v1/dev/openapi`
- `nationalGraph` / `causalQueryEngine`
- Auto-audit / auto-limit / auto-scenario engine
- Hospitality + Healthcare katalógus és desk
- DIGITAL_CONTRACT második review bus
- Cockpit COMPUTE UNKNOWN sorozatokon

---

## Engine / domain leltár

WRITTEN ≠ READY. Nincs evidence ⇒ UNKNOWN, soha nem PASS.

| Candidate | Path | Class | Evidence |
|-----------|------|-------|----------|
| HITL / governance | `governance-engine` + ecl-dil runtime + `/v1/ai/proposals` | WIRED | AGENT → PROPOSAL → HUMAN → DECISION · `executable=false` |
| DIGITAL_CONTRACT seal | `ecl-dil/src/activation-pass.ts` `applyHumanReviewSeal` | INSPECT_ONLY | `callerFlagsIgnored` · `persistApplied=false` · `ANALOG_CONTRACT` |
| GW1 risk + lineage | `packages/vertical-slice` + `GET /v1/lineage/:runId` | WIRED | Embedded `SIMULATION_ONLY` · nem enterprise PG |
| KG Wave-1 overlay | `data-fabric` ontology + `os-blueprint-integration` | PARTIAL | `kgStatus=ANALOG_OVERLAY` · `nationalGraph=false` |
| Causal engine | ecl-dil `surfaces.causalEngine` | ABSENT | `causalQueryEngine=ABSENT` · preview REFUSED |
| Continuous audit engine | `ecl-dil/src/automation-prep.ts` | ABSENT | `autoAudit=false` · REFUSED |
| Limit engine (auto freeze) | `ecl-dil/src/automation-prep.ts` | ABSENT | `autoLimits=false` · freeze/hold/block REFUSED |
| Scenario engine | `ecl-dil/src/enterprise-prep.ts` | ABSENT | `crossDomainEngine=false` · REFUSED |
| Cockpit COMPUTE | `ecl-dil/src/digital-workspace-compute.ts` | INSPECT_ONLY | `computeMode=INSPECT_ONLY` frozen |
| Hospitality desk | `role-professional.ts` sandbox | ABSENT | catalog ABSENT · RESEARCH_REQUIRED |
| Healthcare desk | `role-professional.ts` sandbox | ABSENT | No PHI sandbox · SKIPPED |
| Cyber analog | professional-domain-registry + Cockpit Roles | WIRED | PARTIAL catalog · `live=false` · nem második desk |
| Investment analog | ecl-dil DIL + Cockpit Intelligence | WIRED | `SIMULATION_ONLY` book · nincs live broker |
| FastAPI risk/prediction | `apps/risk-engine` · `apps/prediction-engine` | STUB | Capability registry STUB · optional off-path |

---

## Control Plane / Shell lifecycle

**Orchestrator SIGTERM — WORKING.**  
`installer/scripts/start-sci-os.cjs` kezeli a SIGINT/SIGTERM-et → `supervisor.stopAll()` → exit **0** READY/DEGRADED után. Windows child leftover SIGTERM **exit 1** várható zaj, nem crash.

**Child graceful handlers — ABSENT.**  
`apps/control-plane-api/src/server.ts` és `apps/cockpit-ui` nincs SIGTERM / `server.close` handler. Közvetlen listener-kill nem-nulla exit. `healthz` csak liveness.

**Live pár 2026-09-22 — DOWN.**  
`GET http://127.0.0.1:3000/healthz` és `:4000/healthz` connection refused. Az utolsó élő pár a szept. 20-i HITL-seal inspect utáni reload volt.

---

## Log elemzés (2026-09-20 session)

Forrás: Cursor terminals (workspace) · `ecl_dil_request` JSON · **nem** durable product log store.

| Felület | Logged hits (kb.) |
|---------|------------------:|
| `ecl_dil_request` (hosszú CP session) | 3781 |
| `GET .../explain-visibility` | 21 |
| `GET .../activation-pass` | 5 |
| `/v1/ai/proposals` HITL | 24 |

A Control Plane csak path+method-ot logol (`ecl_dil_request`).  
`REFUSED` / `ANALOG_CONTRACT` / `persistApplied=false` a JSON body-ban és inspect-script stdout-ban van, **nem PASS pecsétként**.

Smoke 2026-09-20 15:39 UTC: `ok:true`, `fails=[]`, `autoTrade=false`.  
Egy log sor sem aktivált DIGITAL_KG-t, COMPUTE-ot vagy hospitality desket.

---

## Professional inspect felület

Handler: `apps/control-plane-api/src/routes/eclDil.ts`  
Envelope: `readEnvelope(...)` → mindig `persisted:false`  
Emberi tábla: `docs/enterprise/ecl-dil-api.md`  
**Nincs POST activation API.** Mind a 20 `/v1/ecl/professional*` route GET.

| Path | Scorer | Utolsó őszinte eredmény |
|------|--------|-------------------------|
| `GET /v1/ecl/professional/explain-visibility` | `buildExplainabilityAndVisibilityWave` | `wave=REFUSED` · HITL `ANALOG_CONTRACT` · `passGranted=false` |
| `GET /v1/ecl/professional/digital-workspace-compute` | `buildDigitalAndWorkspaceAndComputeWave` | `kgStatus=ANALOG_OVERLAY` · `desksCreated=0` · `INSPECT_ONLY` |
| `GET /v1/ecl/professional/activation-pass` | `applyUltimateMasterActivationSuite` | `applied=NONE` · `requestedApplied=ULTIMATE_MASTER` · `ready=false` |
| `GET /v1/ecl/professional/automation-prep` | `buildAutomationPrepWave` | `autoAudit/autoLimits/autoScenarios=false` |
| `POST /v1/ai/proposals/:id/review` | `runtime.reviewProposal` | Valódi HITL accept/reject · nem trade · nem DIGITAL_CONTRACT |

---

## Backend API térkép (kiemelés)

**OpenAPI/Swagger:** 0 fájl a `scios-alpha` fában. Sibling SCI fákban van OpenAPI, **nincs bekötve** ebbe a Control Plane-be.

**Összetétel** (`server.ts`): `eclDilRouter` → `productRouter` → `verticalSliceRouter` → `systemRouter` → demo fallback → 404.

**Valódi mutációk (nem inspect):** többek között  
`PUT /v1/ecl/guardrail`, `POST /v1/dil/decision`, `POST /v1/dil/resolve` (csak `simulated:true`), `POST /v1/ai/proposals`, `POST /v1/ai/proposals/:id/review`, `POST /v1/slice/run`, `POST /v1/governance/evaluate|action`, job engine POST-ok.

---

## Következő lépés (osztályozva)

1. **Ne írj több `apply*Seal` wrappert.** Ezek már léteznek, és már REFUSED-et adnak. Újabb master suite ugyanazt az inspect JSON-t adná.

2. **Ha a cél first release:** boot egy párral (`SCI-OS-Start.bat` / `pnpm sci:start`). Proof: healthz → Home → Search → Entity → GW1 → Evidence/Lineage → shutdown. Ez PARTIAL és in-scope. `healthz ok` **nem** product READY.

3. **Ha a cél digital KG / domain desk / auto engine:** ezek ABSENT. Kutatás-alapú katalógus kell (Hospitality és Healthcare **nem STUB — üresek**), causal query implementáció, és evidence a PASS előtt. Pecsét nem helyettesíti a kódot. Ez FULL PRODUCT VISION (P2/P3), nem foundation flip.

**ALPHA ≠ PRODUCTION.** Nincs evidence ⇒ UNKNOWN. `EXECUTION_MODE=SIMULATION_ONLY`.
