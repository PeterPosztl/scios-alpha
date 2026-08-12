# SCI OS ×10 — Launch Cascade

```
SCI OS ×10.exe
      ↓
Bootstrap Kernel          installer/scripts/bootstrap-kernel.cjs
      ↓
Normal Startup            installer/scripts/start-sci-os.cjs --mode=normal
      ↓
Startup Recovery Pack     repair / safe-mode (on NO_GO only)
      ↓
Meta-Recovery Engine      pnpm sci:meta-recovery
      ↓
Root-cause reasoning      packages/meta-recovery (hypotheses + ranking)
      ↓
Transactional repairs     R0–R2 auto; R3+ policy; R5 never
      ↓
Startup proof             prove-sci-os-startup.cjs + meta-recovery-proof.json
      ↓
READY / DEGRADED / EXTERNAL BLOCKER
```

## Entry points

| Entry | Role |
|-------|------|
| `SCI OS ×10.bat` | User launcher (exe equivalent) |
| `pnpm sci:x10` | Same cascade from terminal |
| `pnpm sci:bootstrap` | Bootstrap Kernel only |
| `pnpm sci:start` | Normal Startup only (pack) |
| `pnpm sci:meta-recovery` | Meta layer only |

Evidence: `diagnostics-export/sci-os-x10-cascade-report.json`
