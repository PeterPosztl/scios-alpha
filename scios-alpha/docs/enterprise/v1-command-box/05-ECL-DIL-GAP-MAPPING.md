# ECL/DIL gap overlay (additive)

**Label:** `ALPHA_NON_PRODUCTION`  
Does **not** overwrite `01-GAP-CATALOG.md` / `gap-catalog.json` / work-unit files.

Every GAP and WU is tagged into at least one of: **ecl · dil · ui · risk · docs · engine**.
Primary = first matching category. Multi-tag allowed (a WU can be ui+risk).

## GAP primary

- **ui:** 646
- **dil:** 7
- **ecl:** 201
- **docs:** 74
- **engine:** 72

## GAP tag hits (multi)

- **ecl:** 201
- **dil:** 86
- **ui:** 773
- **risk:** 14
- **docs:** 190
- **engine:** 600

## WU primary

- **ui:** 7263
- **dil:** 1641
- **ecl:** 372
- **docs:** 297
- **engine:** 427

## WU tag hits (multi)

- **ecl:** 372
- **dil:** 1746
- **ui:** 8490
- **risk:** 114
- **docs:** 3191
- **engine:** 5219

## Wave × this rocket

| Wave | Meaning | ECL/DIL action |
|------|---------|----------------|
| W0 | Lock live OS | Boot/Shell/CP stay; overlay mapping only |
| W1 | UI tokens/core/layout | design-system + cockpit chrome |
| W2 | Engine adapters | `@scios/ecl-dil` + CP routes |
| W3 | Composed consoles | Intelligence + Reporting views |
| W4 | P2 enterprise | OIDC/OTLP/durable — later, honest UNKNOWN |

Machine file: `ecl-dil-gap-overlay.json`. Orphans: 0 GAPs, sample WU 0.

## What this rocket closed vs what remains

**Closed (compose-in-shell, this slice):** `@scios/ecl-dil` engines + Zod contracts; Control Plane `/v1/ecl/*` `/v1/dil/*` `/v1/ai/proposals/*`; Cockpit Intelligence + Reporting + System architecture panel; guardrails; four docs. Proof: `pnpm --filter @scios/ecl-dil test` and `pnpm --filter @scios/control-plane-api run smoke:ecl-dil`.

**Not closed:** the remaining ~10k WUs are **mapped, not executed**. W4 (OIDC/OTLP/durable) stays P2/UNKNOWN. Mapping ≠ GATE. Do not treat overlay counts as READY.

