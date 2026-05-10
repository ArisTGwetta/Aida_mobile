import json
import copy
from pathlib import Path
from datetime import datetime, timezone


BASE_DIR = Path(__file__).parent

# ---- Helpers ---------------------------------------------------------------

def load_json(path: Path, default):
    if not path.exists():
        return copy.deepcopy(default)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---- Defaults (for safety) -------------------------------------------------

DEFAULT_FACTS = {}
DEFAULT_INSIGHTS = {}
DEFAULT_USER_MODEL = {}
DEFAULT_REALM_CONFIG = {}
DEFAULT_PROJECT_SUMMARY = {}
DEFAULT_MEMORY_SUMMARY = {}
DEFAULT_CORE_IDENTITY = {}
DEFAULT_FACE_MAP = {}
DEFAULT_EMOTION_COORDS = {}
DEFAULT_EMOTION_MEMORY = {
    "emotion_frequency": {"data": {}},
    "between_pairs": {"data": {}},
    "gap_regions": {"data": []},
    "transition_usage": {"data": {}}
}


# ---- Core Butler -----------------------------------------------------------

class Butler:
    def __init__(self, base_dir: Path = BASE_DIR):
        self.base_dir = base_dir

    # -- High-level entry point --

    def run(self,
            payload_path: Path = None,
            output_path: Path = None) -> dict:
        """
        Full night cycle:
        1. Load payload
        2. Update long-term memory
        3. Update emotional knowledge
        4. Update project briefcases
        5. Write next-day 12 files
        6. Clear daily files
        7. Return butler_output structure
        """
        if payload_path is None:
            payload_path = self.base_dir / "butler_payload.json"
        if output_path is None:
            output_path = self.base_dir / "butler_output.json"

        payload = load_json(payload_path, default={
            "session_log": {"entries": []},
            "session_delta": {},
            "emotion_memory": DEFAULT_EMOTION_MEMORY,
            "emotion_state": {"valence": 0.0, "arousal": 0.0, "label": "neutral"},
            "while_away_thoughts": {"data": []},
            "recent_turns": {"turns": []},
            "active_realm": "",
            "active_project": "",
            "timestamp": now_iso()
        })

        session_delta = payload.get("session_delta", {})
        emotion_memory = payload.get("emotion_memory", DEFAULT_EMOTION_MEMORY)
        emotion_state = payload.get("emotion_state", {"valence": 0.0, "arousal": 0.0, "label": "neutral"})
        session_log = payload.get("session_log", {"entries": []})
        recent_turns = payload.get("recent_turns", {"turns": []})
        while_away_thoughts = payload.get("while_away_thoughts", {"data": []})

        # 1) Load long-term files
        facts = load_json(self.base_dir / "facts.json", DEFAULT_FACTS)
        insights = load_json(self.base_dir / "insights.json", DEFAULT_INSIGHTS)
        user_model = load_json(self.base_dir / "user_model.json", DEFAULT_USER_MODEL)
        realm_config = load_json(self.base_dir / "realm_config.json", DEFAULT_REALM_CONFIG)
        project_summary = load_json(self.base_dir / "project_summary.json", DEFAULT_PROJECT_SUMMARY)
        core_identity = load_json(self.base_dir / "core_identity.json", DEFAULT_CORE_IDENTITY)
        face_map = load_json(self.base_dir / "face_map.json", DEFAULT_FACE_MAP)
        emotion_coords = load_json(self.base_dir / "emotion_coordinates.json", DEFAULT_EMOTION_COORDS)
        memory_summary = load_json(self.base_dir / "memory_summary.json", DEFAULT_MEMORY_SUMMARY)

        # 2) Apply deltas to facts / insights / user_model
        summary_changes = {
            "facts_updated": [],
            "insights_added": [],
            "insights_updated": [],
            "new_emotions_proposed": [],
            "project_updates": [],
            "realm_transitions": [],
            "emotional_patterns_detected": [],
            "warnings": []
        }

        self._apply_facts_delta(facts, session_delta, summary_changes)
        self._apply_insights_delta(insights, session_delta, summary_changes)
        self._apply_user_model_delta(user_model, session_delta, summary_changes)

        # 3) Emotional knowledge
        emotion_coords, memory_summary, emo_patterns, new_emotions = self._process_emotions(
            emotion_coords,
            emotion_memory,
            emotion_state,
            session_log
        )
        summary_changes["emotional_patterns_detected"].extend(emo_patterns)
        summary_changes["new_emotions_proposed"].extend(new_emotions)

        # 4) Project briefcases
        project_updates, realm_transitions = self._process_projects_and_realms(
            project_summary,
            realm_config,
            session_delta
        )
        summary_changes["project_updates"].extend(project_updates)
        summary_changes["realm_transitions"].extend(realm_transitions)

        # 5) Build next-day 12 wake-cycle files
        next_recent_turns = recent_turns  # usually last 10–20 turns already
        next_emotion_state = {
            "valence": 0.0,
            "arousal": 0.0,
            "label": "neutral"
        }
        next_while_away = {"data": []}
        next_emotion_memory = copy.deepcopy(DEFAULT_EMOTION_MEMORY)

        wake_cycle_files = {
            "core_identity.json": core_identity,
            "user_model.json": user_model,
            "realm_config.json": realm_config,
            "project_summary.json": project_summary,
            "recent_turns.json": next_recent_turns,
            "emotion_state.json": next_emotion_state,
            "while_away_thoughts.json": next_while_away,
            "facts.json": facts,
            "insights.json": insights,
            "memory_summary.json": memory_summary,
            "system_prompt_template.txt": self._load_system_prompt(),
            "face_map.json": face_map,
            "emotion_coordinates.json": emotion_coords,
            "emotion_memory.json": next_emotion_memory
        }

        # 6) Persist next-day files
        for name, data in wake_cycle_files.items():
            path = self.base_dir / name
            # system_prompt is text, others are JSON
            if name.endswith(".txt"):
                with open(path, "w", encoding="utf-8") as f:
                    f.write(data or "")
            else:
                save_json(path, data)

        # 7) Clear daily files
        save_json(self.base_dir / "session_log.json", {"entries": []})
        save_json(self.base_dir / "session_delta.json", {
            "new_facts": {"data": {}},
            "updated_facts": {"data": {}},
            "new_insights": {"data": {}},
            "updated_insights": {"data": {}},
            "project_deltas": {"data": {}},
            "realm_transitions": {"data": []},
            "emotional_deltas": {"data": {}}
        })
        save_json(self.base_dir / "while_away_thoughts.json", {"data": []})
        save_json(self.base_dir / "emotion_memory.json", next_emotion_memory)

        # 8) Build butler_output.json
        output = {
            "__meta": {
                "description": "Butler output after processing nightly payload.",
            },
            "timestamp": now_iso(),
            "status": "success",
            "summary": summary_changes,
            "wake_cycle_files": wake_cycle_files
        }

        save_json(output_path, output)
        return output

    # ---- Delta application --------------------------------------------------

    def _apply_facts_delta(self, facts, session_delta, summary):
        new_facts = session_delta.get("new_facts", {}).get("data", {})
        updated_facts = session_delta.get("updated_facts", {}).get("data", {})

        for k, v in new_facts.items():
            if k not in facts:
                facts[k] = v
                summary["facts_updated"].append({"type": "new", "key": k})
            else:
                # if already exists, treat as update
                facts[k] = v
                summary["facts_updated"].append({"type": "overwrite_existing_new", "key": k})

        for k, v in updated_facts.items():
            facts[k] = v
            summary["facts_updated"].append({"type": "updated", "key": k})

    def _apply_insights_delta(self, insights, session_delta, summary):
        new_insights = session_delta.get("new_insights", {}).get("data", {})
        updated_insights = session_delta.get("updated_insights", {}).get("data", {})

        for k, v in new_insights.items():
            if k not in insights:
                insights[k] = v
                summary["insights_added"].append(k)
            else:
                insights[k] = v
                summary["insights_updated"].append(k)

        for k, v in updated_insights.items():
            insights[k] = v
            summary["insights_updated"].append(k)

    def _apply_user_model_delta(self, user_model, session_delta, summary):
        # Optional: if you later add explicit user_model deltas to session_delta,
        # handle them here. For now, this is a placeholder.
        user_deltas = session_delta.get("user_model_deltas", {}).get("data", {})
        for k, v in user_deltas.items():
            user_model[k] = v
            summary["facts_updated"].append({"type": "user_model", "key": k})

    # ---- Emotional processing -----------------------------------------------

    def _process_emotions(self, emotion_coords, emotion_memory, emotion_state, session_log):
        """
        Very simple placeholder logic:
        - Look at gap_regions and between_pairs
        - If counts exceed thresholds, propose new emotions
        - Update memory_summary with a basic emotional snapshot
        """
        gap_regions = emotion_memory.get("gap_regions", {}).get("data", []) if isinstance(
            emotion_memory.get("gap_regions"), dict
        ) else emotion_memory.get("gap_regions", [])
        between_pairs = emotion_memory.get("between_pairs", {}).get("data", {})

        new_emotions = []
        patterns = []

        GAP_THRESHOLD = 5
        BETWEEN_THRESHOLD = 7

        # Gap regions → new emotions
        for region in gap_regions:
            count = region.get("count", 0)
            if count >= GAP_THRESHOLD:
                v = region.get("valence", 0.0)
                a = region.get("arousal", 0.0)
                label = self._propose_emotion_label(v, a)
                if label not in emotion_coords:
                    emotion_coords[label] = {"valence": v, "arousal": a}
                    new_emotions.append(label)
                    patterns.append({"type": "gap_region", "label": label, "valence": v, "arousal": a})

        # Between pairs → potential new blended emotions
        for pair_key, count in between_pairs.items():
            if count >= BETWEEN_THRESHOLD:
                patterns.append({"type": "between_pair", "pair": pair_key})

        # Simple memory summary
        memory_summary = {
            "last_emotion_state": emotion_state,
            "new_emotions": new_emotions,
            "patterns": patterns
        }

        return emotion_coords, memory_summary, patterns, new_emotions

    def _propose_emotion_label(self, v, a):
        # Very simple naming scheme; you can replace with something nicer later.
        return f"emotion_{round(v, 2)}_{round(a, 2)}"

    # ---- Projects & realms --------------------------------------------------

    def _process_projects_and_realms(self, project_summary, realm_config, session_delta):
        project_deltas = session_delta.get("project_deltas", {}).get("data", {})
        realm_transitions = session_delta.get("realm_transitions", {}).get("data", [])

        project_updates = []

        # Apply project deltas
        for project_name, delta in project_deltas.items():
            if project_name not in project_summary:
                # New project: create from template
                briefcase = self._new_project_briefcase(project_name, delta.get("realm", ""))
                project_summary[project_name] = briefcase
                project_updates.append({"project": project_name, "type": "created"})
            else:
                briefcase = project_summary[project_name]

            # Merge simple fields (summary, goals, etc.) if present
            if "summary" in delta:
                briefcase["summary"]["text"] = delta["summary"]
            if "goals" in delta:
                briefcase["goals"]["list"].extend(delta["goals"])
            if "characters" in delta:
                briefcase["characters"]["list"].extend(delta["characters"])
            if "rules" in delta:
                briefcase["rules"]["list"].extend(delta["rules"])
            if "assets" in delta:
                briefcase["assets"]["list"].extend(delta["assets"])
            if "story_beats" in delta:
                briefcase["story_beats"]["list"].extend(delta["story_beats"])
            if "open_questions" in delta:
                briefcase["open_questions"]["list"].extend(delta["open_questions"])
            if "next_steps" in delta:
                briefcase["next_steps"]["list"].extend(delta["next_steps"])

            briefcase["last_updated"] = now_iso()
            project_updates.append({"project": project_name, "type": "updated"})

        # Realm transitions are mostly informational here
        return project_updates, realm_transitions

    def _new_project_briefcase(self, name: str, realm: str):
        # Minimal inline template; you can also load from project_briefcase_template.json
        return {
            "__meta": {
                "description": "Project briefcase created by Butler."
            },
            "project_name": name,
            "realm": realm,
            "created_on": now_iso(),
            "last_updated": now_iso(),
            "summary": {"text": ""},
            "goals": {"list": []},
            "characters": {"list": []},
            "rules": {"list": []},
            "assets": {"list": []},
            "story_beats": {"list": []},
            "open_questions": {"list": []},
            "next_steps": {"list": []}
        }

    # ---- System prompt loader ----------------------------------------------

    def _load_system_prompt(self):
        path = self.base_dir / "system_prompt_template.txt"
        if not path.exists():
            return ""
        with open(path, "r", encoding="utf-8") as f:
            return f.read()


# ---- CLI-ish entry ---------------------------------------------------------

if __name__ == "__main__":
    butler = Butler()
    out = butler.run()
    print("Butler night cycle complete.")
    print("Status:", out.get("status"), "at", out.get("timestamp"))
