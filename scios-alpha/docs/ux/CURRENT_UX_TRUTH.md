# CURRENT UX TRUTH — SCI OS ×10

**Label:** ALPHA / NON-PRODUCTION  
**Updated:** 2026-08-13  
**Authority:** This doc + `product-memory/` + `diagnostics-export/ux-dna/`  
**Rule:** No evidence ⇒ UNKNOWN. Does **not** claim PROFESSIONAL UX READY.

## Verdict

**UX DNA LOCKED / FOUNDATION PARTIAL** — Product Memory + Design Constitution + design-system tokens + structural golden baselines exist. Live screenshot baselines and full a11y measurement remain PENDING. Packaged boot/Home prove still gates READY.

---

## Surfaces that exist

| Surface | Path | Port | Nature |
|---------|------|------|--------|
| Shell / AppHost | `apps/cockpit-ui/src/index.js` | 4000 | Single-file SPA; Professional default |
| Control Plane | `apps/control-plane-api` | 3000 | Product APIs |
| Meta-Recovery Shell | `apps/meta-recovery-control-plane` | 5299 | Ops/recovery |
| Design tokens | `packages/design-system` | — | SCI genome (not vendor theme) |

### Shell views

Home · Search results · Entity360 · Analyze (Professional + Technical) · Decisions · Evidence · System · Engineering · Command palette

### Canonical first-release flow

Home → Search → Entity360 → Analyze → Uncertainty/Risk/Gov → Trust Capsule → Approval → Evidence/Lineage

---

## Professional vs Technical

| Mode | Status |
|------|--------|
| Professional (default) | **PRESENT** — L1–L7 cards, Trust Capsule, Approval, AI context |
| Technical / JSON | **PRESENT** — opt-in Technical View |
| Progressive disclosure | **PARTIAL** — wired; depth still evolving |

---

## Design tokens

SCI Swiss palette (Snow/Fog/Graphite/Navy/Red/Ice) — see `docs/ux/SCI_UX_GENOME.md` and `packages/design-system`.

Do **not** replace with purple-indigo AI themes or vendor skins.

---

## Product Memory

Protected decisions live in `product-memory/`. Regenerate DNA evidence:

```bash
pnpm ux:dna
```

## Boot sequence

```
BOOT → HOME → UX BASELINE CAPTURE → DESIGN NORMALIZATION → EXPERIENCE CONTRACTS → ROLE EXPANSION
```
