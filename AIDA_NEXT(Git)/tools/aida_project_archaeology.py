"""Create read-only evidence packets for recurring personal/Aida projects.

This tool consumes the inventory CSV produced by aida_consolidation_audit.py.
It reads source files but never edits them. Its output is a review queue, not a
master memory: every candidate statement remains linked to its source file.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import zipfile
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


VERSION = "1.0"
MAX_SOURCE_BYTES = 2_000_000
TEXT_EXTENSIONS = {".txt", ".md", ".json", ".js", ".ts", ".py", ".html", ".htm", ".css", ".csv", ".yaml", ".yml"}
DEFAULT_FOCUS = {
    "ghost_in_the_house": ["ghost in the house", "there is a ghost in the house", "ghostinthehouse"],
    "shirley_holmes": ["shirley holmes", "shirley homes", "shirleyholmes"],
    "gemini_games": ["gemini game", "gemini games", "aris t gwetta - gemini games"],
    "rias": ["rias"],
    "cristy": ["cristy", "christy"],
}
SENSITIVE_PATH_PARTS = {"debug", "private", "personal", "hidden", "vault"}
# These files describe or implement the discovery process. Their example focus
# terms must never be mistaken for evidence about the projects themselves.
DISCOVERY_TOOL_FILENAMES = {
    "aida_project_archaeology.py",
    "aida_consolidation_audit.py",
    "aida_project_archaeology.md",
    "aida_consolidation_audit.md",
}


@dataclass
class Evidence:
    source_path: str
    source_root: str
    relative_path: str
    modified_utc: str
    tags: list[str]
    extension: str
    matched_terms: list[str]
    excerpts: list[str]
    extraction: str
    confidence: str


def parse_focus(values: list[str]) -> dict[str, list[str]]:
    if not values:
        return DEFAULT_FOCUS
    result: dict[str, list[str]] = {}
    for value in values:
        if "=" not in value:
            raise ValueError("--focus must use name=term|another term format.")
        name, raw_terms = value.split("=", 1)
        terms = [term.strip().lower() for term in raw_terms.split("|") if term.strip()]
        if not name.strip() or not terms:
            raise ValueError("Each --focus entry needs a name and at least one term.")
        result[name.strip()] = terms
    return result


def inventory_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8-sig") as stream:
        return list(csv.DictReader(stream))


def json_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="ignore")
    try:
        return json.dumps(json.loads(raw), ensure_ascii=False, indent=2)
    except json.JSONDecodeError:
        return raw


def docx_text(path: Path) -> str | None:
    try:
        with zipfile.ZipFile(path) as archive:
            xml = archive.read("word/document.xml").decode("utf-8", errors="ignore")
    except (OSError, KeyError, zipfile.BadZipFile):
        return None
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", xml)).strip()


def source_text(path: Path) -> tuple[str | None, str]:
    try:
        if path.stat().st_size > MAX_SOURCE_BYTES:
            return None, "skipped_large_file"
        suffix = path.suffix.lower()
        if suffix == ".docx":
            extracted = docx_text(path)
            return extracted, "docx_text" if extracted is not None else "docx_unreadable"
        if suffix in TEXT_EXTENSIONS:
            return (json_text(path) if suffix == ".json" else path.read_text(encoding="utf-8", errors="ignore")), "text"
        if suffix == ".pdf":
            return None, "pdf_metadata_only"
    except OSError:
        return None, "unreadable"
    return None, "metadata_only"


def excerpts(text: str, terms: list[str], limit: int = 4, radius: int = 260) -> list[str]:
    lowered = text.lower()
    positions = sorted({match.start() for term in terms for match in re.finditer(re.escape(term), lowered)})
    output = []
    for position in positions:
        start = max(0, position - radius)
        end = min(len(text), position + radius)
        snippet = re.sub(r"\s+", " ", text[start:end]).strip()
        if snippet and snippet not in output:
            output.append(snippet)
        if len(output) == limit:
            break
    return output


def confidence(row: dict[str, str], matched_terms: list[str], extracted: str | None) -> str:
    if extracted and matched_terms and "aida_candidate" in row.get("tags", ""):
        return "high"
    if extracted and matched_terms:
        return "medium"
    return "low"


def collect(rows: list[dict[str, str]], focus: dict[str, list[str]], include_sensitive_excerpts: bool) -> dict[str, list[Evidence]]:
    clusters: dict[str, list[Evidence]] = {name: [] for name in focus}
    for row in rows:
        path = Path(row["path"])
        if not path.is_file():
            continue
        if path.name.lower() in DISCOVERY_TOOL_FILENAMES:
            continue
        path_text = f"{row.get('relative_path', '')} {path.name}".lower()
        row_tags = [tag for tag in row.get("tags", "").split(";") if tag]
        path_matches = any(term in path_text for terms in focus.values() for term in terms)
        # Personal backup roots can contain unrelated family/financial documents.
        # Search their contents only after a path clue, while Aida-tagged sources
        # remain eligible for content recovery even when their filenames are vague.
        text, extraction = source_text(path) if path_matches or "aida_candidate" in row_tags else (None, "path_only")
        searchable = f"{path_text}\n{text.lower() if text else ''}"
        for name, terms in focus.items():
            matched = [term for term in terms if term in searchable]
            if not matched:
                continue
            tags = list(row_tags)
            sensitive = "sensitive_source_candidate" in tags or bool(
                {part.lower() for part in path.parts} & SENSITIVE_PATH_PARTS
            )
            if sensitive and "sensitive_source_candidate" not in tags:
                tags.append("sensitive_source_candidate")
            clusters[name].append(Evidence(
                source_path=str(path),
                source_root=row.get("root", ""),
                relative_path=row.get("relative_path", ""),
                modified_utc=row.get("modified_utc", ""),
                tags=tags,
                extension=row.get("extension", path.suffix.lower()),
                matched_terms=matched,
                excerpts=excerpts(text, matched) if text and (include_sensitive_excerpts or not sensitive) else [],
                extraction=extraction,
                confidence=confidence(row, matched, text),
            ))
    return clusters


def write_packet(output: Path, name: str, evidence: list[Evidence]) -> None:
    title = name.replace("_", " ").title()
    lines = [f"# Evidence Packet: {title}", "", "Status: discovery draft. This packet contains evidence, not a merged story or canonical project.", ""]
    for index, item in enumerate(evidence, 1):
        lines.extend([
            f"## {index}. {item.source_path}",
            "",
            f"- Confidence: {item.confidence}",
            f"- Terms: {', '.join(item.matched_terms)}",
            f"- Modified: {item.modified_utc}",
            f"- Tags: {', '.join(item.tags) or 'none'}",
            f"- Extraction: {item.extraction}",
        ])
        if item.excerpts:
            lines.append("- Excerpts:")
            lines.extend([f"  - {excerpt}" for excerpt in item.excerpts])
        lines.append("")
    (output / "packets" / f"{name}.md").write_text("\n".join(lines), encoding="utf-8")


def write_candidate_shortcuts(output: Path, clusters: dict[str, list[Evidence]]) -> None:
    """Write path-based review targets without calling any one target canonical."""
    media_extensions = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".pptx", ".docx", ".svg"}
    lines = [
        "# Candidate Review Shortcuts",
        "",
        "These are likely project locations inferred from discovery evidence. They are review targets, not canon selections. Open the competing folders, choose deliberately, then create a move manifest.",
        "",
    ]
    for name, evidence in clusters.items():
        grouped: dict[Path, list[Evidence]] = {}
        for item in evidence:
            path = Path(item.source_path)
            relative = f"{item.relative_path} {path.name}".lower()
            # Only show folders whose own path provides a project clue. This
            # avoids turning general Aida logs into misleading asset targets.
            if not any(term in relative for term in item.matched_terms):
                continue
            grouped.setdefault(path.parent, []).append(item)
        lines.extend([f"## {name.replace('_', ' ').title()}", ""])
        ranked = sorted(
            grouped.items(),
            key=lambda pair: (
                -sum(item.extension.lower() in media_extensions for item in pair[1]),
                -len(pair[1]),
                str(pair[0]).lower(),
            ),
        )
        if not ranked:
            lines.extend(["- No path-based candidate location found. Review the evidence packet for source references.", ""])
            continue
        for directory, items in ranked[:12]:
            media_count = sum(item.extension.lower() in media_extensions for item in items)
            detail = f"{len(items)} matching item(s)"
            if media_count:
                detail += f", {media_count} visual/document asset(s)"
            link_target = "/" + directory.as_posix()
            lines.append(f"- [{directory.name or str(directory)}](<{link_target}>): {detail}.")
        lines.append("")
    (output / "CANDIDATE_REVIEW_SHORTCUTS.md").write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only project archaeology evidence packer.")
    parser.add_argument("--inventory", required=True, help="CSV inventory from aida_consolidation_audit.py")
    parser.add_argument("--output", required=True, help="New folder for archaeology reports; never a scanned source folder.")
    parser.add_argument("--focus", action="append", default=[], help="Optional name=term|term override. Repeat for more projects.")
    parser.add_argument("--include-sensitive-excerpts", action="store_true", help="Include excerpts from debug/private/vault paths. Default: record source references only.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    inventory = Path(args.inventory).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()
    if not inventory.is_file():
        raise SystemExit(f"Inventory does not exist: {inventory}")
    if output == inventory.parent or output.is_relative_to(inventory.parent):
        raise SystemExit("--output must be outside the audit report folder.")
    focus = parse_focus(args.focus)
    rows = inventory_rows(inventory)
    clusters = collect(rows, focus, args.include_sensitive_excerpts)
    output.mkdir(parents=True, exist_ok=True)
    (output / "packets").mkdir(exist_ok=True)
    summary_clusters = []
    for name, evidence in clusters.items():
        evidence.sort(key=lambda item: ({"high": 0, "medium": 1, "low": 2}[item.confidence], item.source_path))
        write_packet(output, name, evidence)
        summary_clusters.append({
            "project": name,
            "status": "discovery_draft",
            "evidence_count": len(evidence),
            "high_confidence_sources": sum(item.confidence == "high" for item in evidence),
            "source_roots": dict(Counter(item.source_root for item in evidence)),
            "packet": str(output / "packets" / f"{name}.md"),
        })
    write_candidate_shortcuts(output, clusters)
    registry = {
        "version": VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "read_only_project_archaeology",
        "inventory": str(inventory),
        "rules": [
            "This registry is an evidence index, not a master memory.",
            "No source file was edited, moved, copied, or deleted.",
            "A future LLM review must preserve source links, uncertainty, and contradictions.",
            "No project becomes active until the user explicitly approves it.",
            "Sources in debug/private/vault paths are listed without excerpts unless --include-sensitive-excerpts is used.",
        ],
        "projects": summary_clusters,
    }
    (output / "project_registry_draft.json").write_text(json.dumps(registry, indent=2), encoding="utf-8")
    lines = ["# Project Archaeology", "", "Read-only discovery pass. Evidence packets are source-linked and await review.", ""]
    for project in summary_clusters:
        lines.append(f"- **{project['project']}**: {project['evidence_count']} source(s), {project['high_confidence_sources']} high-confidence. Packet: `packets/{project['project']}.md`")
    lines.extend(["", "Next: review one packet at a time, then create a source-backed dossier draft. Do not merge source files or promote memories automatically."])
    (output / "PROJECT_ARCHAEOLOGY_REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({project["project"]: project["evidence_count"] for project in summary_clusters}, indent=2))
    print(f"Reports written to: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
