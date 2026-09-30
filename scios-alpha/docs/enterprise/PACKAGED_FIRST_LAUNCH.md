# Packaged First-Launch

Canonical packaging architecture: **existing pkg launcher + bundled Node** (not Electron).

## Build (developer machine)

```bash
pnpm package:dist    # bundle backend, cockpit, Node 20, manifests
pnpm package:exe     # SCI-OS-X10.exe
pnpm package:setup   # SCI-OS-X10-Setup.exe
pnpm package:prove   # install/launch/GW1 proofs
```

## Distribute

Ship folder `dist/release/`:

- `SCI-OS-X10-Setup.exe`
- `payload/` (full application)

## End user

1. Run Setup.exe
2. Click **SCI OS X10** (Desktop / Start Menu)
3. Opens Home at http://127.0.0.1:4000/

No system Node, pnpm, or terminal.

## Reboot certification

After Windows restart (no Cursor/terminal):

1. Click SCI OS X10
2. Confirm READY + GW1
3. Optional: `pnpm package:prove-reboot` to record evidence

Evidence: `diagnostics-export/packaging/`
