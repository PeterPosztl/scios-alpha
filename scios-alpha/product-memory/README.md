# Product Memory

Future AI/code generation **must read this directory** before modifying protected architecture or UX.

| File | Purpose |
|------|---------|
| agent-harness.json | Required loads + workflow + trajectory guardian |
| founder-intent.json | Why SCI OS exists |
| architectural-decisions.json | ADRs |
| ux-decisions.json | Protected UX decisions |
| protected-product-contracts.json | Contracts that must not silently break |
| rejected-patterns.json | Explicit anti-patterns |
| contracts/ | Deep-foundation contract locks (types, temporal, org, policy, …) |

Companion: `docs/ux/SCI_DESIGN_CONSTITUTION.md` · `docs/enterprise/DEEP_FOUNDATIONS.md`  
Commands: `pnpm agent:harness` · `pnpm foundations:audit` · `pnpm ux:dna`
