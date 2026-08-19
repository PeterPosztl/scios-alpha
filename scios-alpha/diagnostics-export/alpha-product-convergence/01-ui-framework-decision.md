# ADR-SCI-UI-FRAMEWORK-001 — Cockpit UI Framework (Target A)

**Status:** ACCEPTED  
**Date:** 2026-08-19  
**Label:** ALPHA_NON_PRODUCTION  
**Decision ID:** FD-003  

## Context

SCI OS ×10 Cockpit (`apps/cockpit-ui`) serves as the canonical product host on `:4000`. Before Target A completion, the Cockpit was inspected for:

| Aspect | Current state |
|--------|---------------|
| Frontend technology | Vanilla JS (ESM server + inline browser script) |
| Build pipeline | No bundler — Node serves static HTML with inlined script |
| Component model | Monolithic `index.js` (~1375 lines) with safe-DOM helpers |
| Routing | Client-side view switching (`showView`) |
| State | `localStorage` session + Control Plane API |
| Experience Compiler | Wired via `/v1/experience/compile` |
| Design tokens | `@scios/design-system` (CSS variables) |
| Packaging | Copied into installed app; bundled Node 20.18.1 |

Options evaluated:

1. **React + Vite** — strong component model, but full rewrite of working Cockpit
2. **Preact + Vite** — lighter, still full rewrite
3. **Evolved vanilla + modular component system** — minimum rewrite, extract modules
4. **Existing framework in repo** — none in cockpit-ui; sci-shell-web exists in parent monorepo but is out of scios-alpha boot path

## Decision

**Option 3 — Evolved Vanilla Architecture with Modular Component Extraction**

React + Vite is **deferred to Target B (Beta)** per criterion *minimum rewrite* and existing working professional workspace.

For Target A:

- Cockpit remains the canonical AppHost on `:4000`
- UI logic extracts into modules under `apps/cockpit-ui/src/` (primitives, WorkspaceRenderer)
- Modules export browser-safe source strings (same pattern as `safe-dom.js`) — no new bundler in Alpha install path
- React is **not** product authority, backend, boot path, or state authority

## Rationale

1. Cockpit already implements Home, Search, Entity, Analyze/GW1, Experience Compiler binding, professional panels, LOCAL_REVIEW governance UX
2. Full React rewrite would delay Alpha without adding proven capability
3. Package-safe build already works without Vite
4. Experience Compiler output maps to registered panel components today

## Consequences

### Positive

- Target A achievable without framework migration
- Zero new runtime dependencies in installed package
- Fast local startup preserved

### Negative / Deferred

- No JSX/component hot-reload until Beta
- Complex workspace composition harder to test in isolation without bundler test harness
- React migration planned for Beta (FD-003-BETA)

## Acceptance criteria (Target A)

- [x] ADR recorded
- [ ] Modular primitives + WorkspaceRenderer extracted
- [ ] Home / Search / Entity / market_analysis workspace PASS with proofs
- [ ] Installed package requires no Cursor/pnpm/system Node

## Beta follow-up (FD-003-BETA)

Evaluate React + Vite migration with `@scios/design-system` component bindings when Entity360 graph and multi-panel drag-layout are required.
