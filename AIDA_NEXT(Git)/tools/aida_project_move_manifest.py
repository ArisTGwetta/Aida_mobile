"""Create a review-only relocation manifest for one approved project edition.

This tool never creates destination folders and never copies, moves, renames,
or deletes source files. A later executor may consume an approved manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path


VERSION = "1.0"
CHUNK_SIZE = 1024 * 1024


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(CHUNK_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


def slug(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return normalized or "asset"


def files_in(source: Path) -> list[Path]:
    return sorted((path for path in source.rglob("*") if path.is_file()), key=lambda path: path.as_posix().lower())


def parse_extra_file(value: str) -> tuple[Path, Path]:
    if "=" not in value:
        raise ValueError("--extra-file must use SOURCE_PATH=TARGET_RELATIVE_PATH format.")
    raw_source, raw_relative = value.split("=", 1)
    source = Path(raw_source).expanduser().resolve()
    relative = Path(raw_relative.replace("\\", "/"))
    if not source.is_file():
        raise ValueError(f"Extra source file does not exist: {source}")
    if relative.is_absolute() or ".." in relative.parts or relative.name in {"", "."}:
        raise ValueError("Extra target path must be a non-empty relative path inside --target.")
    return source, relative


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a read-only project relocation manifest.")
    parser.add_argument("--source", help="Approved source edition folder. It is read only.")
    parser.add_argument("--target", required=True, help="Proposed canonical folder. It is recorded but never created.")
    parser.add_argument("--project", required=True, help="Stable project identifier, for example shirley_holmes.")
    parser.add_argument("--output", required=True, help="Folder for this review manifest, outside the source folder.")
    parser.add_argument("--extra-file", action="append", default=[], help="Optional SOURCE_PATH=TARGET_RELATIVE_PATH. Repeat for named supporting files outside --source.")
    parser.add_argument("--source-file", action="append", default=[], help="Optional SOURCE_PATH=TARGET_RELATIVE_PATH for an individual-file-only manifest. Repeat as needed.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = Path(args.source).expanduser().resolve() if args.source else None
    target = Path(args.target).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()
    project = slug(args.project)

    if source and not source.is_dir():
        raise SystemExit(f"Source directory does not exist: {source}")
    if source and (target == source or target.is_relative_to(source)):
        raise SystemExit("--target must be outside --source.")
    if source and (output == source or output.is_relative_to(source)):
        raise SystemExit("--output must be outside --source.")
    if output == target or output.is_relative_to(target):
        raise SystemExit("--output must be outside the proposed target folder.")

    files = files_in(source) if source else []
    standalone = [parse_extra_file(value) for value in args.source_file]
    if source is None and not standalone:
        raise SystemExit("Provide --source or at least one --source-file.")
    if source and not files:
        raise SystemExit(f"No files found in source directory: {source}")

    extras = [parse_extra_file(value) for value in args.extra_file]
    seen_ids: set[str] = set()
    items = []

    def add_item(path: Path, relative: Path, source_scope: str) -> None:
        base_id = f"{project}.{slug(str(relative.with_suffix('')))}.{slug(path.suffix.lstrip('.'))}"
        asset_id = base_id
        suffix = 2
        while asset_id in seen_ids:
            asset_id = f"{base_id}_{suffix}"
            suffix += 1
        seen_ids.add(asset_id)
        stat = path.stat()
        items.append({
            "asset_id": asset_id,
            "source_path": str(path),
            "target_path": str(target / relative),
            "relative_path": relative.as_posix(),
            "source_scope": source_scope,
            "bytes": stat.st_size,
            "sha256": sha256(path),
            "operation": "move_after_approval_and_reverification",
        })

    for path in files:
        add_item(path, path.relative_to(source), "primary")
    for path, relative in extras:
        if source and path.is_relative_to(source):
            raise SystemExit(f"Extra source is already inside --source: {path}")
        add_item(path, relative, "extra")
    for path, relative in standalone:
        add_item(path, relative, "standalone")

    manifest = {
        "version": VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "read_only_move_manifest",
        "project_id": project,
        "source_root": str(source) if source else None,
        "proposed_target_root": str(target),
        "rules": [
            "This is a dry-run manifest only; no source or target file was changed.",
            "The proposed target directory was not created.",
            "Before an approved move, re-hash every source and verify every destination file after transfer.",
            "Delete the source only after destination verification and explicit user approval.",
            "Aida should use asset_id and SHA-256 as identity, not a machine-specific path.",
        ],
        "summary": {
            "file_count": len(items),
            "primary_file_count": sum(item["source_scope"] == "primary" for item in items),
            "extra_file_count": sum(item["source_scope"] == "extra" for item in items),
            "standalone_file_count": sum(item["source_scope"] == "standalone" for item in items),
            "total_bytes": sum(item["bytes"] for item in items),
        },
        "items": items,
    }
    output.mkdir(parents=True, exist_ok=True)
    json_path = output / f"{project}_move_manifest_dry_run.json"
    markdown_path = output / f"{project}_move_manifest_dry_run.md"
    json_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    lines = [
        f"# Move Manifest Dry Run: {project}",
        "",
        "Status: review only. No file or folder was created, copied, moved, renamed, or deleted.",
        "",
        f"- Source: `{source}`" if source else "- Source: individual approved files only",
        f"- Proposed target: `{target}`",
        f"- Files: {len(items)}",
        f"- Total bytes: {manifest['summary']['total_bytes']}",
        "",
        "## Planned Assets",
        "",
    ]
    for item in items:
        lines.append(f"- `{item['asset_id']}`: `{item['relative_path']}` -> `{item['target_path']}`")
    lines.extend([
        "",
        "## Approval Gate",
        "",
        "An apply executor must re-hash sources, transfer files, verify destinations against this manifest, and wait for an explicit approval before removing any source file.",
    ])
    markdown_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"files": len(items), "bytes": manifest["summary"]["total_bytes"], "manifest": str(json_path)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
