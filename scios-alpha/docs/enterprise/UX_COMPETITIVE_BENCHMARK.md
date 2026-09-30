# SCI OS ×10 — Competitive UX → Design Language → Usability Proof

**Status:** ALPHA / NON-PRODUCTION. Benchmark scores from **public** materials only.  
**Artifacts:** `diagnostics-export/ux-competitive-benchmark.json`, `diagnostics-export/ux-usability-proof.json`

## Pipeline

```
public competitor UX → benchmark → strong patterns → weaknesses
  → SCI OS design language (existing Commands)
  → faster / clearer workflow rules
  → usability proof (script + UNKNOWN until lab)
```

## Strongest market patterns (adopt)

1. F-layout: filters left, canvas dominant  
2. Consistent entity/object inspector grammar  
3. Selection carry-over across views  
4. Timeline as workspace (not a chart widget)  
5. Guided next steps (human-accepted)  
6. Whitespace + component budget  
7. Case collaboration / trust surfaces  

## Weaknesses to avoid

- Query-first UX for client/executive roles  
- Per-module visual reinvention  
- Density that fakes “power”  
- Graph-only without evidence citation + dossier  
- SIEM tables without Graph entry for narrative  

## SCI OS design language (canonical)

See `docs/SCI-OS-DESIGN-SYSTEM.md` + `docs/SCI-OS-UX-FLOW-SYSTEM.md`:

- Palette: Snow White, Fog Grey, Graphite, Deep Navy, Swiss Red, Ice Blue  
- Flow: Graph → Timeline → Evidence → Dossier → Client Portal → Executive  
- One primary action per view; 300ms macro transitions  

## Commands

```bash
pnpm ux:benchmark   # copies/validates benchmark presence
pnpm ux:proof       # live + static usability proof → diagnostics-export/
```
