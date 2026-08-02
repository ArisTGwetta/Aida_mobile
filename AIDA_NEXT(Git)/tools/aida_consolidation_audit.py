"""Read-only inventory and consolidation audit for Aida-related folders.

The auditor never changes scanned files. It produces an evidence report that
groups exact duplicates, cautious text/code near-duplicates, directory context,
and possible standalone historical versions for human review.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


VERSION = "1.0"
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache"}
TEXT_EXTENSIONS = {
    ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".json", ".md",
    ".txt", ".html", ".htm", ".css", ".yml", ".yaml", ".toml", ".ini",
    ".csv", ".xml", ".svg", ".bat", ".ps1", ".sh",
}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico"}
STORY_EXTENSIONS = {".docx", ".pdf", ".rtf", ".odt", ".epub"}
AIDA_WORDS = {"aida", "awake", "spine", "airlock", "briefcase", "librarian", "realm", "pyodide"}
LEGACY_WORDS = {"backup", "old", "legacy", "archive", "copy", "donor", "pre", "v1", "v2", "one", "awake", "spine"}
MAX_TEXT_BYTES = 1_000_000


@dataclass
class FileRecord:
    path: str
    root: str
    relative_path: str
    parent: str
    extension: str
    size_bytes: int
    modified_utc: str
    sha256: str
    tags: list[str]
    aida_score: int
    simhash: str | None
    text_token_count: int | None


def utc_iso(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_text(path: Path) -> str | None:
    if path.suffix.lower() not in TEXT_EXTENSIONS or path.stat().st_size > MAX_TEXT_BYTES:
        return None
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None


def tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9_]{2,}", text.lower())


def simhash(text: str) -> tuple[str, int] | tuple[None, None]:
    words = tokens(text)
    if not words:
        return None, None
    weights = [0] * 64
    for word in words[:80_000]:
        number = int.from_bytes(hashlib.blake2b(word.encode("utf-8"), digest_size=8).digest(), "big")
        for bit in range(64):
            weights[bit] += 1 if number & (1 << bit) else -1
    result = sum(1 << bit for bit, weight in enumerate(weights) if weight >= 0)
    return f"{result:016x}", len(words)


def classify(path: Path, relative_path: str, text: str | None) -> tuple[list[str], int]:
    haystack = f"{relative_path} {text[:12_000] if text else ''}".lower()
    tags: set[str] = set()
    score = sum(1 for word in AIDA_WORDS if word in haystack)
    suffix = path.suffix.lower()
    path_words = set(re.findall(r"[a-z0-9_]+", relative_path.lower()))

    if score:
        tags.add("aida_candidate")
    if suffix in {".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".html", ".css"}:
        tags.add("code")
    if suffix in {".md", ".txt", ".docx", ".pdf", ".rtf", ".odt"}:
        tags.add("notes_or_guidance")
    if suffix in IMAGE_EXTENSIONS:
        tags.add("visual_asset")
    if suffix in STORY_EXTENSIONS or any(word in haystack for word in ("story", "chapter", "character", "scene", "rpg")):
        tags.add("story_or_project_asset")
    if suffix == ".json" and any(word in haystack for word in ("memory", "fact", "insight", "diary", "briefcase", "project_")):
        tags.add("aida_data_candidate")
    if path_words & LEGACY_WORDS or any(word in haystack for word in ("backup", "legacy", "previous version", "donor")):
        tags.add("legacy_or_archive")
    if any(word in path_words for word in ("awake", "one", "spine")) and score >= 1:
        tags.add("standalone_version_candidate")
    if not tags:
        tags.add("unclassified")
    return sorted(tags), score


def iter_files(roots: Iterable[Path], include_hidden: bool) -> Iterable[tuple[Path, Path]]:
    for root in roots:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            relative_parts = path.relative_to(root).parts
            if any(part in SKIP_DIRS for part in relative_parts):
                continue
            if not include_hidden and any(part.startswith(".") for part in relative_parts):
                continue
            yield root, path


def inventory(roots: list[Path], include_hidden: bool) -> list[FileRecord]:
    records: list[FileRecord] = []
    for root, path in iter_files(roots, include_hidden):
        try:
            relative_path = str(path.relative_to(root))
            text = read_text(path)
            tags, score = classify(path, relative_path, text)
            fingerprint, token_count = simhash(text) if text is not None else (None, None)
            stat = path.stat()
            records.append(FileRecord(
                path=str(path), root=str(root), relative_path=relative_path,
                parent=str(path.parent), extension=path.suffix.lower(), size_bytes=stat.st_size,
                modified_utc=utc_iso(stat.st_mtime), sha256=sha256(path), tags=tags,
                aida_score=score, simhash=fingerprint, text_token_count=token_count,
            ))
        except (OSError, PermissionError) as error:
            print(f"Skipped unreadable file: {path} ({error})")
    return records


def hamming(left: str, right: str) -> int:
    return (int(left, 16) ^ int(right, 16)).bit_count()


def exact_groups(records: list[FileRecord], reference_roots: list[Path]) -> list[dict]:
    grouped: dict[str, list[FileRecord]] = defaultdict(list)
    for record in records:
        grouped[record.sha256].append(record)
    output = []
    for digest, members in grouped.items():
        if len(members) < 2:
            continue
        ranked = sorted(members, key=lambda item: canonical_score(item, reference_roots), reverse=True)
        output.append({
            "sha256": digest,
            "size_bytes": members[0].size_bytes,
            "count": len(members),
            "recommended_canonical": ranked[0].path,
            "members": [asdict(member) for member in ranked],
        })
    return sorted(output, key=lambda item: (-item["size_bytes"], item["recommended_canonical"]))


def canonical_score(record: FileRecord, reference_roots: list[Path]) -> int:
    path = Path(record.path)
    score = record.aida_score * 3
    if any(path.is_relative_to(root) for root in reference_roots):
        score += 100
    if "legacy_or_archive" in record.tags:
        score -= 20
    if "standalone_version_candidate" in record.tags:
        score += 4
    return score


def near_groups(records: list[FileRecord], max_distance: int) -> list[dict]:
    buckets: dict[tuple[str, str], list[FileRecord]] = defaultdict(list)
    for record in records:
        if not record.simhash or record.extension not in TEXT_EXTENSIONS:
            continue
        value = int(record.simhash, 16)
        for band in range(4):
            buckets[(record.extension, f"{(value >> (band * 16)) & 0xffff:04x}")].append(record)

    compared: set[tuple[str, str]] = set()
    pairs = []
    for bucket in buckets.values():
        for index, left in enumerate(bucket):
            for right in bucket[index + 1:]:
                key = tuple(sorted((left.path, right.path)))
                if key in compared:
                    continue
                compared.add(key)
                smallest, largest = sorted((left.size_bytes, right.size_bytes))
                if not smallest or largest / smallest > 3:
                    continue
                distance = hamming(left.simhash, right.simhash)
                if distance <= max_distance:
                    pairs.append({
                        "distance": distance,
                        "similarity_hint": f"{round((1 - distance / 64) * 100)}% fingerprint similarity",
                        "left": asdict(left),
                        "right": asdict(right),
                    })
    return sorted(pairs, key=lambda item: (item["distance"], item["left"]["path"]))


def directory_context(records: list[FileRecord]) -> list[dict]:
    exact_counts = Counter(record.sha256 for record in records)
    grouped: dict[str, list[FileRecord]] = defaultdict(list)
    for record in records:
        grouped[record.parent].append(record)
    output = []
    for folder, members in grouped.items():
        tags = Counter(tag for member in members for tag in member.tags)
        unique_neighbors = [member for member in members if exact_counts[member.sha256] == 1]
        output.append({
            "directory": folder,
            "file_count": len(members),
            "aida_candidate_count": sum("aida_candidate" in member.tags for member in members),
            "tag_counts": dict(tags.most_common()),
            "unique_neighbor_files": [
                {"path": member.path, "tags": member.tags, "size_bytes": member.size_bytes}
                for member in sorted(unique_neighbors, key=lambda item: item.path)
            ],
        })
    return sorted(output, key=lambda item: (-item["aida_candidate_count"], -item["file_count"], item["directory"]))


def standalone_versions(records: list[FileRecord]) -> list[dict]:
    by_root: dict[str, list[FileRecord]] = defaultdict(list)
    for record in records:
        if "standalone_version_candidate" in record.tags:
            by_root[record.root].append(record)
    return [{
        "root": root,
        "candidate_file_count": len(members),
        "tags": dict(Counter(tag for member in members for tag in member.tags).most_common()),
        "examples": [member.path for member in sorted(members, key=lambda item: item.path)[:20]],
    } for root, members in sorted(by_root.items())]


def write_reports(output: Path, report: dict, records: list[FileRecord]) -> None:
    output.mkdir(parents=True, exist_ok=True)
    (output / "aida_consolidation_audit.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    with (output / "aida_consolidation_inventory.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(asdict(records[0]).keys()) if records else ["path"])
        writer.writeheader()
        for record in records:
            row = asdict(record)
            row["tags"] = ";".join(record.tags)
            writer.writerow(row)
    summary = report["summary"]
    lines = [
        "# Aida Consolidation Audit",
        "",
        f"Generated: {report['generated_at']}",
        f"Mode: {report['mode']} (the auditor never modifies scanned files)",
        "",
        "## Summary",
        "",
        f"- Files scanned: {summary['files_scanned']}",
        f"- Likely Aida files: {summary['aida_candidate_files']}",
        f"- Exact duplicate groups: {summary['exact_duplicate_groups']}",
        f"- Near-duplicate pairs: {summary['near_duplicate_pairs']}",
        f"- Directories with context: {summary['directories_mapped']}",
        "",
        "## Review Order",
        "",
        "1. Review exact-duplicate groups and their recommended canonical path.",
        "2. Read each directory's `unique_neighbor_files` before moving an old folder; those are the things that may belong with the project even though they are not duplicates.",
        "3. Review near-duplicate pairs manually. Fingerprints are evidence, not proof of interchangeable content.",
        "4. Decide whether candidate Awake, One, Spine, or other versions should become standalone archive packages.",
        "5. Archive only after human approval; this report contains no destructive action.",
        "",
        "See `aida_consolidation_audit.json` for complete evidence and `aida_consolidation_inventory.csv` for filtering/sorting.",
    ]
    (output / "AIDA_CONSOLIDATION_REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only Aida consolidation audit.")
    parser.add_argument("--root", action="append", required=True, help="Folder to inventory. Repeat for each approved root.")
    parser.add_argument("--reference-root", action="append", default=[], help="Known canonical root; boosts canonical recommendations.")
    parser.add_argument("--output", required=True, help="Folder for generated reports. It must not be inside a scanned root.")
    parser.add_argument("--near-distance", type=int, default=6, help="Maximum 64-bit SimHash distance for near-duplicate candidates (default: 6).")
    parser.add_argument("--include-hidden", action="store_true", help="Include hidden files/folders except known generated dependency folders.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    roots = [Path(value).expanduser().resolve() for value in args.root]
    references = [Path(value).expanduser().resolve() for value in args.reference_root]
    output = Path(args.output).expanduser().resolve()
    if any(output == root or output.is_relative_to(root) for root in roots):
        raise SystemExit("--output must be outside every scanned --root to avoid auditing generated reports.")
    missing = [str(root) for root in roots if not root.is_dir()]
    if missing:
        raise SystemExit(f"Missing scan root(s): {', '.join(missing)}")

    records = inventory(roots, args.include_hidden)
    exact = exact_groups(records, references)
    near = near_groups(records, max(0, min(20, args.near_distance)))
    contexts = directory_context(records)
    report = {
        "version": VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "read_only_inventory",
        "roots": [str(root) for root in roots],
        "reference_roots": [str(root) for root in references],
        "summary": {
            "files_scanned": len(records),
            "aida_candidate_files": sum("aida_candidate" in record.tags for record in records),
            "exact_duplicate_groups": len(exact),
            "near_duplicate_pairs": len(near),
            "directories_mapped": len(contexts),
        },
        "exact_duplicates": exact,
        "near_duplicate_candidates": near,
        "directory_context": contexts,
        "standalone_version_candidates": standalone_versions(records),
        "safety": [
            "No scanned file was changed, moved, copied, or deleted.",
            "Near-duplicate candidates are heuristic and require human review.",
            "Canonical recommendations favor --reference-root and do not authorize cleanup.",
        ],
    }
    write_reports(output, report, records)
    print(json.dumps(report["summary"], indent=2))
    print(f"Reports written to: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
