# UI Work / Intelligence wiring repair

**Status:** `UI_WIRING_REPAIR_PASS`  
**Baseline / HEAD:** `0f7d32c9` (`0f7d32c992811f115cee20f13a56337ed6108d5c`)  
**Scope:** MINIMAL_UI_WIRING_ONLY — ALPHA_NON_PRODUCTION  
**Packaging:** not required; not performed.

## Root cause

Commit `bb9602bc` assigned `id="dil"` to the My Work pane while Intelligence already used `id="dil"`. `showView` calls `document.getElementById(id)` and returns if missing, so Work (`data-v="work"`) became a no-op and Intelligence (`data-v="dil"`) opened the first `dil` — My Work.

## Exact files changed

- `apps/cockpit-ui/src/index.js` — one-line product fix
- `scripts/tests/ui-work-intelligence-wiring.cjs` — targeted uniqueness/nav proof
- `diagnostics-export/architecture-integrity/ui-wiring-repair/*` — this evidence (forensic pack otherwise untouched)

## Exact minimal change

My Work view: `id="dil"` → `id="work"`. Intelligence remains the only `id="dil"`. Nav buttons and `showView("work")` / `showView("dil")` were already correct.

## Proofs

| Check | Result |
| --- | --- |
| Work navigation (independent; ephemeral source cockpit HTTP 200, port 62413) | `WORK_NAVIGATION_PASS` |
| Intelligence navigation (independent; same served HTML) | `INTELLIGENCE_NAVIGATION_PASS` |
| `count(id="work")==1` and `count(id="dil")==1` (source + served DOM) | `DOM_ID_UNIQUENESS_PASS` |
| `node scripts/tests/b006-cockpit-ui-hard-gate.cjs` | PASS |
| `node scripts/tests/app-typecheck-gate.cjs` | `APP_TYPECHECK_GATE_PASS` |

## Protected surfaces

Git path inspect: Product Kernel, Experience Compiler (`packages/professional-domain-registry`), Domain Registry, Governance, Host integration, boot/installer — **UNCHANGED**.

## Git

```
scios-alpha/apps/cockpit-ui/src/index.js | 2 +-
1 file changed, 1 insertion(+), 1 deletion(-)
```

Pre-existing untracked forensic pack and host job-markers were left in place.

## Forensic pack

Preserved under `diagnostics-export/architecture-integrity/` (`00`–`05`, matrices, reports). Repair evidence is only in `ui-wiring-repair/`.
