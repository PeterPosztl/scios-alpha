# SCI OS ×10 — Rendszerébresztési jelentés (V1 parancsbox)

**Label:** `ALPHA_NON_PRODUCTION`  
**Dátum:** 2026-09-19  
**Hatóság:** Product Memory + `CURRENT_SYSTEM_TRUTH.md` + élő fa (`scios-alpha`)  
**Nem READY.** Nincs enterprise GO. A V1 mappák létezése sem lenne PASS.

---

## Egy mondatban

A V1 parancsbox **nem operációs rendszer-specifikáció**, hanem **mappa- és szókészlet**. A kért 24 útvonalból **0 van a lemezen**. A működő SCI OS ×10 **máshol** él: `apps/cockpit-ui` (Shell :4000), `apps/control-plane-api` (:3000), `installer/scripts/start-sci-os.cjs`, `packages/design-system`, GW1 vertical-slice. A V1-et **szó szerint felépíteni 8 külön appként** sértené a Founder szerződéseket.

---

## Mi volt a V1?

Péter V1 listája: 8 app + 16 package + UI rétegek + 6 engine + konzol-feature szavak. Nem adott:

- kanonikus bootot
- portokat
- API-kat
- adatmodelleket
- hibakódokat
- failure-mode mátrixot
- security threat modelt
- AI citation/governance szabályt
- összekötést a meglévő SCI object modelhez

Ezért a V1 **nem befejezhető önmagában** — előbb **rá kell ültetni** a már létező OS-re.

---

## Mit talált a vizsgálat

| Tény | Érték |
|------|--------|
| V1 kért apps + packages a fán | **0 / 24** |
| Gap atom (GAP-0001…GAP-1000) | **1000** |
| Befejezési munkaegység (WU-00001…WU-10000) | **10000** |
| Osztály: ABSENT | 356 |
| UNSPECIFIED | 199 |
| PARTIAL_NEAR | 240 |
| UNWIRED | 119 |
| NAME_ONLY | 86 |
| Finish: compose-in-shell / adapter / lock-existing / unknown-honest / do-not-fork / p2-enterprise | 639 / 246 / 79 / 29 / 5 / 2 |
| Hullám GAP: W0 / W1 / W2 / W3 / W4 | 84 / 278 / 333 / 303 / 2 |
| WU P0 / P1 / P2 | 3620 / 3330 / 3050 |

W4 szándékosan 2 atom: OIDC és a többi enterprise lyuk **kevés és valós**, nem 3000 kitalált P2 task. First-release ezeken UNKNOWN, nem READY.

Előző kör (V1 „építsd fel”): harness + szerződések betöltve, **egy V1 mappa sem került létrehozásra** — helyesen, mert a literal 8-app OS **tiltott párhuzamos hatóság**.

---

## Szerződésütközések (ha V1-et szó szerint építenénk)

1. **REJ-200-APPS / PCT-ROLE-COMPOSITION** — 8 konzol mint külön app.
2. **ADR-SHELL-001** — `apps/os-shell` második AppHost.
3. **ADR-BOOT-001** — új start-lánc.
4. **PCT-DESIGN-TOKENS** — `ui-tokens` paletta-csere a design-system helyett.
5. **PCT-PORTS** — V1 nem ismeri a 3000/4000-et.
6. **UXD-PRO-001** — developer console Professional default-tá válhat.
7. **REJ-AGENT-SWARM** — kormányzatlan agent manager.
8. **REJ-FALSE-READY** — mappa = „kész OS”.

---

## Mi a végső célállapot (őszintén)

Nem „enterprise-grade production OS holnap”. Hanem:

**Egy kanonikus termék:** Boot → Control Plane :3000 → Shell :4000 → Home → Search → Entity → GW1 → Evidence.  
A V1 **UI rétegek és konzolok** **komponált Technical workspaces** a Shellben.  
Az enginek **adapterek** a már létező governance / observability / model-registry / job / slice fölött.  
Minden kimenet `ALPHA_NON_PRODUCTION`. OIDC, PG-fabric, GW2–7 **P2/P3**, nem első release hazugság.

---

## Következő lépések (P0)

1. Mapping lock: V1 név → meglévő authority (ez a dokumentumcsomag).
2. `ui-tokens` **kiterjeszti** `@scios/design-system`-et, nem cseréli.
3. UI core/layout inlinable források a cockpitbe (nincs Vite második shell).
4. Routing + sidebar/breadcrumbs a **meglévő** `showView` fölött, History API-val.
5. Konzolok mint `data-v` nézetek + `os-environment` app registry, új port nélkül.
6. Engine csomagok adapterként; GW1 spine érintetlen.
7. Minden PR: teszt + `diagnostics-export` + tilos READY.

Részletek: `03-COMPLETION-ARCHITECTURE.md` · `01-GAP-CATALOG.md` · `completion-work-units.json`
