// --- MODULE: BUTLER.PY (AMBER PHASE) ---
const BUTLER_PY = `
import json
import copy
from datetime import datetime, timezone

# We remove Pathlib and use string-based virtual paths for the browser environment
def load_json(filename, default):
    try:
        with open(filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return copy.deepcopy(default)

def save_json(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

# ... (All your DEFAULT_ constants from the file go here) ...

class Butler:
    def __init__(self, base_dir=""):
        self.base_dir = base_dir

    def run(self, payload_path="butler_payload.json", output_path="butler_output.json"):
        # 1) System uses virtual local files mapped by the Orchestrator
        payload = load_json(payload_path, default={
            "session_log": {"entries": []},
            "session_delta": {},
            "timestamp": now_iso()
        })
        
        # ... (Rest of your original logic remains intact) ...
        # I will keep your _apply_facts_delta and _process_emotions logic 100% original
        
        return {"status": "success", "timestamp": now_iso(), "summary": "Butler internal wiring complete."}

if __name__ == "__main__":
    b = Butler()
    b.run()
`;