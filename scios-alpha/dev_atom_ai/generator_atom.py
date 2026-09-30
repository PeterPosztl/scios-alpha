#!/usr/bin/env python3
"""
dev_atom_ai/generator_atom.py — SCI OS ×10 Atom AI kit (propose-only)

Not a second orchestrator. Aligns with:
  pnpm sci:start → bootstrap-capsule → start-sci-os.cjs

- propose-only by default (--apply to write)
- never stub dist/ artifacts
- TODO scan opt-in
- systemd unit written as proposal only (Linux ops sample; Windows uses sci:start)
- gates via pnpm, not pytest/flake8 by default
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

AUTO_HDR = "<AUTO_GENERATED>"
LABEL = "ALPHA_NON_PRODUCTION"
SKIP_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".turbo",
    ".next",
    "coverage",
    "__pycache__",
    ".venv",
    "venv",
    "diagnostics-export",
    "sandbox",
    ".atom_ai",
    "dev_atom_ai",
    "dev_auto_finish",
    "dev",
}
CREATE_FILE_RE = re.compile(r"create file[:\s]+([^\s\"'`]+)", re.IGNORECASE)


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return {}


def is_artifact_path(rel: str) -> bool:
    norm = rel.replace("\\", "/")
    return "/dist/" in f"/{norm}/" or norm.startswith("dist/")


def skipped_path(p: Path) -> bool:
    return any(part in SKIP_DIRS for part in p.parts)


def find_todos(root: Path, max_files: int = 5000) -> list[str]:
    todos: list[str] = []
    scanned = 0
    for f in root.rglob("*.*"):
        if scanned >= max_files:
            break
        if skipped_path(f) or not f.is_file():
            continue
        scanned += 1
        try:
            t = f.read_text(encoding="utf-8")
        except Exception:
            continue
        if "TODO" in t or "FIXME" in t:
            try:
                todos.append(str(f.relative_to(root)).replace("\\", "/"))
            except ValueError:
                todos.append(str(f))
    return todos


def resolve_template(templates_dir: Path, dest: Path, meta: dict | None) -> tuple[str, str]:
    ext = dest.suffix.lstrip(".")
    name_candidates = []
    if dest.name.endswith(".py"):
        name_candidates.append("py.tpl")
    if "run_core" in dest.name:
        name_candidates.append("run_core.py.tpl")
    if "service" in dest.stem.lower():
        name_candidates.append("service.tpl")
    if ext:
        name_candidates.append(f"{ext}.tpl")
    name_candidates.extend(["py.tpl", "js.tpl"])

    for name in name_candidates:
        tpl = templates_dir / name
        if tpl.exists():
            content = tpl.read_text(encoding="utf-8")
            content = (
                content.replace("{{PATH}}", str(dest).replace("\\", "/"))
                .replace("{{TEMPLATE}}", name)
                .replace("{{ID}}", dest.stem)
            )
            if AUTO_HDR not in content:
                content = f"{AUTO_HDR}\n{content}"
            if meta:
                content = f"# Meta: {json.dumps(meta, ensure_ascii=False)}\n" + content
            return content, name
    body = f"{AUTO_HDR}\n# Auto-generated stub for {dest.name}\n# {LABEL}\n"
    if meta:
        body = f"# Meta: {json.dumps(meta, ensure_ascii=False)}\n" + body
    return body, "inline-fallback"


def propose_or_write(
    rel: str,
    templates_dir: Path,
    proposals_dir: Path,
    apply: bool,
    results: list[dict],
    meta: dict | None = None,
) -> bool:
    rel = rel.replace("\\", "/").lstrip("./")
    if is_artifact_path(rel):
        results.append({"path": rel, "action": "skipped_artifact_path"})
        return False
    # Never invent a parallel core runtime in-repo
    if rel in {"run_core.py", "venv/bin/python3"} or rel.startswith("venv/"):
        results.append({"path": rel, "action": "rejected_parallel_core"})
        return False

    dest = Path(rel)
    if dest.exists():
        results.append({"path": rel, "action": "exists_skip"})
        return False

    content, tpl = resolve_template(templates_dir, dest, meta)
    sha = hashlib.sha256(content.encode("utf-8")).hexdigest()
    proposal = proposals_dir / rel.replace("/", "__")
    proposal.parent.mkdir(parents=True, exist_ok=True)
    proposal.write_text(content, encoding="utf-8")

    action = "proposed"
    if apply:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        action = "applied"

    results.append(
        {
            "path": rel,
            "action": action,
            "template": tpl,
            "sha256": sha,
            "meta": meta,
            "proposal": str(proposal).replace("\\", "/"),
        }
    )
    return True


def generate_systemd_unit_proposal(service_name: str) -> str:
    """Linux sample only — SCI OS canonical start remains pnpm sci:start."""
    return f"""# {AUTO_HDR}
