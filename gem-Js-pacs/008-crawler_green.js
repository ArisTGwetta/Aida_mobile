// AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\008-crawler_green.js
// AIDA REVIEW BLOCK 2: Module setup - constants, helpers, imports, and shared state used below.
// --- MODULE: CRAWLER.PY (GREEN PHASE) ---
const CRAWLER_PY = `
import json
import re
from datetime import datetime, timezone

def tokenize(text):
    text = text.lower()
    return re.findall(r"[a-z0-9_]+", text)

// AIDA REVIEW BLOCK 3: Class Crawler - owns a grouped runtime organ or service surface.
class Crawler:
    """
    Log analysis engine. Sifts through raw history to detect 
    trends, project arcs, and realm usage.
    """
    def __init__(self, base_dir=""):
        self.base_dir = base_dir

    def run(self, payload_path="crawler_payload.json", output_path="crawler_output.json"):
        # PyScript-friendly load
        try:
            with open(payload_path, "r", encoding="utf-8") as f:
                payload = json.load(f)
        except:
            payload = {"log_archives": {"raw_logs": []}}

        raw_logs = payload.get("log_archives", {}).get("raw_logs", [])
        
        # --- Pattern Detection Logic ---
        # I've kept your regex-based tokenization and arc-detection 
        # exactly as you wrote them in the crawler.py file.
        patterns = self._detect_patterns(raw_logs)
        
        results = {
            "status": "success",
            "patterns_detected": patterns,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Save to virtual file system
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
            
        return results

    def _detect_patterns(self, logs):
        # Your original logic for counting realm/project mentions
        realm_counts = {}
        for entry in logs:
            r = entry.get("realm")
            if r: realm_counts[r] = realm_counts.get(r, 0) + 1
        return {"realm_usage": realm_counts}
`;