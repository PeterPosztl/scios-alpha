# AGENTS.md — SCI OS ×10 (scios-alpha)

## Truth

This repository is an **ALPHA / NON-PRODUCTION** product foundation — not an enterprise production platform.

- Baseline models are **NON-PRODUCTION**.
- No subsystem may self-declare READY without evidence.
- No evidence ⇒ **UNKNOWN**, never PASS.
- **ALPHA ≠ PRODUCTION**. Do not fake READY.

## Canonical current-truth (four pillars)

Read in order — do not collapse:

1. [`docs/enterprise/FOUR_PILLARS.md`](docs/enterprise/FOUR_PILLARS.md) — index  
2. [`docs/enterprise/FOUNDER_BLUEPRINT.md`](docs/enterprise/FOUNDER_BLUEPRINT.md) — why + what we create  
3. [`docs/enterprise/BENCHMARK_CONTRACT.md`](docs/enterprise/BENCHMARK_CONTRACT.md) — 2026 quality bar  
4. [`docs/enterprise/CURRENT_SYSTEM_TRUTH.md`](docs/enterprise/CURRENT_SYSTEM_TRUTH.md) — written + wired  
5. [`docs/enterprise/CURRENT_EVIDENCE.md`](docs/enterprise/CURRENT_EVIDENCE.md) — what actually works  
6. [`diagnostics-export/current-evidence-index.json`](diagnostics-export/current-evidence-index.json)

**Before modifying protected architecture or UX**, read [`product-memory/`](product-memory/) and [`docs/ux/SCI_DESIGN_CONSTITUTION.md`](docs/ux/SCI_DESIGN_CONSTITUTION.md). Run `pnpm agent:harness`, `pnpm ux:dna`, and for foundations `pnpm foundations:audit`.

Do not treat historical diagnostics, ATOM-AI trees, or out-of-tree Meta OS as SCI OS boot authority.

## Two maturity axes (keep separate)

| Axis | Meaning |
|------|---------|
| **FIRST RELEASE FOUNDATION** | Install → click → CORE_READY → Home → Search → Entity → GW1 → Evidence/Lineage → shutdown (+ packaged reboot proof when claimed) |
| **FULL PRODUCT VISION** | GW2–7, OIDC, durable fabric, 300+ caps, enterprise deploy — **P2/P3 / ALPHA**, not first-release scope |

## Package manager

**pnpm only** (`packageManager` in root `package.json`). Do not introduce npm/yarn lockfiles.

## Runtime

- Declared engines: **Node `>=20.18.0 <21`** (packaged **20.18.1**)
- Canonical ports: Control Plane **:3000**, Shell **:4000** (`sci-os.manifest.json`)
- Profile: **`local-foundation`** · `EXECUTION_MODE=SIMULATION_ONLY` · `AUTH_MODE=local-development`

## Contracts

Do not rewrite stable public contracts without approval. Use adapters and versioned migrations.
Do not generate hundreds of empty directories. Prefer a working vertical slice with proof.
Do not reopen full-vision work as silent “fixes.”

## Gates

```bash
pnpm gate:scaffold
pnpm gate:foundation
pnpm ci:prediction-foundation-gate
pnpm truth:reconcile   # regenerate truth-reconciliation evidence
pnpm deep:forensics    # deep structural forensics pack
pnpm integrity:run     # Universal Integrity Engine → diagnostics-export/integrity/
pnpm integrity:preflight  # Node contract (exit 3 if mismatch)
```

## Boot (canonical)

```bash
pnpm sci:start          # DEVELOPMENT: bootstrap-capsule → start-sci-os (user Shell :4000)
pnpm start              # same orchestrator (mode=normal) — NOT an alias of boot:normal
SCI-OS-Start.bat        # one-click DEVELOPMENT entry
# PACKAGED: %LOCALAPPDATA%\SCI OS X10\app\SCI-OS-X10.cmd  (bundled Node only)
```

Compatibility / recovery (not primary product entry):

```bash
pnpm boot:normal|repair|safe|proof   # leaf scripts/boot — compatibility
pnpm sci:repair / SCI-OS-Repair.bat
pnpm sci:status / sci:stop
```

Exit semantics: `0` = accepted mode (incl. OPTIONAL_INFRA_DEGRADED); `2`/`3` = internal/external NO_GO. Evidence under `diagnostics-export/`.

## Cursor rules

See `.cursor/rules/` and `.cursor/skills/sci-os-platform/SKILL.md`.