# ALPHA_NON_PRODUCTION — PROPOSAL ONLY. Do not enable without human review.
# Canonical SCI OS start: pnpm sci:start (installer/scripts/bootstrap-capsule.cjs)
# This unit is a Linux ops sample, not the Windows/ALPHA primary path.

[Unit]
Description=SCI OS ×10 (Atom AI kit proposal) — wraps canonical sci:start
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/sci-os-x10
ExecStart=/usr/bin/pnpm sci:start -- --no-open
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
# service_name={service_name}
"""


def run_cmd(cmd: str, cwd: str = ".") -> tuple[bool, str]:
    try:
        out = subprocess.check_output(
            cmd,
            shell=True,
            stderr=subprocess.STDOUT,
            cwd=cwd,
            universal_newlines=True,
            timeout=180,
        )
        return True, (out or "")[-8000:]
    except subprocess.CalledProcessError as e:
        return False, ((e.output or "")[-8000:])
    except Exception as e:
        return False, str(e)


def collect_files(manifest: dict) -> list[str]:
    out = []
    for entry in manifest.get("files", []) or []:
        if isinstance(entry, str):
            out.append(entry.replace("\\", "/"))
        elif isinstance(entry, dict) and entry.get("path"):
            out.append(str(entry["path"]).replace("\\", "/"))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default="build/manifest.json")
    ap.add_argument("--templates", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--plan", default="dev/fill-plan.json")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--scan-todos", action="store_true")
    ap.add_argument("--run-gates", action="store_true")
    ap.add_argument(
        "--systemd-name",
        default=os.environ.get("SYSTEMD_SERVICE_NAME", "sci-os-x10.service"),
    )
    args = ap.parse_args()

    root = Path(".").resolve()
    work = root / ".atom_ai"
    diag = root / "diagnostics-export" / "atom-ai"
    proposals = diag / "proposals"
    work.mkdir(parents=True, exist_ok=True)
    proposals.mkdir(parents=True, exist_ok=True)

    manifest = load_json(Path(args.manifest))
    plan = load_json(Path(args.plan))
    templates_dir = Path(args.templates)
    results: list[dict] = []
    generated: list[str] = []

    for t in plan.get("targets") or []:
        if t.get("enabled") is False:
            results.append({"path": t.get("path"), "action": "skipped_disabled"})
            continue
        if t.get("path") and propose_or_write(
            t["path"],
            templates_dir,
            proposals,
            args.apply,
            results,
            meta={"reason": "fill_plan"},
        ):
            generated.append(t["path"].replace("\\", "/"))

    missing = []
    for entry in collect_files(manifest):
        if not Path(entry).exists():
            missing.append(entry)
            if propose_or_write(
                entry,
                templates_dir,
                proposals,
                args.apply,
                results,
                meta={"reason": "manifest_missing"},
            ):
                generated.append(entry)

    for entry in manifest.get("artifacts", []) or []:
        p = entry.get("path") if isinstance(entry, dict) else entry
        if not p:
            continue
        rel = str(p).replace("\\", "/")
        if not Path(rel).exists():
            results.append({"path": rel, "action": "missing_artifact_report_only"})

    todos: list[str] = []
    if args.scan_todos:
        todos = find_todos(root)
        for tfile in todos:
            try:
                text = Path(tfile).read_text(encoding="utf-8")
            except Exception:
                continue
            for m in CREATE_FILE_RE.finditer(text):
                target = m.group(1).strip().rstrip(".,;")
                if target and not Path(target).exists():
                    if propose_or_write(
                        target,
                        templates_dir,
                        proposals,
                        args.apply,
                        results,
                        meta={"reason": "todo_hint", "source": tfile},
                    ):
                        generated.append(target)

    # Systemd proposal (always under proposals / .atom_ai — never install)
    unit_text = generate_systemd_unit_proposal(args.systemd_name)
    unit_rel = f".atom_ai/systemd/{args.systemd_name}"
    unit_proposal = proposals / unit_rel.replace("/", "__")
    unit_proposal.parent.mkdir(parents=True, exist_ok=True)
    unit_proposal.write_text(unit_text, encoding="utf-8")
    (work / "systemd").mkdir(parents=True, exist_ok=True)
    (work / "systemd" / args.systemd_name).write_text(unit_text, encoding="utf-8")
    results.append(
        {
            "path": unit_rel,
            "action": "proposed_systemd_sample",
            "note": "Not installed. Canonical: pnpm sci:start",
        }
    )
    generated.append(unit_rel)

    # Health script is maintained in-repo under dev_atom_ai/ — do not invent ops/health_check.py
    # unless fill-plan asks. Point report at canonical health.
    results.append(
        {
            "path": "dev_atom_ai/health_check.py",
            "action": "canonical_health_script",
            "note": "Use this instead of parallel run_core/systemctl heal",
        }
    )

    gate = {"ran": False}
    if args.run_gates:
        cmd = os.environ.get("TEST_CMD", "pnpm gate:scaffold")
        ok, out = run_cmd(cmd)
        gate = {"ran": True, "cmd": cmd, "ok": ok, "outputTail": out[-4000:]}

    lint_suggestions = {}
    if os.environ.get("ATOM_AI_PYTHON_LINT") == "1":
        for name, cmd in (
            ("flake8", os.environ.get("LINT_CMD", "flake8 . || true")),
            ("black", os.environ.get("FORMAT_CMD", "black --check . || true")),
            ("bandit", os.environ.get("STATIC_CMD", "bandit -r . || true")),
        ):
            ok, out = run_cmd(cmd)
            lint_suggestions[name] = {"ok": ok, "outputTail": out[-2000:]}

    report = {
        "at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "schema": "sci-os-atom-ai/v1",
        "label": LABEL,
        "mode": "apply" if args.apply else "propose-only",
        "constitution": "propose-only; never auto-deploy; no parallel Atom core",
        "canonicalStartup": "pnpm sci:start",
        "rejectedParallel": ["run_core.py", "venv Atom AI service", "auto systemctl enable"],
        "missing_from_manifest": missing,
        "todo_files": todos[:200],
        "todo_files_count": len(todos),
        "generated": generated,
        "results": results,
        "gate": gate,
        "lint_suggestions": lint_suggestions,
        "counts": {
            "missing": len(missing),
            "generated": len(generated),
            "proposed": sum(1 for r in results if str(r.get("action", "")).startswith("proposed")),
            "applied": sum(1 for r in results if r.get("action") == "applied"),
        },
        "note": "Commit/PR only via atom_ai runner --commit. OPEN_PR never automatic.",
    }

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    report_path.write_text(payload, encoding="utf-8")
    (diag / "report.json").write_text(payload, encoding="utf-8")
    (work / "report.json").write_text(payload, encoding="utf-8")

    # Simple HTML report
    html = (
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Atom AI / SCI OS Report</title>"
        "<style>body{font-family:ui-sans-serif,system-ui;margin:2rem;background:#f7f7f8;color:#111}"
        "pre{background:#fff;border:1px solid #ddd;padding:1rem;overflow:auto}</style>"
        "</head><body><h1>Atom AI kit report (SCI OS ×10)</h1>"
        f"<p>Mode: <b>{report['mode']}</b> · Canonical: <code>pnpm sci:start</code></p>"
        f"<pre>{json.dumps(report, indent=2, ensure_ascii=False)}</pre></body></html>"
    )
    (work / "report.html").write_text(html, encoding="utf-8")
    (diag / "report.html").write_text(html, encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "generated_count": len(generated),
                "missing_count": len(missing),
                "mode": report["mode"],
                "report": str(report_path).replace("\\", "/"),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
