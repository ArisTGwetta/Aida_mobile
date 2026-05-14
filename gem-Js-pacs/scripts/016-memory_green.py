# 016-memory_green.py
# THE AWAKE-MODE LIBRARIAN (BLOCKS 16, 17, 18, 19)

import json
import re
from datetime import datetime, timezone
from pyscript import window

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

class MemoryOrgan:
    def __init__(self, base_dir="/workspace/default"):
        self.base_dir = base_dir
        # Daily "Delta" logs
        self.session_delta = {
            "new_facts": {"data": {}},
            "updated_insights": {"data": {}},
            "emotional_drift": {"data": []}
        }
        self.recent_turns = []

    def log_turn(self, role, realm, content, emotion_label):
        entry = {
            "timestamp": _now_iso(),
            "role": role,
            "realm": realm,
            "content": content,
            "emotion": emotion_label
        }
        self.recent_turns.append(entry)
        if len(self.recent_turns) > 20:
            self.recent_turns.pop(0)
        self._commit_to_js_bridge(entry)

    def _commit_to_js_bridge(self, entry):
        # This allows JS to see the "Short Term Memory" for UI display
        window.sessionStorage.setItem("aida_last_turn", json.dumps(entry))

class FactExtractor:
    def __init__(self, organ):
        self.organ = organ
        self.patterns = [
            (r"\bmy name is ([a-z0-9 _-]+)", "user_name"),
            (r"\bi (?:prefer|like|love) ([a-z0-9 _-]+)", "user_preference"),
            (r"\bi live in ([a-z0-9 ,_-]+)", "user_location")
        ]

    def scan(self, text):
        text_clean = text.lower()
        for pattern, key_type in self.patterns:
            match = re.search(pattern, text_clean)
            if match:
                val = match.group(1).strip()
                self.organ.session_delta["new_facts"]["data"][key_type] = val
                print(f"[GREEN] Fact Captured: {key_type} -> {val}")

# Initialize the Organ
organ = MemoryOrgan()
extractor = FactExtractor(organ)

# Expose triggers to the Engine
def py_process_memory_awake(text, role, realm, emotion_label):
    extractor.scan(text)
    organ.log_turn(role, realm, text, emotion_label)
    return json.dumps(organ.session_delta)

window.py_process_memory_awake = py_process_memory_awake
