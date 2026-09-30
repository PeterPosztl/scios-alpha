#!/usr/bin/env python3
"""
dev_atom_ai/health_check.py — SCI OS ×10 health (not systemd Atom core)

Checks canonical ALPHA endpoints and suggests recovery commands.
Never calls systemctl. Self-heal is suggest-only unless --repair (runs pnpm sci:repair).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def http_status(url: str, timeout: float = 2.5) -> int:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return int(getattr(resp, "status", 200) or 200)
    except Exception:
        return 0


def disk_ok(path: str, min_free_mb: int = 100) -> bool:
    try:
        st = shutil.disk_usage(path)
        return st.free > min_free_mb * 1024 * 1024
    except Exception:
        return False


def run(cmd: list[str], cwd: str) -> tuple[int, str]:
    try:
        p = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=120,
            shell=(os.name == "nt"),
        )
        out = (p.stdout or "") + (p.stderr or "")
        return p.returncode, out[-4000:]
    except Exception as e:
        return 1, str(e)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api-port", type=int, default=int(os.environ.get("PORT", "3000")))
    ap.add_argument(
        "--cockpit-port",
        type=int,
        default=int(os.environ.get("SCIOS_COCKPIT_PORT", "4000")),
    )
    ap.add_argument(
        "--repair",
        action="store_true",
        help="Run pnpm sci:repair once if core unhealthy (explicit)",
    )
    args = ap.parse_args()
    root = Path(".").resolve()

    api = args.api_port
    cockpit = args.cockpit_port
    hz = http_status(f"http://127.0.0.1:{api}/healthz")
    rz = http_status(f"http://127.0.0.1:{api}/readyz")
    ck = http_status(f"http://127.0.0.1:{cockpit}/healthz")

    core_ok = hz == 200 and rz == 200 and ck == 200
    report = {
        "at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "schema": "sci-os-atom-ai-health/v1",
        "label": "ALPHA_NON_PRODUCTION",
        "canonicalStartup": "pnpm sci:start",
        "ports": {"api": api, "cockpit": cockpit},
        "probes": {
            "backend_healthz": hz,
            "backend_readyz": rz,
            "cockpit_healthz": ck,
        },
        "core_ok": core_ok,
        "disk_ok": disk_ok(str(root)),
        "self_heal": {
            "systemctl": "rejected",
            "suggested": [
                "pnpm sci:status",
                "pnpm sci:repair",
                "pnpm sci:meta-recovery",
                "pnpm sci:recovery-shell",
            ],
            "repair_ran": False,
            "repair_exit": None,
        },
        "verdict": "HEALTHY" if core_ok else "UNHEALTHY_OR_STOPPED",
    }

    if not core_ok and args.repair:
        code, out = run(["pnpm", "sci:repair"], str(root))
        report["self_heal"]["repair_ran"] = True
        report["self_heal"]["repair_exit"] = code
        report["self_heal"]["repair_tail"] = out
        # re-probe
        report["probes_after_repair"] = {
            "backend_healthz": http_status(f"http://127.0.0.1:{api}/healthz"),
            "backend_readyz": http_status(f"http://127.0.0.1:{api}/readyz"),
            "cockpit_healthz": http_status(f"http://127.0.0.1:{cockpit}/healthz"),
        }
        after = report["probes_after_repair"]
        report["core_ok"] = (
            after["backend_healthz"] == 200
            and after["backend_readyz"] == 200
            and after["cockpit_healthz"] == 200
        )
        report["verdict"] = "HEALTHY" if report["core_ok"] else "STILL_UNHEALTHY"

    out_dir = root / "diagnostics-export" / "atom-ai"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "health.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    work = root / ".atom_ai"
    work.mkdir(parents=True, exist_ok=True)
    (work / "health.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report["core_ok"] else 1)


if __name__ == "__main__":
    main()
