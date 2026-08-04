"""Stage, quarantine, or finalize a user-approved project relocation manifest.

Stage copies and verifies files but never removes the source. Quarantine
renames the verified source for a dated review moratorium. Finalize requires a
separate command, an expired moratorium, and refuses to remove a source
directory with unmanifested files. Do not run --finalize without a new
explicit user approval.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


CHUNK_SIZE = 1024 * 1024


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(CHUNK_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


def read_manifest(path: Path) -> dict:
    with path.open(encoding="utf-8") as stream:
        manifest = json.load(stream)
    if manifest.get("mode") != "read_only_move_manifest":
        raise SystemExit("Manifest is not a relocation dry-run manifest.")
    if not manifest.get("items"):
        raise SystemExit("Manifest contains no items.")
    return manifest


def source_path(item: dict, source_root: Path | None = None) -> Path:
    return source_root / item["relative_path"] if source_root else Path(item["source_path"])


def verify_sources(manifest: dict, source_root: Path | None = None) -> None:
    for item in manifest["items"]:
        source = source_path(item, source_root)
        if not source.is_file():
            raise SystemExit(f"Source file is missing: {source}")
        actual_hash = sha256(source)
        if actual_hash != item["sha256"]:
            raise SystemExit(f"Source changed since dry run: {source}")


def verify_destinations(manifest: dict) -> list[dict]:
    results = []
    for item in manifest["items"]:
        target = Path(item["target_path"])
        if not target.is_file():
            raise SystemExit(f"Destination file is missing: {target}")
        actual_hash = sha256(target)
        if actual_hash != item["sha256"]:
            raise SystemExit(f"Destination verification failed: {target}")
        results.append({"asset_id": item["asset_id"], "target_path": str(target), "sha256": actual_hash})
    return results


def write_report(manifest_path: Path, name: str, report: dict) -> Path:
    path = manifest_path.parent / name
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return path


def stage(manifest: dict, manifest_path: Path) -> Path:
    verify_sources(manifest)
    copied = 0
    reused = 0
    for item in manifest["items"]:
        source = Path(item["source_path"])
        target = Path(item["target_path"])
        if target.exists():
            if not target.is_file() or sha256(target) != item["sha256"]:
                raise SystemExit(f"Refusing to overwrite nonmatching destination: {target}")
            reused += 1
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied += 1
    destinations = verify_destinations(manifest)
    report = {
        "mode": "staged_and_verified",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "manifest": str(manifest_path),
        "source_root": manifest["source_root"],
        "target_root": manifest["proposed_target_root"],
        "copied_files": copied,
        "reused_verified_files": reused,
        "verified_destinations": destinations,
        "source_action": "none - source files remain in place pending a separate finalization approval",
    }
    return write_report(manifest_path, f"{manifest['project_id']}_stage_verification.json", report)


def quarantine(manifest: dict, manifest_path: Path, delete_not_before: str) -> Path:
    try:
        not_before = datetime.strptime(delete_not_before, "%Y-%m-%d").date()
    except ValueError as error:
        raise SystemExit("--delete-not-before must use YYYY-MM-DD.") from error
    source_root = Path(manifest["source_root"])
    verify_sources(manifest, source_root)
    suffix = f"__MOVED_PENDING_REVIEW__DELETE_NOT_BEFORE_{not_before.isoformat()}"
    quarantined_root = source_root.with_name(f"{source_root.name}{suffix}")
    if quarantined_root.exists():
        raise SystemExit(f"Quarantine destination already exists: {quarantined_root}")
    source_root.rename(quarantined_root)
    report = {
        "mode": "quarantined_pending_review",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "manifest": str(manifest_path),
        "original_source_root": str(source_root),
        "quarantined_source_root": str(quarantined_root),
        "delete_not_before": not_before.isoformat(),
        "rules": [
            "The verified canonical copy remains at the manifest target root.",
            "The quarantined source is intentionally preserved and must not be deleted before delete_not_before.",
            "At expiry, the owner may snooze the moratorium instead of deleting.",
            "A future finalization must re-verify every source and destination hash and receive a new explicit approval.",
        ],
    }
    return write_report(manifest_path, f"{manifest['project_id']}_moratorium.json", report)


def read_moratorium(path: Path, manifest_path: Path) -> dict:
    with path.open(encoding="utf-8") as stream:
        moratorium = json.load(stream)
    if moratorium.get("mode") != "quarantined_pending_review":
        raise SystemExit("Moratorium file is not a quarantine report.")
    if Path(moratorium.get("manifest", "")).resolve() != manifest_path:
        raise SystemExit("Moratorium does not belong to this manifest.")
    try:
        not_before = datetime.strptime(moratorium["delete_not_before"], "%Y-%m-%d").date()
    except (KeyError, ValueError) as error:
        raise SystemExit("Moratorium has an invalid delete_not_before date.") from error
    if datetime.now(timezone.utc).date() < not_before:
        raise SystemExit(f"Moratorium remains active until {not_before.isoformat()}. Use a snooze/update workflow instead of finalizing.")
    return moratorium


def finalize(manifest: dict, manifest_path: Path, moratorium_path: Path) -> Path:
    moratorium = read_moratorium(moratorium_path, manifest_path)
    source_root = Path(moratorium["quarantined_source_root"])
    verify_sources(manifest, source_root)
    verify_destinations(manifest)
    expected = {source_path(item, source_root).resolve() for item in manifest["items"]}
    actual = {path.resolve() for path in source_root.rglob("*") if path.is_file()}
    extras = actual - expected
    if extras:
        examples = ", ".join(str(path) for path in sorted(extras)[:3])
        raise SystemExit(f"Refusing to delete a source containing unmanifested files: {examples}")
    for item in manifest["items"]:
        source_path(item, source_root).unlink()
    for directory in sorted((path for path in source_root.rglob("*") if path.is_dir()), key=lambda path: len(path.parts), reverse=True):
        directory.rmdir()
    source_root.rmdir()
    report = {
        "mode": "finalized",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "manifest": str(manifest_path),
        "source_root_removed": str(source_root),
        "target_root": manifest["proposed_target_root"],
        "files_finalized": len(manifest["items"]),
    }
    return write_report(manifest_path, f"{manifest['project_id']}_finalization_report.json", report)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stage, quarantine, or finalize an approved Aida project relocation manifest.")
    parser.add_argument("--manifest", required=True, help="Dry-run manifest generated by aida_project_move_manifest.py")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--stage", action="store_true", help="Copy and hash-verify destinations; preserve all sources.")
    mode.add_argument("--quarantine", action="store_true", help="Rename the staged source into a dated review moratorium.")
    mode.add_argument("--finalize", action="store_true", help="Delete an expired, verified quarantined source only after a separate approval.")
    parser.add_argument("--delete-not-before", help="Required with --quarantine; YYYY-MM-DD.")
    parser.add_argument("--moratorium", help="Required with --finalize; quarantine report path.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest).expanduser().resolve()
    if not manifest_path.is_file():
        raise SystemExit(f"Manifest does not exist: {manifest_path}")
    manifest = read_manifest(manifest_path)
    if args.stage:
        report = stage(manifest, manifest_path)
    elif args.quarantine:
        if not args.delete_not_before:
            raise SystemExit("--quarantine requires --delete-not-before YYYY-MM-DD.")
        report = quarantine(manifest, manifest_path, args.delete_not_before)
    else:
        if not args.moratorium:
            raise SystemExit("--finalize requires --moratorium PATH.")
        report = finalize(manifest, manifest_path, Path(args.moratorium).expanduser().resolve())
    print(json.dumps({"report": str(report)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
