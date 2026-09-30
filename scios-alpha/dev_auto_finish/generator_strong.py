#!/usr/bin/env python3
"""
dev_auto_finish/generator_strong.py — SCI OS ×10

Stronger scan + report than the thin generator, still constitution-safe:
  - propose-only by default (--apply to write)
  - never stub dist/ build artifacts
  - TODO scan opt-in (--scan-todos)
  - dependency graph read-only (package.json / requirements*.txt)
  - gates via pnpm (not pytest/flake8 by default)

Evidence: diagnostics-export/auto-finish/ + --report path
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

TEMPLATE_PLACEHOLDER = "<AUTO_GENERATED>"
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
    "dev_auto_finish",
}
CREATE_FILE_RE = re.compile(r"create file[:\s]+([^\s\"'`]+)", re.IGNORECASE)


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {"_error": f"JSON_LOAD_FAILED:{path}"}


def is_artifact_path(rel: str) -> bool:
    norm = rel.replace("\\", "/")
    return "/dist/" in f"/{norm}/" or norm.startswith("dist/")


def skipped_path(p: Path) -> bool:
    return any(part in SKIP_DIRS or part.startswith(".") for part in p.parts)


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


def dependency_graph(root: Path) -> dict:
    graph: dict = {"packageJson": [], "requirements": [], "pnpmWorkspace": None}
    pkg = root / "package.json"
    if pkg.exists():
        data = load_json(pkg)
        graph["packageJson"].append(
            {
                "path": "package.json",
                "name": data.get("name"),
                "dependencies": sorted((data.get("dependencies") or {}).keys()),
                "devDependencies": sorted((data.get("devDependencies") or {}).keys()),
                "packageManager": data.get("packageManager"),
            }
        )
    ws = root / "pnpm-workspace.yaml"
    if ws.exists():
        graph["pnpmWorkspace"] = ws.read_text(encoding="utf-8")[:2000]
    for req in root.glob("requirements*.txt"):
        if skipped_path(req):
            continue
        try:
            lines = [
                ln.strip()
                for ln in req.read_text(encoding="utf-8").splitlines()
                if ln.strip() and not ln.strip().startswith("#")
            ]
        except Exception:
            lines = []
        graph["requirements"].append(
            {"path": str(req.relative_to(root)).replace("\\", "/"), "packages": lines[:200]}
        )
    # workspace package.json names
    for child in (root / "packages").glob("*/package.json") if (root / "packages").exists() else []:
        data = load_json(child)
        graph["packageJson"].append(
            {
                "path": str(child.relative_to(root)).replace("\\", "/"),
                "name": data.get("name"),
                "dependencies": sorted((data.get("dependencies") or {}).keys())[:80],
            }
        )
    for child in (root / "apps").glob("*/package.json") if (root / "apps").exists() else []:
        data = load_json(child)
        graph["packageJson"].append(
            {
                "path": str(child.relative_to(root)).replace("\\", "/"),
                "name": data.get("name"),
                "dependencies": sorted((data.get("dependencies") or {}).keys())[:80],
            }
        )
    return graph


def resolve_template(template_dir: Path, dest: Path) -> tuple[str, str]:
    ext = dest.suffix.lstrip(".")
    for name in ([f"{ext}.tpl"] if ext else []) + ["js.tpl", "py.tpl"]:
        tpl = template_dir / name
        if tpl.exists():
            body = tpl.read_text(encoding="utf-8")
            body = (
                body.replace("{{PATH}}", str(dest).replace("\\", "/"))
                .replace("{{TEMPLATE}}", name)
                .replace("{{ID}}", dest.stem)
            )
            if TEMPLATE_PLACEHOLDER not in body:
                body = f"{TEMPLATE_PLACEHOLDER}\n{body}"
            return body, name
    return (
        f"{TEMPLATE_PLACEHOLDER}\n# Auto-generated stub for {dest.name}\n# {LABEL}\n",
        "inline-fallback",
    )


def propose_or_write(
    rel: str,
    template_dir: Path,
    proposals_dir: Path,
    apply: bool,
    results: list[dict],
) -> bool:
    rel = rel.replace("\\", "/").lstrip("./")
    if is_artifact_path(rel):
        results.append({"path": rel, "action": "skipped_artifact_path"})
        return False
    dest = Path(rel)
    if dest.exists():
        results.append({"path": rel, "action": "exists_skip"})
        return False
    content, tpl = resolve_template(template_dir, dest)
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
            "proposal": str(proposal).replace("\\", "/"),
        }
    )
    return True


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
        return True, out[-8000:]
    except subprocess.CalledProcessError as e:
        return False, (e.output or "")[-8000:]
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
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--templates", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--plan", default="dev/fill-plan.json")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--scan-todos", action="store_true")
    ap.add_argument(
        "--run-gates",
        action="store_true",
        help="Run pnpm gate:scaffold (SCI OS). Skips pytest/flake8 unless env overrides.",
    )
    args = ap.parse_args()

    root = Path(".").resolve()
    manifest = load_json(Path(args.manifest))
    plan = load_json(Path(args.plan)) if Path(args.plan).exists() else {"targets": []}
    template_dir = Path(args.templates)
    report_path = Path(args.report)
    out_diag = root / "diagnostics-export" / "auto-finish"
    proposals_dir = out_diag / "proposals"
    out_diag.mkdir(parents=True, exist_ok=True)
    proposals_dir.mkdir(parents=True, exist_ok=True)

    results: list[dict] = []
    generated: list[str] = []

    for t in plan.get("targets") or []:
        if t.get("enabled") is False:
            results.append({"path": t.get("path"), "action": "skipped_disabled"})
            continue
        if t.get("path") and propose_or_write(
            t["path"], template_dir, proposals_dir, args.apply, results
        ):
            generated.append(t["path"].replace("\\", "/"))

    missing = []
    for entry in collect_files(manifest):
        if not Path(entry).exists():
            missing.append(entry)
            if propose_or_write(entry, template_dir, proposals_dir, args.apply, results):
                generated.append(entry)

    missing_artifacts = []
    for entry in manifest.get("artifacts", []) or []:
        p = entry.get("path") if isinstance(entry, dict) else entry
        if not p:
            continue
        rel = str(p).replace("\\", "/")
        if not Path(rel).exists():
            missing_artifacts.append(rel)
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
                        target, template_dir, proposals_dir, args.apply, results
                    ):
                        generated.append(target)

    deps = dependency_graph(root)

    gate = {"ran": False}
    if args.run_gates:
        test_cmd = os.environ.get("TEST_CMD", "pnpm gate:scaffold")
        ok, out = run_cmd(test_cmd)
        gate = {"ran": True, "cmd": test_cmd, "ok": ok, "outputTail": out[-4000:]}

    # Optional Python tooling — never fail the generator if absent
    lint_suggestions = {}
    if os.environ.get("AUTO_FINISH_PYTHON_LINT") == "1":
        for name, cmd in (
            ("flake8", os.environ.get("LINT_CMD", "flake8 . || true")),
            ("black", os.environ.get("FMT_CMD", "black --check . || true")),
            ("bandit", os.environ.get("STATIC_CMD", "bandit -r . || true")),
        ):
            ok, out = run_cmd(cmd)
            lint_suggestions[name] = {"ok": ok, "outputTail": out[-2000:]}

    report = {
        "at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "schema": "sci-os-auto-finish/v1",
        "label": LABEL,
        "mode": "apply" if args.apply else "propose-only",
        "constitution": "propose-only; never auto-deploy; no mass stubs",
        "missing_from_manifest": missing,
        "missing_artifacts_report_only": missing_artifacts,
        "todo_files": todos[:200],
        "todo_files_count": len(todos),
        "generated": generated,
        "results": results,
        "dependency_graph": deps,
        "gate": gate,
        "lint_suggestions": lint_suggestions,
        "counts": {
            "missing": len(missing),
            "generated": len(generated),
            "proposed": sum(1 for r in results if r.get("action") == "proposed"),
            "applied": sum(1 for r in results if r.get("action") == "applied"),
        },
        "note": (
            "Default is propose-only. Commit/PR only via auto_finish_strong.sh --commit. "
            "OPEN_PR is never automatic without explicit human config."
        ),
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (out_diag / "report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
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
