# BENCHMARK CONTRACT — 2026 Enterprise AI quality bar

**Role:** the quality level we measure SCI OS against  
**Authority axis:** External pattern parity (not vendor cloning)  
**Evidence machine:** `diagnostics-export/gap-to-zero/01-2026-enterprise-ai-benchmark.json`  
**Human companion:** `docs/enterprise/SCI_OS_2026_GAP_TO_ZERO_REPORT.md`  
**Updated:** 2026-08-13

---

## Contract statement

SCI OS ×10 is measured against **2026 enterprise AI / operational intelligence patterns**, derived from public product documentation of leading platforms (pattern benchmark only — no proprietary code, no brand copying).

Minimum reference set:

- Palantir AIP / Foundry — ontology objects/actions, human approval defaults, lineage  
- Microsoft Copilot Studio — agents, connectors, human-in-the-loop  
- ServiceNow AI Control Tower / Agent Orchestrator — operational monitoring  
- Salesforce Agentforce — role/task agents under governance  

---

## What we score (dimensions)

Ontology / enterprise objects · context · workflow · actions · agents · multi-agent orchestration · human approval · governance · audit · explainability · evidence · data lineage · role adaptation · search · workspace composition · interactive AI · governed generative UI · monitoring · notifications · long-running jobs · session state · collaboration · automation · failure/recovery · security · deployment.

---

## Allowed classifications (SCI vs bar)

| Class | Meaning |
|-------|---------|
| AHEAD | Evidence shows SCI exceeds the pattern |
| PARITY | Evidence shows comparable pattern depth |
| PARTIAL | Pattern present but incomplete |
| BEHIND | Pattern expected; SCI weaker |
| ABSENT | Not present |
| NOT_APPLICABLE | Out of product scope |
| UNKNOWN | No fresh evidence — never treat as PASS |

**Rule:** Do not claim competitive superiority without evidence.

---

## First-release vs full-vision bars

| Bar | Scope |
|-----|--------|
| **First release** | Coherent professional path Home → Search → Entity → Analyze (GW1) → Risk/Gov → Simulation → Evidence/Lineage; no raw-JSON primary UX; no conflicting boot authority; packaged path independent of host Node/pnpm/Cursor |
| **Full vision** | 200+ professions via composition, enterprise ontology depth, durable fabric, OIDC, collaboration, production-eligible science — **not** required to close first release |

Unfinished full vision must not falsely fail first release. First-release gaps must not be hidden behind vision narrative.

---

## Current snapshot (evidence-bound)

Regenerate with `pnpm gap:zero`. As of last signoff:

- Most scored dimensions: **PARTIAL**
- Global search: **PARITY**
- Collaboration: **ABSENT** (post first-release)
- Enterprise auth (OIDC): **BEHIND**
- UX 2026 overall: **PARTIAL** (`27-zero-level-signoff.json`)

---

## Related pillars

| Pillar | Question |
|--------|----------|
| [FOUNDER BLUEPRINT](./FOUNDER_BLUEPRINT.md) | Why / what are we building? |
| [CURRENT SYSTEM TRUTH](./CURRENT_SYSTEM_TRUTH.md) | What is wired in source? |
| [CURRENT EVIDENCE](./CURRENT_EVIDENCE.md) | What is proven to work? |
