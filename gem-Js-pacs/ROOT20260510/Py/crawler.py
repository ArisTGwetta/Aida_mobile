# AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\ROOT20260510\Py\crawler.py
# AIDA REVIEW BLOCK 2: Module setup - imports, constants, and shared state used below.
import json
import copy
from pathlib import Path
from datetime import datetime, timezone
import re


BASE_DIR = Path(__file__).parent


# ---- Helpers ---------------------------------------------------------------

# AIDA REVIEW BLOCK 3: Function load_json - callable organ behavior.
def load_json(path: Path, default):
    if not path.exists():
        return copy.deepcopy(default)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# AIDA REVIEW BLOCK 4: Function save_json - callable organ behavior.
def save_json(path: Path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# AIDA REVIEW BLOCK 5: Function now_iso - callable organ behavior.
def now_iso():
    return datetime.now(timezone.utc).isoformat()


# AIDA REVIEW BLOCK 6: Function tokenize - callable organ behavior.
def tokenize(text: str):
    text = text.lower()
    return re.findall(r"[a-z0-9_]+", text)


# ---- Defaults --------------------------------------------------------------

DEFAULT_PAYLOAD = {
    "log_archives": {
        "paths": [],
        "raw_logs": []
    },
    "tags": {
        "realm_tags": [],
        "project_tags": [],
        "topic_tags": [],
        "emotion_tags": []
    },
    "memory_summary_history": {"days": []},
    "long_term_memory": {
        "facts": {},
        "insights": {},
        "user_model": {},
        "realm_config": {},
        "project_summary": {},
        "project_briefcases": {}
    },
    "crawler_settings": {
        "semantic_indexing": True,
        "keyword_indexing": True,
        "emotion_indexing": True,
        "tag_indexing": True,
        "realm_indexing": True,
        "project_indexing": True,
        "topic_clustering": True,
        "max_logs": 50000,
        "max_days": 180,
        "build_embeddings": False,
        "embedding_model": "default"
    }
}


# ---- Crawler ---------------------------------------------------------------

# AIDA REVIEW BLOCK 7: Class Crawler - grouped organ/service behavior.
class Crawler:
    """
    Deep Memory Crawler.
    Reads logs, normalizes entries, builds indexes, and extracts basic patterns.
    """

# AIDA REVIEW BLOCK 8: Function __init__ - callable organ behavior.
    def __init__(self, base_dir: Path = BASE_DIR):
        self.base_dir = base_dir

    # -- High-level entry point --

# AIDA REVIEW BLOCK 9: Function run - callable organ behavior.
    def run(self,
            payload_path: Path = None,
            output_path: Path = None) -> dict:
        if payload_path is None:
            payload_path = self.base_dir / "crawler_payload.json"
        if output_path is None:
            output_path = self.base_dir / "crawler_output.json"

        payload = load_json(payload_path, DEFAULT_PAYLOAD)

        log_archives = payload.get("log_archives", {})
        settings = payload.get("crawler_settings", DEFAULT_PAYLOAD["crawler_settings"])

        # 1) Load and normalize logs
        entries = self._load_all_logs(log_archives, settings)

        # 2) Build indexes
        keyword_index = {}
        tag_index = {
            "realm_tags": {},
            "project_tags": {},
            "topic_tags": {},
            "emotion_tags": {}
        }
        realm_index = {}
        project_index = {}
        emotion_index = {}
        semantic_index = {
            "vectors": {},
            "metadata": {}
        }

        for entry in entries:
            self._index_entry_keywords(entry, keyword_index, settings)
            self._index_entry_tags(entry, tag_index, settings)
            self._index_entry_realm(entry, realm_index, settings)
            self._index_entry_project(entry, project_index, settings)
            self._index_entry_emotion(entry, emotion_index, settings)
            self._index_entry_semantic(entry, semantic_index, settings)

        # 3) Topic clusters & motifs (placeholder)
        topic_clusters = self._cluster_topics(entries, settings)
        narrative_motifs = self._extract_motifs(entries, settings)
        patterns_detected = self._extract_patterns(entries, settings)

        crawler_summary = {
            "logs_processed": len(entries),
            "days_processed": len({e["date"] for e in entries}),
            "keywords_indexed": len(keyword_index),
            "embeddings_built": len(semantic_index["vectors"]),
            "topics_detected": len(topic_clusters),
            "motifs_detected": len(narrative_motifs),
            "warnings": []
        }

        output = {
            "__meta": {
                "description": "Output produced by the Deep Memory Crawler after indexing and analyzing historical logs."
            },
            "timestamp": now_iso(),
            "status": "success",
            "crawler_summary": crawler_summary,
            "indexes": {
                "keyword_index": {
                    "__description": "Map of keyword â†’ list of log references.",
                    "data": keyword_index
                },
                "semantic_index": {
                    "__description": "Embedding-based index for semantic search.",
                    "vectors": semantic_index["vectors"],
                    "metadata": semantic_index["metadata"]
                },
                "tag_index": {
                    "__description": "Map of tag â†’ list of log references.",
                    "realm_tags": tag_index["realm_tags"],
                    "project_tags": tag_index["project_tags"],
                    "topic_tags": tag_index["topic_tags"],
                    "emotion_tags": tag_index["emotion_tags"]
                },
                "realm_index": {
                    "__description": "Map of realm â†’ list of log references.",
                    "data": realm_index
                },
                "project_index": {
                    "__description": "Map of project â†’ list of log references.",
                    "data": project_index
                },
                "emotion_index": {
                    "__description": "Map of emotion label â†’ list of log references.",
                    "data": emotion_index
                }
            },
            "topic_clusters": {
                "__description": "Clusters of related log entries based on semantic similarity.",
                "clusters": topic_clusters
            },
            "narrative_motifs": {
                "__description": "Recurring narrative patterns detected across logs.",
                "motifs": narrative_motifs
            },
            "log_snippets": {
                "__description": "Short excerpts of logs relevant to detected patterns.",
                "snippets": self._build_snippets(entries, patterns_detected)
            },
            "patterns_detected": {
                "__description": "Structured patterns extracted from logs.",
                "emotional_triggers": patterns_detected.get("emotional_triggers", []),
                "project_arcs": patterns_detected.get("project_arcs", []),
                "realm_usage_patterns": patterns_detected.get("realm_usage_patterns", []),
                "topic_trends": patterns_detected.get("topic_trends", [])
            }
        }

        save_json(output_path, output)
        return output

    # ---- Log loading & normalization ---------------------------------------

# AIDA REVIEW BLOCK 10: Function _load_all_logs - callable organ behavior.
    def _load_all_logs(self, log_archives, settings):
        """
        Collect entries from:
        - raw_logs in the payload
        - paths pointing to session_log.json files
        Normalize each entry into a common structure.
        """
        entries = []

        # From raw_logs in payload
        for day_block in log_archives.get("raw_logs", []):
            date = day_block.get("date")
            for e in day_block.get("entries", []):
                norm = self._normalize_entry(e, date)
                entries.append(norm)

        # From paths on disk
        for path_str in log_archives.get("paths", []):
            path = Path(path_str)
            if not path.is_absolute():
                path = self.base_dir / path
            if not path.exists():
                continue
            data = load_json(path, {"entries": []})
            date = data.get("date") or path.stem
            for e in data.get("entries", []):
                norm = self._normalize_entry(e, date)
                entries.append(norm)

        # Respect max_logs
        max_logs = settings.get("max_logs", 50000)
        if len(entries) > max_logs:
            entries = entries[-max_logs:]

        return entries

# AIDA REVIEW BLOCK 11: Function _normalize_entry - callable organ behavior.
    def _normalize_entry(self, entry, date):
        """
        Normalize a log entry into a standard structure:
        {
          "id": str,
          "date": "YYYY-MM-DD",
          "timestamp": "...",
          "role": "user" | "assistant" | "system",
          "realm": str | "",
          "project": str | "",
          "tags": [ ... ],
          "emotion": str | "",
          "text": str
        }
        """
        return {
            "id": entry.get("id") or f"{date}_{entry.get('timestamp', '')}_{entry.get('role', '')}",
            "date": date,
            "timestamp": entry.get("timestamp", ""),
            "role": entry.get("role", ""),
            "realm": entry.get("realm", ""),
            "project": entry.get("project", ""),
            "tags": entry.get("tags", []),
            "emotion": entry.get("emotion", ""),
            "text": entry.get("text", "")
        }

    # ---- Indexing helpers ---------------------------------------------------

# AIDA REVIEW BLOCK 12: Function _index_entry_keywords - callable organ behavior.
    def _index_entry_keywords(self, entry, keyword_index, settings):
        if not settings.get("keyword_indexing", True):
            return
        tokens = tokenize(entry["text"])
        ref = entry["id"]
        for tok in tokens:
            bucket = keyword_index.setdefault(tok, [])
            bucket.append(ref)

# AIDA REVIEW BLOCK 13: Function _index_entry_tags - callable organ behavior.
    def _index_entry_tags(self, entry, tag_index, settings):
        if not settings.get("tag_indexing", True):
            return
        for tag in entry["tags"]:
            if tag.startswith("realm:"):
                key = tag.split(":", 1)[1]
                bucket = tag_index["realm_tags"].setdefault(key, [])
                bucket.append(entry["id"])
            elif tag.startswith("project:"):
                key = tag.split(":", 1)[1]
                bucket = tag_index["project_tags"].setdefault(key, [])
                bucket.append(entry["id"])
            elif tag.startswith("emotion:"):
                key = tag.split(":", 1)[1]
                bucket = tag_index["emotion_tags"].setdefault(key, [])
                bucket.append(entry["id"])
            else:
                bucket = tag_index["topic_tags"].setdefault(tag, [])
                bucket.append(entry["id"])

# AIDA REVIEW BLOCK 14: Function _index_entry_realm - callable organ behavior.
    def _index_entry_realm(self, entry, realm_index, settings):
        if not settings.get("realm_indexing", True):
            return
        realm = entry.get("realm") or ""
        if not realm:
            return
        bucket = realm_index.setdefault(realm, [])
        bucket.append(entry["id"])

# AIDA REVIEW BLOCK 15: Function _index_entry_project - callable organ behavior.
    def _index_entry_project(self, entry, project_index, settings):
        if not settings.get("project_indexing", True):
            return
        project = entry.get("project") or ""
        if not project:
            return
        bucket = project_index.setdefault(project, [])
        bucket.append(entry["id"])

# AIDA REVIEW BLOCK 16: Function _index_entry_emotion - callable organ behavior.
    def _index_entry_emotion(self, entry, emotion_index, settings):
        if not settings.get("emotion_indexing", True):
            return
        emo = entry.get("emotion") or ""
        if not emo:
            return
        bucket = emotion_index.setdefault(emo, [])
        bucket.append(entry["id"])

# AIDA REVIEW BLOCK 17: Function _index_entry_semantic - callable organ behavior.
    def _index_entry_semantic(self, entry, semantic_index, settings):
        """
        Placeholder: in the future, attach embeddings here.
        For now, we just store metadata keyed by id.
        """
        if not settings.get("semantic_indexing", True):
            return
        entry_id = entry["id"]
        semantic_index["metadata"][entry_id] = {
            "date": entry["date"],
            "realm": entry["realm"],
            "project": entry["project"],
            "emotion": entry["emotion"]
        }
        # If you later add embeddings, store them in semantic_index["vectors"][entry_id]

    # ---- Topic clustering & motifs (placeholders) ---------------------------

# AIDA REVIEW BLOCK 18: Function _cluster_topics - callable organ behavior.
    def _cluster_topics(self, entries, settings):
        """
        Placeholder: return empty list for now.
        Later, you can group entries by semantic similarity.
        """
        return []

# AIDA REVIEW BLOCK 19: Function _extract_motifs - callable organ behavior.
    def _extract_motifs(self, entries, settings):
        """
        Placeholder: return empty list for now.
        Later, you can detect recurring phrases, topics, or narrative shapes.
        """
        return []

# AIDA REVIEW BLOCK 20: Function _extract_patterns - callable organ behavior.
    def _extract_patterns(self, entries, settings):
        """
        Placeholder: very simple pattern extraction.
        For now, just count realm usage and project mentions.
        """
        realm_counts = {}
        project_counts = {}

        for e in entries:
            r = e.get("realm") or ""
            p = e.get("project") or ""
            if r:
                realm_counts[r] = realm_counts.get(r, 0) + 1
            if p:
                project_counts[p] = project_counts.get(p, 0) + 1

        realm_usage_patterns = [
            {"realm": r, "count": c} for r, c in realm_counts.items()
        ]
        project_arcs = [
            {"project": p, "mentions": c} for p, c in project_counts.items()
        ]

        return {
            "emotional_triggers": [],
            "project_arcs": project_arcs,
            "realm_usage_patterns": realm_usage_patterns,
            "topic_trends": []
        }

    # ---- Snippet builder ----------------------------------------------------

# AIDA REVIEW BLOCK 21: Function _build_snippets - callable organ behavior.
    def _build_snippets(self, entries, patterns_detected):
        """
        Simple snippet builder: return a small subset of entries as examples.
        Later, you can select snippets tied to specific patterns.
        """
        snippets = []
        for e in entries[:50]:  # cap for safety
            snippets.append({
                "id": e["id"],
                "date": e["date"],
                "realm": e["realm"],
                "project": e["project"],
                "emotion": e["emotion"],
                "text": e["text"][:300]
            })
        return snippets


# ---- CLI-ish entry ---------------------------------------------------------

# AIDA REVIEW BLOCK 22: Command-line entrypoint - runs this organ when launched directly.
if __name__ == "__main__":
    crawler = Crawler()
    out = crawler.run()
    print("Crawler deep memory indexing complete.")
    print("Status:", out.get("status"), "at", out.get("timestamp"))
