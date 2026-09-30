# SCI UX Genome

**Extracted from:** current Shell (`apps/cockpit-ui`) + `packages/design-system`  
**Intent:** Normalize strongest SCI visual language — **not** clone vendors.

## Canonical tokens

| Category | SCI value |
|----------|-----------|
| Snow | `#F7F8FA` |
| Fog | `#E8ECF0` |
| Graphite | `#2C333A` |
| Deep Navy | `#0B1F33` |
| Swiss Red | `#C8102E` |
| Ice | `#D6E4F0` |
| OK / Warn | `#1B7A4E` / `#B45309` |
| Font | SF Pro Text / Segoe UI / system-ui |
| Radius | `0` (sharp Swiss) |
| Focus | `2px solid Deep Navy` |
| Spacing scale | 0.25 / 0.5 / 0.75 / 1rem |

## Surface hierarchy

1. Atmosphere gradient (Snow→Fog)  
2. Header glass surface  
3. Primary nav underline selection  
4. Professional cards (border Fog, no heavy shadow clutter)  
5. Trust Capsule / Approval proposal (Ice / warn accent)  
6. Technical pre blocks (opt-in)

## Semantic / risk / evidence states

| State | Expression |
|-------|------------|
| Risk reject | Swiss Red text/status |
| Risk/gov approve path | Navy CTA; proposal not green-check-as-done |
| Uncertainty | Explicit abstain / calibration labels |
| Evidence | Reachable from Analyze + Evidence nav |
| Degraded | Banner + System readiness; no fake READY |

## Motion

Prefer calm hierarchy (pipe stages, mode toggle). Respect reduced motion (future: `prefers-reduced-motion` gate in design-system).

## Density modes

| Mode | Intent |
|------|--------|
| COMFORTABLE | Executive / occasional |
| STANDARD | Default professional |
| EXPERT | Analyst density |

Implementation: token-driven spacing/font — STANDARD wired; others PARTIAL.

## Package

`packages/design-system` is the token source of truth. Shell currently embeds equivalent CSS variables; evolution path is import-from-package without visual redesign.
