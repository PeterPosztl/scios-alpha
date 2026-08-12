# Boot Modes — SCI OS ×10 (`scios-alpha`)

| Mode | Command | Behavior | Evidence |
|------|---------|----------|----------|
| **Normal Start** | `pnpm boot:normal` / `pnpm start` | Build spine, Zod-parse normative envelopes, vertical-slice smoke | `diagnostics-export/boot-normal-proof.json` |
| **Repair Mode** | `pnpm boot:repair` | Remove foreign lockfiles, restore fixtures, frozen install, rebuild, smoke | `diagnostics-export/boot-repair-proof.json` |
| **Safe Mode** | `pnpm boot:safe` | Read-only: contracts + fixtures; smoke only if dist already present; **no file writes** | stdout only |
| **Proof Mode** | `pnpm boot:proof` | Full `ci:prediction-foundation-gate` + alpha check + smoke → **GO / NO_GO** | `diagnostics-export/boot-proof-proof.json` |

Optional: `SCIOS_BOOT_SERVE=1` with Normal Start spawns control-plane `:5200` and cockpit `:5230` detached.

**ALPHA / NON-PRODUCTION** — never ENTERPRISE GO from boot alone.
