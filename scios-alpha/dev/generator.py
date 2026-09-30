#!/usr/bin/env python3
"""
dev/generator.py — SCI OS ×10 auto-fill generator (propose-only by default)

Usage:
  python dev/generator.py --manifest build/manifest.json --templates dev/templates
  python dev/generator.py --manifest build/manifest.json --templates dev/templates --apply

Constitution:
  - propose-only; never auto-deploy
  - no mass stubs; skip build artifact paths (dist/)
  - evidence under diagnostics-export/auto-fill/
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

TEMPLATE_PLACEHOLDER = "<AUTO_GENERATED>"
LABEL = "ALPHA_NON_PRODUCTION"

SKIP_DIR_NAMES = {
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
}

SKIP_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".zip", ".exe", ".dll", ".map"}

CREATE_FILE_RE = re.compile(r"create file[:\s]+([^\s\"'`]+)", re.IGNORECASE)


def load_manifest(path: Path) -> dict:
    if not path.exists():
        print(json.dumps({"ok": False, "error": "MANIFEST_MISSING", "path": str(path)}))
        return {}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_plan(path: Path) -> dict:
    if not path.exists():
        return {"targets": []}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def is_skipped_dir(part: str) -> bool:
    return part in SKIP_DIR_NAMES or part.startswith(".")


def find_todos(root: Path, max_files: int = 5000) -> list[str]:
    todos: list[str] = []
    scanned = 0
    for p in root.rglob("*.*"):
        if scanned >= max_files:
            break
        if any(is_skipped_dir(part) for part in p.parts):
            continue
        if p.suffix.lower() in SKIP_SUFFIXES:
            continue
        if not p.is_file():
            continue
        scanned += 1
        try:
            text = p.read_text(encoding="utf-8")
        except Exception:
            continue
        if "TODO" in text or "FIXME" in text:
            try:
                todos.append(str(p.relative_to(root)).replace("\\", "/"))
            except ValueError:
                todos.append(str(p))
    return todos


def resolve_template(template_dir: Path, dest: Path) -> tuple[str, str]:
    """Return (content, template_name). Prefer <ext>.tpl then stub-module.cjs.tpl."""
    ext = dest.suffix.lstrip(".")
    candidates = []
    if ext:
        candidates.append(f"{ext}.tpl")
    candidates.append("stub-module.cjs.tpl")
    for name in candidates:
        tpl = template_dir / name
        if tpl.exists():
            body = tpl.read_text(encoding="utf-8")
            body = (
                body.replace("{{PATH}}", str(dest).replace("\\", "/"))
                .replace("{{TEMPLATE}}", name)
                .replace("{{ID}}", dest.stem.replace(".", "_"))
            )
            return body, name
    return (
        f"{TEMPLATE_PLACEHOLDER}\n# Auto-generated stub for {dest.name}\n# {LABEL}\n",
        "inline-fallback",
    )


def is_artifact_path(rel: str) -> bool:
    norm = rel.replace("\\", "/")
    return "/dist/" in f"/{norm}/" or norm.startswith("dist/")


def collect_manifest_files(manifest: dict) -> list[str]:
    files: list[str] = []
    for entry in manifest.get("files", []) or []:
        if isinstance(entry, str):
            files.append(entry.replace("\\", "/"))
        elif isinstance(entry, dict) and entry.get("path"):
            files.append(str(entry["path"]).replace("\\", "/"))
    # artifacts are build outputs — report missing but never auto-stub them
    return files


def collect_missing_artifacts(manifest: dict) -> list[str]:
    missing: list[str] = []
    for entry in manifest.get("artifacts", []) or []:
        if isinstance(entry, dict) and entry.get("path"):
            p = str(entry["path"]).replace("\\", "/")
            if not Path(p).exists():
                missing.append(p)
        elif isinstance(entry, str) and not Path(entry).exists():
            missing.append(entry.replace("\\", "/"))
    return missing


def propose_or_write(
    rel: str,
    template_dir: Path,
    out_dir: Path,
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

    content, tpl_name = resolve_template(template_dir, dest)
    sha = hashlib.sha256(content.encode("utf-8")).hexdigest()
    proposal_name = "proposals/" + rel.replace("/", "__")
    proposal_abs = out_dir / proposal_name
    proposal_abs.parent.mkdir(parents=True, exist_ok=True)
    proposal_abs.write_text(content, encoding="utf-8")

    if apply:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        results.append(
            {
                "path": rel,
                "action": "applied",
                "template": tpl_name,
                "sha256": sha,
                "proposal": proposal_name,
            }
        )
        print(f"Generált fájl (apply): {rel}")
    else:
        results.append(
            {
                "path": rel,
                "action": "proposed",
                "template": tpl_name,
                "sha256": sha,
                "proposal": proposal_name,
            }
        )
        print(f"Javaslat (propose-only): {rel} → diagnostics-export/auto-fill/{proposal_name}")
    return True


def main() -> None:
    ap = argparse.ArgumentParser(description="SCI OS ×10 auto-fill generator")
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--templates", required=True)
    ap.add_argument("--plan", default="dev/fill-plan.json")
    ap.add_argument(
        "--apply",
        action="store_true",
        help="Write into workspace (default: propose-only)",
    )
    ap.add_argument(
        "--scan-todos",
        action="store_true",
        help="Scan for TODO/FIXME and 'create file:' hints",
    )
    args = ap.parse_args()

    root = Path(".").resolve()
    manifest_path = Path(args.manifest)
    template_dir = Path(args.templates)
    plan_path = Path(args.plan)
    out_dir = root / "diagnostics-export" / "auto-fill"
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest(manifest_path)
    if not manifest:
        raise SystemExit(1)
    plan = load_plan(plan_path)

    results: list[dict] = []
    generated: list[str] = []

    # 0) fill-plan targets
    for t in plan.get("targets") or []:
        if t.get("enabled") is False:
            results.append({"path": t.get("path"), "action": "skipped_disabled"})
            continue
        path = t.get("path")
        if not path:
            continue
        if propose_or_write(path, template_dir, out_dir, args.apply, results):
            generated.append(path.replace("\\", "/"))

    # 1) Manifest files[] (source contract) — may generate
    missing_files = []
    for entry in collect_manifest_files(manifest):
        if not Path(entry).exists():
            missing_files.append(entry)
            if propose_or_write(entry, template_dir, out_dir, args.apply, results):
                generated.append(entry)

    # artifacts[] — report only, never stub
    missing_artifacts = collect_missing_artifacts(manifest)
    for a in missing_artifacts:
        results.append({"path": a, "action": "missing_artifact_report_only"})

    # 2) TODO scan (opt-in — avoid accidental mass work)
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
                    if propose_or_write(target, template_dir, out_dir, args.apply, results):
                        generated.append(target)

    proposed = sum(1 for r in results if r.get("action") == "proposed")
    written = sum(1 for r in results if r.get("action") == "applied")

    report = {
        "at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "schema": "sci-os-auto-fill-generator/v1",
        "engine": "python",
        "label": LABEL,
        "mode": "apply" if args.apply else "propose-only",
        "manifest": {
            "path": str(manifest_path).replace("\\", "/"),
            "buildSHA": manifest.get("buildSHA"),
            "packageName": manifest.get("packageName"),
        },
        "plan": str(plan_path).replace("\\", "/"),
        "templates": str(template_dir).replace("\\", "/"),
        "scanTodos": bool(args.scan_todos),
        "counts": {
            "missingManifestFiles": len(missing_files),
            "missingArtifactsReportOnly": len(missing_artifacts),
            "todoFiles": len(todos),
            "generated": len(generated),
            "proposed": proposed,
            "written": written,
        },
        "missingManifestFiles": missing_files,
        "missingArtifactsReportOnly": missing_artifacts,
        "todoFilesSample": todos[:50],
        "generated": generated,
        "results": results,
        "note": (
            "Propose-only by default. dist/ artifacts are never stubbed. "
            "Use --scan-todos deliberately. Commit only via auto_fill --commit."
        ),
    }

    (out_dir / "generator-report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print("Összegzés:")
    print(f"Hiányzó manifest files[]: {len(missing_files)}")
    print(f"Hiányzó artifacts (csak jelentés): {len(missing_artifacts)}")
    print(f"TODO fájlok: {len(todos)}")
    print(f"Generált/javasolt: {len(generated)}")
    for g in generated:
        print(f" - {g}")


if __name__ == "__main__":
    main()
