# Deep Foundations & Unknown-Unknowns

**Rule:** Discover expensive future omissions early. **Do not implement everything.**  
**Evidence:** `diagnostics-export/foundations/` (mirrored to `deep-foundations/`)  
**Commands:** `pnpm agent:harness` · `pnpm foundations:audit`  
**Harness:** `product-memory/agent-harness.json`

---

## Classification vocabulary

| Class | Meaning |
|-------|---------|
| IMPLEMENT_NOW_P0 | Required for safe first-release / boot honesty |
| IMPLEMENT_NOW_P1 | Required soon; cheap now, expensive later |
| LOCK_CONTRACT_NOW_IMPLEMENT_LATER | Freeze shape; adapters later |
| DEFER_P2 / DEFER_P3 | After first-release closure |
| REJECT | Explicitly out |

---

## Implemented / wired now

1. **Agent harness** — required Product Memory loads + trajectory guardian + Cursor rule.  
2. **Desired vs Actual reconciliation** — `desired-state.cjs` **wired into** `start-sci-os` (not a second boot).  
3. **Critical invariants** checked in reconcile (Home⇒Shell, packaged runtime/appRoot, READY vs UNKNOWN…).  
4. **Semantic types + epistemic schemas** — `semantic-types.ts`, `epistemic.ts` (contract; no mass rewrite).  
5. **Product Memory contracts** for temporal, learning loop, provider fabric, context, memory, collab, provenance, org/actor, policy.  
6. **Architecture entropy** lightweight metrics + adversarial matrix (coverage map) + technology radar stub.

---

## Explicitly rejected

- Second boot architecture  
- Mega-prompt as context fabric  
- Reopening OIDC in this wave  
- Uncontrolled implementation of all audit items  
- Mass primitive rewrite without adapters  

---

## Open implement-now (honest)

| ID | Class | Status |
|----|-------|--------|
| Packaged GW1 cold prove | P0 | EXTERNAL_VALIDATION open |
| Policy enforcement audit | P1 | Contract locked; path audit next |
| FAILED_BOOT resource release fault-inject | P1 | Lock release exists; proof pending |
| Evaluation deliverables depth | P1 | Baseline exists; deepen tasks |
| Build provenance completeness | P1 | Partial snapshot |

---

## Later cost test

If skipping would force data migration / API break / UX rewrite / security redesign / role-model rewrite / evidence loss / retraining / deployment migration → **lock or implement early**.
